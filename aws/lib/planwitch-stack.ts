/**
 * PlanWitch -- AWS reference architecture.
 *
 * One stack, ~29 AWS services, deliberately free-tier shaped: no VPC, no NAT
 * gateway, no RDS, no always-on compute. Every resource carries a DESTROY
 * removal policy so `npm run destroy` leaves the account empty.
 *
 * Layout of this file:
 *   1. Foundation      KMS, S3, DynamoDB, SNS, SQS, Secrets, Cognito, Location
 *   2. Compute         Lambda functions + HTTP API + JWT authorizer
 *   3. Orchestration   Step Functions, EventBridge (bus + rule + scheduler), DDB streams
 *   4. Analytics       Kinesis Firehose -> S3 -> Glue -> Athena
 *   5. Delivery        CloudFront + S3 static hosting of the Expo web build
 *   6. Governance      CloudWatch dashboard/alarms, X-Ray, CloudTrail, Budgets
 */
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEvents from 'aws-cdk-lib/aws-lambda-event-sources';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets';
import * as awsScheduler from 'aws-cdk-lib/aws-scheduler';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as awsLocation from 'aws-cdk-lib/aws-location';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as athena from 'aws-cdk-lib/aws-athena';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as path from 'node:path';
import * as fs from 'node:fs';

export interface PlanWitchStackProps extends cdk.StackProps {
  alertEmail: string;
  senderEmail: string;
  bedrockModelId: string;
  monthlyBudgetUsd: number;
  deployWebApp: boolean;
  /** New AWS accounts cannot create distributions until AWS verifies them. */
  useCloudFront: boolean;
  /** Free Plan accounts cannot subscribe to services without a free tier. */
  freeTierOnly: boolean;
  /** Services this account cannot call, surfaced in the demo console. */
  restrictedServices: string[];
}

const LAMBDA_DIR = path.join(__dirname, '..', 'lambda');
const WEB_BUILD_DIR = path.join(__dirname, '..', '..', 'dist');
const CONSOLE_DIR = path.join(__dirname, '..', 'web');

export class PlanWitchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PlanWitchStackProps) {
    super(scope, id, props);

    const suffix = cdk.Names.uniqueResourceName(this, { maxLength: 8 }).toLowerCase();

    // ---------------------------------------------------------------- 1. Foundation

    // A customer-managed key costs ~$1/month, which a Free Plan account cannot
    // subscribe to. Fall back to the AWS-managed KMS key, which is free and
    // still encrypts every table at rest.
    const key = props.freeTierOnly ? undefined : new kms.Key(this, 'AppKey', {
      alias: `alias/planwitch-${suffix}`,
      description: 'PlanWitch data-at-rest key (DynamoDB, S3 media)',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pendingWindow: cdk.Duration.days(7),
    });

    const tableEncryption = key
      ? { encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED, encryptionKey: key }
      : { encryption: dynamodb.TableEncryption.AWS_MANAGED };

    const bucket = (name: string, opts: Partial<s3.BucketProps> = {}) =>
      new s3.Bucket(this, name, {
        bucketName: `planwitch-${name.toLowerCase()}-${suffix}-${this.account}`,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        ...opts,
      });

    // With CloudFront the origin stays private behind an OAC. Without it the
    // objects must be world-readable, since the browser hits S3 directly.
    // `enforceSSL` keeps that to HTTPS only.
    const webBucket = bucket('Web', props.useCloudFront ? {} : {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      publicReadAccess: true,
    });
    const uploadsBucket = bucket('Uploads', {
      cors: [{
        allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        maxAge: 3000,
      }],
      lifecycleRules: [{ expiration: cdk.Duration.days(30) }],
    });
    const mediaBucket = bucket('Media', {
      lifecycleRules: [{ expiration: cdk.Duration.days(30) }],
    });
    const analyticsBucket = bucket('Analytics');
    const trailBucket = bucket('Trail', {
      lifecycleRules: [{ expiration: cdk.Duration.days(14) }],
    });

    // DynamoDB: on-demand billing, CMK encryption, DESTROY on teardown.
    const tripsTable = new dynamodb.Table(this, 'TripsTable', {
      tableName: `planwitch-trips-${suffix}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'tripId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      ...tableEncryption,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    tripsTable.addGlobalSecondaryIndex({
      indexName: 'byStatus',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const otpTable = new dynamodb.Table(this, 'OtpTable', {
      tableName: `planwitch-otp-${suffix}`,
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      ...tableEncryption,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const jobsTable = new dynamodb.Table(this, 'JobsTable', {
      tableName: `planwitch-jobs-${suffix}`,
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // SNS: trip/itinerary events. SQS: async job queue with a dead-letter queue.
    const eventsTopic = new sns.Topic(this, 'EventsTopic', {
      topicName: `planwitch-events-${suffix}`,
      displayName: 'PlanWitch events',
    });
    if (props.alertEmail) {
      eventsTopic.addSubscription(new subscriptions.EmailSubscription(props.alertEmail));
    }

    const jobsDlq = new sqs.Queue(this, 'JobsDlq', {
      queueName: `planwitch-jobs-dlq-${suffix}`,
      retentionPeriod: cdk.Duration.days(14),
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const jobsQueue = new sqs.Queue(this, 'JobsQueue', {
      queueName: `planwitch-jobs-${suffix}`,
      visibilityTimeout: cdk.Duration.seconds(180),
      enforceSSL: true,
      deadLetterQueue: { queue: jobsDlq, maxReceiveCount: 3 },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Secrets Manager holds the third-party keys the mobile app already uses.
    const thirdPartySecret = props.freeTierOnly ? undefined : new secretsmanager.Secret(this, 'ThirdPartyKeys', {
      secretName: `planwitch/third-party-${suffix}`,
      description: 'Grok / Google Maps / RevenueCat keys used by PlanWitch',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          GROK_API_KEY: 'replace-me',
          GOOGLE_MAPS_API_KEY: 'replace-me',
          REVENUECAT_API_KEY: 'replace-me',
        }),
        generateStringKey: 'placeholder',
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // SES: verify the sender so the OTP mail can actually leave the account.
    // SES starts every account in the sandbox, where the *recipient* must be a
    // verified identity too -- see aws/README.md.
    if (props.senderEmail) {
      const senderIdentity = new ses.EmailIdentity(this, 'SenderIdentity', {
        identity: ses.Identity.email(props.senderEmail),
      });
      senderIdentity.node.addMetadata('note', 'Click the AWS verification link sent to this address.');
    }

    // Cognito user pool -- the API's JWT authorizer trusts this.
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `planwitch-users-${suffix}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: false,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = userPool.addClient('AppClient', {
      userPoolClientName: 'planwitch-app',
      authFlows: { userPassword: true, userSrp: true },
      accessTokenValidity: cdk.Duration.hours(8),
      idTokenValidity: cdk.Duration.hours(8),
      preventUserExistenceErrors: true,
    });

    // Amazon Location Service: map style, place index and route calculator.
    const locationMap = new awsLocation.CfnMap(this, 'Map', {
      mapName: `planwitch-map-${suffix}`,
      configuration: { style: 'VectorEsriNavigation' },
      description: 'PlanWitch base map',
    });
    const placeIndex = new awsLocation.CfnPlaceIndex(this, 'PlaceIndex', {
      indexName: `planwitch-places-${suffix}`,
      dataSource: 'Esri',
      description: 'Place search + geocoding for PlanWitch',
    });
    const routeCalculator = new awsLocation.CfnRouteCalculator(this, 'RouteCalculator', {
      calculatorName: `planwitch-routes-${suffix}`,
      dataSource: 'Esri',
      description: 'Travel-time / distance calculations',
    });
    [locationMap, placeIndex, routeCalculator].forEach((r) =>
      r.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY));

    const locationArn = (kind: string, name: string) =>
      `arn:${this.partition}:geo:${this.region}:${this.account}:${kind}/${name}`;

    // ---------------------------------------------------------------- 4a. Analytics ingest
    // Declared before the functions so every handler can be given the stream name.

    // Kinesis Data Firehose has no free tier, so a Free Plan account cannot
    // subscribe to it ("The AWS Access Key Id needs a subscription for the
    // service"). The handlers treat ANALYTICS_STREAM as optional and simply
    // skip the analytics hop when it is absent.
    let analyticsStream: firehose.CfnDeliveryStream | undefined;

    if (!props.freeTierOnly) {
      const firehoseLogGroup = new logs.LogGroup(this, 'FirehoseLogs', {
        logGroupName: `/aws/kinesisfirehose/planwitch-${suffix}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
      const firehoseLogStream = new logs.LogStream(this, 'FirehoseLogStream', {
        logGroup: firehoseLogGroup,
        logStreamName: 's3-delivery',
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      const firehoseRole = new iam.Role(this, 'FirehoseRole', {
        assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
        description: 'Lets Kinesis Data Firehose land PlanWitch events in S3',
      });
      analyticsBucket.grantReadWrite(firehoseRole);
      firehoseLogGroup.grantWrite(firehoseRole);

      analyticsStream = new firehose.CfnDeliveryStream(this, 'AnalyticsStream', {
        deliveryStreamName: `planwitch-events-${suffix}`,
        deliveryStreamType: 'DirectPut',
        extendedS3DestinationConfiguration: {
          bucketArn: analyticsBucket.bucketArn,
          roleArn: firehoseRole.roleArn,
          prefix: 'events/',
          errorOutputPrefix: 'errors/',
          bufferingHints: { intervalInSeconds: 60, sizeInMBs: 1 },
          compressionFormat: 'UNCOMPRESSED',
          cloudWatchLoggingOptions: {
            enabled: true,
            logGroupName: firehoseLogGroup.logGroupName,
            logStreamName: firehoseLogStream.logStreamName,
          },
        },
      });
      analyticsStream.node.addDependency(firehoseRole);
      analyticsStream.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }

    // ---------------------------------------------------------------- 2. Compute

    const lambdaCode = lambda.Code.fromAsset(LAMBDA_DIR, {
      exclude: ['package-lock.json', '.npmrc', '**/*.md', '**/.DS_Store'],
    });

    const sharedEnv: Record<string, string> = {
      STACK_NAME: this.stackName,
      TRIPS_TABLE: tripsTable.tableName,
      OTP_TABLE: otpTable.tableName,
      JOBS_TABLE: jobsTable.tableName,
      UPLOADS_BUCKET: uploadsBucket.bucketName,
      MEDIA_BUCKET: mediaBucket.bucketName,
      EVENTS_TOPIC_ARN: eventsTopic.topicArn,
      JOBS_QUEUE_URL: jobsQueue.queueUrl,
      PLACE_INDEX_NAME: placeIndex.indexName,
      ROUTE_CALCULATOR_NAME: routeCalculator.calculatorName,
      BEDROCK_MODEL_ID: props.bedrockModelId,
      ...(analyticsStream ? { ANALYTICS_STREAM: analyticsStream.ref } : {}),
      SES_SENDER: props.senderEmail,
      EXPOSE_OTP: 'true', // demo stack: the OTP comes back in the response body
      NODE_OPTIONS: '--enable-source-maps',
    };

    /** Every function: Node 20, X-Ray on, one-week logs, destroyed on teardown. */
    const fn = (name: string, handlerFile: string, opts: Partial<lambda.FunctionProps> = {}) => {
      const logGroup = new logs.LogGroup(this, `${name}Logs`, {
        logGroupName: `/aws/lambda/planwitch-${name.toLowerCase()}-${suffix}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
      return new lambda.Function(this, name, {
        functionName: `planwitch-${name.toLowerCase()}-${suffix}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        architecture: lambda.Architecture.ARM_64,
        code: lambdaCode,
        handler: `${handlerFile}.handler`,
        memorySize: 512,
        timeout: cdk.Duration.seconds(29),
        tracing: lambda.Tracing.ACTIVE,
        environment: sharedEnv,
        logGroup,
        ...opts,
      });
    };

    const healthFn = fn('Health', 'health');
    const meFn = fn('Me', 'me');
    const tripsFn = fn('Trips', 'trips');
    const itineraryFn = fn('Itinerary', 'ai-itinerary');
    const asyncFn = fn('AsyncItinerary', 'ai-async');
    const placesFn = fn('Places', 'places');
    const translateFn = fn('Translate', 'translate');
    const speakFn = fn('Speak', 'speak', { memorySize: 1024 });
    const mediaFn = fn('MediaApi', 'media');
    const otpFn = fn('Otp', 'otp');
    const workerFn = fn('Worker', 'worker', { timeout: cdk.Duration.seconds(60) });
    const digestFn = fn('Digest', 'scheduled', { timeout: cdk.Duration.seconds(60) });
    const streamFn = fn('TripStream', 'stream', { timeout: cdk.Duration.seconds(60) });
    const generateFn = fn('WorkflowGenerate', 'sfn-generate', { timeout: cdk.Duration.minutes(5) });
    const enrichFn = fn('WorkflowEnrich', 'sfn-enrich', { timeout: cdk.Duration.minutes(2) });

    const allFns = [
      healthFn, meFn, tripsFn, itineraryFn, asyncFn, placesFn, translateFn,
      speakFn, mediaFn, otpFn, workerFn, digestFn, streamFn, generateFn, enrichFn,
    ];

    // --- IAM, least privilege per function -----------------------------------

    // Telemetry: custom metrics + the analytics firehose, for everyone.
    allFns.forEach((f) => {
      f.addToRolePolicy(new iam.PolicyStatement({
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'], // PutMetricData is not resource-scopable
        conditions: { StringEquals: { 'cloudwatch:namespace': 'PlanWitch/AWS' } },
      }));
      if (analyticsStream) {
        f.addToRolePolicy(new iam.PolicyStatement({
          actions: ['firehose:PutRecord', 'firehose:PutRecordBatch'],
          resources: [analyticsStream.attrArn],
        }));
      }
    });

    tripsTable.grantReadWriteData(tripsFn);
    tripsTable.grantReadWriteData(itineraryFn);
    tripsTable.grantReadData(digestFn);
    tripsTable.grantReadData(streamFn);
    otpTable.grantReadWriteData(otpFn);
    jobsTable.grantReadWriteData(workerFn);

    uploadsBucket.grantReadWrite(mediaFn);
    mediaBucket.grantReadWrite(speakFn);

    eventsTopic.grantPublish(itineraryFn);
    eventsTopic.grantPublish(digestFn);
    eventsTopic.grantPublish(streamFn);
    jobsQueue.grantSendMessages(asyncFn);
    jobsQueue.grantConsumeMessages(workerFn);
    thirdPartySecret?.grantRead(itineraryFn);

    // Bedrock: the sync endpoint and the workflow's drafting step.
    const bedrockPolicy = new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream', 'bedrock:Converse', 'bedrock:ConverseStream'],
      resources: [
        `arn:${this.partition}:bedrock:*::foundation-model/*`,
        `arn:${this.partition}:bedrock:${this.region}:${this.account}:inference-profile/*`,
      ],
    });
    itineraryFn.addToRolePolicy(bedrockPolicy);
    generateFn.addToRolePolicy(bedrockPolicy);

    // Amazon Location
    const locationPolicy = new iam.PolicyStatement({
      actions: [
        'geo:SearchPlaceIndexForText',
        'geo:SearchPlaceIndexForPosition',
        'geo:SearchPlaceIndexForSuggestions',
        'geo:CalculateRoute',
        'geo:GetPlace',
      ],
      resources: [
        locationArn('place-index', placeIndex.indexName),
        locationArn('route-calculator', routeCalculator.calculatorName),
      ],
    });
    placesFn.addToRolePolicy(locationPolicy);
    enrichFn.addToRolePolicy(locationPolicy);

    // Translate / Comprehend / Polly / Rekognition / SES: API-level actions, no ARNs.
    translateFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['translate:TranslateText', 'comprehend:DetectDominantLanguage', 'comprehend:DetectSentiment'],
      resources: ['*'],
    }));
    enrichFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['translate:TranslateText', 'comprehend:DetectSentiment', 'comprehend:DetectKeyPhrases'],
      resources: ['*'],
    }));
    speakFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['polly:SynthesizeSpeech', 'polly:DescribeVoices'],
      resources: ['*'],
    }));
    mediaFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['rekognition:DetectLabels', 'rekognition:DetectModerationLabels', 'rekognition:DetectText'],
      resources: ['*'],
    }));
    otpFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail'],
      resources: ['*'],
    }));

    // --- HTTP API ------------------------------------------------------------

    const httpApi = new apigw.HttpApi(this, 'Api', {
      apiName: `planwitch-api-${suffix}`,
      description: 'PlanWitch public API (Lambda-backed HTTP API)',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigw.CorsHttpMethod.ANY],
        allowHeaders: ['content-type', 'authorization'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    const apiAccessLogs = new logs.LogGroup(this, 'ApiAccessLogs', {
      logGroupName: `/aws/apigateway/planwitch-${suffix}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    (httpApi.defaultStage!.node.defaultChild as apigw.CfnStage).accessLogSettings = {
      destinationArn: apiAccessLogs.logGroupArn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        ip: '$context.identity.sourceIp',
        method: '$context.httpMethod',
        path: '$context.path',
        status: '$context.status',
        latency: '$context.responseLatency',
        integrationError: '$context.integrationErrorMessage',
      }),
    };

    const jwtAuthorizer = new authorizers.HttpUserPoolAuthorizer('JwtAuthorizer', userPool, {
      userPoolClients: [userPoolClient],
      identitySource: ['$request.header.Authorization'],
    });

    const route = (
      routePath: string,
      methods: apigw.HttpMethod[],
      target: lambda.Function,
      opts: { protected?: boolean } = {},
    ) => httpApi.addRoutes({
      path: routePath,
      methods,
      integration: new integrations.HttpLambdaIntegration(
        `I${routePath.replace(/[^a-zA-Z0-9]/g, '')}${methods[0]}`, target,
      ),
      ...(opts.protected ? { authorizer: jwtAuthorizer } : {}),
    });

    const GET = apigw.HttpMethod.GET;
    const POST = apigw.HttpMethod.POST;
    const DELETE = apigw.HttpMethod.DELETE;

    route('/health', [GET], healthFn);
    route('/me', [GET], meFn, { protected: true });
    route('/trips', [GET, POST], tripsFn);
    route('/trips/{tripId}', [GET, DELETE], tripsFn);
    route('/ai/itinerary', [POST], itineraryFn);
    route('/ai/itinerary/async', [POST], asyncFn);
    route('/ai/itinerary/status', [GET], asyncFn);
    route('/places', [GET], placesFn);
    route('/route', [GET], placesFn);
    route('/translate', [POST], translateFn);
    route('/speak', [POST], speakFn);
    route('/media/upload-url', [POST], mediaFn);
    route('/media/analyze', [POST], mediaFn);
    route('/auth/otp', [POST], otpFn);
    route('/auth/otp/verify', [POST], otpFn);

    // ---------------------------------------------------------------- 3. Orchestration

    // Step Functions: draft on Bedrock -> enrich -> persist -> notify.
    // The synchronous /ai/itinerary route is capped by API Gateway's 30s limit;
    // this workflow is the path for anything slower.
    const retry = { errors: ['States.ALL'], maxAttempts: 2, interval: cdk.Duration.seconds(2), backoffRate: 2 };

    const draftStep = new tasks.LambdaInvoke(this, 'DraftItinerary', {
      lambdaFunction: generateFn,
      outputPath: '$.Payload',
      comment: 'Amazon Bedrock drafts the itinerary',
    }).addRetry(retry);

    const enrichStep = new tasks.LambdaInvoke(this, 'EnrichItinerary', {
      lambdaFunction: enrichFn,
      outputPath: '$.Payload',
      comment: 'Comprehend + Translate + Amazon Location enrich the draft',
    }).addRetry(retry);

    const persistStep = new tasks.DynamoPutItem(this, 'PersistItinerary', {
      table: tripsTable,
      item: {
        userId: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.userId')),
        tripId: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.tripId')),
        destination: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.destination')),
        status: tasks.DynamoAttributeValue.fromString('workflow-complete'),
        source: tasks.DynamoAttributeValue.fromString('step-functions'),
        modelId: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.modelId')),
        itinerary: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.jsonToString(sfn.JsonPath.objectAt('$.itinerary'))),
        enrichment: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.jsonToString(sfn.JsonPath.objectAt('$.enrichment'))),
        createdAt: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$$.State.EnteredTime')),
        updatedAt: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$$.State.EnteredTime')),
      },
      resultPath: sfn.JsonPath.DISCARD,
      comment: 'Native DynamoDB service integration -- no Lambda needed',
    });

    const notifyStep = new tasks.SnsPublish(this, 'NotifyItineraryReady', {
      topic: eventsTopic,
      subject: 'PlanWitch: itinerary workflow finished',
      message: sfn.TaskInput.fromText(sfn.JsonPath.format(
        'Itinerary {} for {} is ready (model {}).',
        sfn.JsonPath.stringAt('$.tripId'),
        sfn.JsonPath.stringAt('$.destination'),
        sfn.JsonPath.stringAt('$.modelId'),
      )),
      resultPath: sfn.JsonPath.DISCARD,
    });

    const workflowFailed = new sfn.Fail(this, 'WorkflowFailed', {
      cause: 'Itinerary generation failed -- see the execution history',
      error: 'ItineraryGenerationError',
    });

    const definition = draftStep
      .next(enrichStep)
      .next(persistStep)
      .next(notifyStep)
      .next(new sfn.Succeed(this, 'WorkflowSucceeded'));

    draftStep.addCatch(workflowFailed, { errors: ['States.ALL'] });
    enrichStep.addCatch(workflowFailed, { errors: ['States.ALL'] });

    const sfnLogGroup = new logs.LogGroup(this, 'WorkflowLogs', {
      logGroupName: `/aws/vendedlogs/states/planwitch-${suffix}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const stateMachine = new sfn.StateMachine(this, 'ItineraryWorkflow', {
      stateMachineName: `planwitch-itinerary-${suffix}`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      stateMachineType: sfn.StateMachineType.STANDARD,
      timeout: cdk.Duration.minutes(15),
      tracingEnabled: true,
      logs: { destination: sfnLogGroup, level: sfn.LogLevel.ALL, includeExecutionData: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    asyncFn.addEnvironment('STATE_MACHINE_ARN', stateMachine.stateMachineArn);
    stateMachine.grantStartExecution(asyncFn);
    stateMachine.grantRead(asyncFn);

    // DynamoDB Streams -> Lambda: react to every trip write.
    streamFn.addEventSource(new lambdaEvents.DynamoEventSource(tripsTable, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(10),
      retryAttempts: 2,
      reportBatchItemFailures: true,
    }));

    // SQS -> Lambda worker, with partial-batch failure reporting.
    workerFn.addEventSource(new lambdaEvents.SqsEventSource(jobsQueue, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(5),
      reportBatchItemFailures: true,
    }));

    // A custom EventBridge bus: anything published with source `planwitch.app`
    // is routed onto the job queue.
    const eventBus = new events.EventBus(this, 'EventBus', {
      eventBusName: `planwitch-bus-${suffix}`,
    });
    eventBus.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    new events.Rule(this, 'AppEventsRule', {
      ruleName: `planwitch-app-events-${suffix}`,
      eventBus,
      description: 'Routes PlanWitch application events to the async job queue',
      eventPattern: { source: ['planwitch.app'] },
      targets: [new eventTargets.SqsQueue(jobsQueue)],
    });

    allFns.forEach((f) => eventBus.grantPutEventsTo(f));
    allFns.forEach((f) => f.addEnvironment('EVENT_BUS_NAME', eventBus.eventBusName));

    // EventBridge Scheduler: the daily traveller digest, 09:00 IST.
    const schedulerRole = new iam.Role(this, 'SchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
      description: 'Lets EventBridge Scheduler invoke the PlanWitch digest function',
    });
    digestFn.grantInvoke(schedulerRole);

    const dailySchedule = new awsScheduler.CfnSchedule(this, 'DailyDigestSchedule', {
      name: `planwitch-daily-digest-${suffix}`,
      description: 'Daily PlanWitch traveller digest',
      flexibleTimeWindow: { mode: 'OFF' },
      scheduleExpression: 'cron(0 9 * * ? *)',
      scheduleExpressionTimezone: 'Asia/Kolkata',
      state: 'ENABLED',
      target: {
        arn: digestFn.functionArn,
        roleArn: schedulerRole.roleArn,
        input: JSON.stringify({ trigger: 'eventbridge-scheduler' }),
        retryPolicy: { maximumRetryAttempts: 2, maximumEventAgeInSeconds: 3600 },
      },
    });
    dailySchedule.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // ---------------------------------------------------------------- 4b. Analytics query layer

    // Glue and Athena only earn their keep when Firehose is landing events.
    const glueDbName = `planwitch_${suffix}`;
    let athenaWorkGroup: athena.CfnWorkGroup | undefined;

    if (!props.freeTierOnly) {
      const glueDatabase = new glue.CfnDatabase(this, 'GlueDatabase', {
        catalogId: this.account,
        databaseInput: {
          name: glueDbName,
          description: 'PlanWitch product analytics (events landed by Firehose)',
        },
      });
      glueDatabase.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

      const glueTable = new glue.CfnTable(this, 'GlueEventsTable', {
        catalogId: this.account,
        databaseName: glueDbName,
        tableInput: {
          name: 'events',
          description: 'Raw JSON application events',
          tableType: 'EXTERNAL_TABLE',
          parameters: { classification: 'json' },
          storageDescriptor: {
            columns: [
              { name: 'event', type: 'string' },
              { name: 'ts', type: 'string' },
              { name: 'userid', type: 'string' },
              { name: 'tripid', type: 'string' },
              { name: 'jobid', type: 'string' },
              { name: 'type', type: 'string' },
              { name: 'modelid', type: 'string' },
              { name: 'destination', type: 'string' },
              { name: 'q', type: 'string' },
              { name: 'latency', type: 'bigint' },
            ],
            location: `s3://${analyticsBucket.bucketName}/events/`,
            inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
            outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
            serdeInfo: { serializationLibrary: 'org.openx.data.jsonserde.JsonSerDe' },
          },
        },
      });
      glueTable.addDependency(glueDatabase);
      glueTable.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

      athenaWorkGroup = new athena.CfnWorkGroup(this, 'AthenaWorkGroup', {
        name: `planwitch-${suffix}`,
        description: 'Ad-hoc analytics over PlanWitch events',
        state: 'ENABLED',
        recursiveDeleteOption: true,
        workGroupConfiguration: {
          enforceWorkGroupConfiguration: true,
          publishCloudWatchMetricsEnabled: true,
          resultConfiguration: { outputLocation: `s3://${analyticsBucket.bucketName}/athena-results/` },
        },
      });
      athenaWorkGroup.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }

    // ---------------------------------------------------------------- 5. Delivery

    // Identity pool: hands short-lived AWS credentials to the app so the map
    // tiles can be fetched client-side without proxying through Lambda.
    const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: `planwitch_identity_${suffix}`,
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [{
        clientId: userPoolClient.userPoolClientId,
        providerName: userPool.userPoolProviderName,
      }],
    });
    identityPool.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const federated = (amr: 'authenticated' | 'unauthenticated') =>
      new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: { 'cognito-identity.amazonaws.com:aud': identityPool.ref },
        'ForAnyValue:StringLike': { 'cognito-identity.amazonaws.com:amr': amr },
      }, 'sts:AssumeRoleWithWebIdentity');

    const mapReadPolicy = new iam.PolicyStatement({
      actions: ['geo:GetMapTile', 'geo:GetMapStyleDescriptor', 'geo:GetMapSprites', 'geo:GetMapGlyphs'],
      resources: [locationArn('map', locationMap.mapName)],
    });
    const placeSearchPolicy = new iam.PolicyStatement({
      actions: ['geo:SearchPlaceIndexForText', 'geo:SearchPlaceIndexForSuggestions'],
      resources: [locationArn('place-index', placeIndex.indexName)],
    });

    const guestRole = new iam.Role(this, 'GuestRole', {
      assumedBy: federated('unauthenticated'),
      description: 'PlanWitch guest (map tiles only)',
    });
    guestRole.addToPolicy(mapReadPolicy);

    const authRole = new iam.Role(this, 'AuthRole', {
      assumedBy: federated('authenticated'),
      description: 'PlanWitch signed-in user (maps, place search, own uploads)',
    });
    authRole.addToPolicy(mapReadPolicy);
    authRole.addToPolicy(placeSearchPolicy);
    authRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject', 's3:GetObject'],
      resources: [`${uploadsBucket.bucketArn}/uploads/\${cognito-identity.amazonaws.com:sub}/*`],
    }));

    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoles', {
      identityPoolId: identityPool.ref,
      roles: { authenticated: authRole.roleArn, unauthenticated: guestRole.roleArn },
    });

    // CloudFront is skipped when the account is not yet verified for it; the
    // bucket is then served directly over its HTTPS REST endpoint, which needs
    // no distribution and no certificate.
    let distribution: cloudfront.Distribution | undefined;

    if (props.useCloudFront) {
      // A CloudFront Function rewrites directory URLs (/console/ -> /console/index.html)
      // so the demo console and the SPA can share one distribution.
      const directoryIndex = new cloudfront.Function(this, 'DirectoryIndexFn', {
        functionName: `planwitch-dirindex-${suffix}`,
        comment: 'Appends index.html to directory-style request URIs',
        runtime: cloudfront.FunctionRuntime.JS_2_0,
        code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.split('/').pop().includes('.')) {
    request.uri = uri + '/index.html';
  }
  return request;
}
        `.trim()),
      });

      distribution = new cloudfront.Distribution(this, 'Cdn', {
        comment: `PlanWitch web app + AWS demo console (${suffix})`,
        defaultRootObject: 'index.html',
        priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
        httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
          functionAssociations: [{
            function: directoryIndex,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          }],
        },
        errorResponses: [
          { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.minutes(5) },
          { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.minutes(5) },
        ],
      });
    }

    // Bucket root is the site root either way, so the Expo build's absolute
    // asset paths resolve correctly under both.
    const siteBase = distribution
      ? `https://${distribution.distributionDomainName}`
      : `https://${webBucket.bucketName}.s3.${this.region}.amazonaws.com`;
    const consoleUrl = distribution ? `${siteBase}/console/` : `${siteBase}/console/index.html`;
    const webAppUrl = distribution ? siteBase : `${siteBase}/index.html`;

    if (props.deployWebApp && fs.existsSync(WEB_BUILD_DIR)) {
      new s3deploy.BucketDeployment(this, 'DeployWebApp', {
        sources: [s3deploy.Source.asset(WEB_BUILD_DIR)],
        destinationBucket: webBucket,
        ...(distribution ? { distribution, distributionPaths: ['/*'] } : {}),
        prune: false,
        memoryLimit: 512,
      });
    }

    new s3deploy.BucketDeployment(this, 'DeployConsole', {
      sources: [
        s3deploy.Source.asset(CONSOLE_DIR),
        // Resolved by CloudFormation at deploy time, so the console needs no hand-editing.
        s3deploy.Source.jsonData('config.json', {
          apiUrl: httpApi.apiEndpoint,
          region: this.region,
          userPoolId: userPool.userPoolId,
          userPoolClientId: userPoolClient.userPoolClientId,
          identityPoolId: identityPool.ref,
          mapName: locationMap.mapName,
          placeIndexName: placeIndex.indexName,
          bedrockModelId: props.bedrockModelId,
          stackName: this.stackName,
          restrictedServices: props.restrictedServices,
        }),
      ],
      destinationBucket: webBucket,
      destinationKeyPrefix: 'console',
      ...(distribution ? { distribution, distributionPaths: ['/console/*'] } : {}),
      prune: false,
    });

    // ---------------------------------------------------------------- 6. Governance

    // CloudTrail: a single-region management-events trail (free tier).
    const trail = new cloudtrail.Trail(this, 'AuditTrail', {
      trailName: `planwitch-${suffix}`,
      bucket: trailBucket,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: false,
      enableFileValidation: true,
    });
    trail.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // --- Alarms --------------------------------------------------------------
    const alarmAction = new cloudwatchActions.SnsAction(eventsTopic);

    // CloudWatch caps an alarm's math expression at 10 metrics, so the alarm
    // watches the request-facing functions; the dashboard covers all of them
    // through a SEARCH expression, which alarms do not support.
    const alarmFns = [itineraryFn, tripsFn, asyncFn, mediaFn, otpFn, placesFn, translateFn, speakFn];

    const lambdaErrors = new cloudwatch.MathExpression({
      expression: alarmFns.map((_, i) => `e${i}`).join(' + '),
      usingMetrics: Object.fromEntries(
        alarmFns.map((f, i) => [`e${i}`, f.metricErrors({ period: cdk.Duration.minutes(5) })]),
      ),
      label: 'Lambda errors (request-facing functions)',
      period: cdk.Duration.minutes(5),
    });

    const errorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
      alarmName: `planwitch-lambda-errors-${suffix}`,
      alarmDescription: 'A request-facing PlanWitch Lambda is throwing',
      metric: lambdaErrors,
      threshold: 3,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    errorAlarm.addAlarmAction(alarmAction);

    const dlqAlarm = new cloudwatch.Alarm(this, 'DlqAlarm', {
      alarmName: `planwitch-dlq-not-empty-${suffix}`,
      alarmDescription: 'Jobs have fallen through to the dead-letter queue',
      metric: jobsDlq.metricApproximateNumberOfMessagesVisible({ period: cdk.Duration.minutes(5) }),
      threshold: 0,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dlqAlarm.addAlarmAction(alarmAction);

    const itineraryFailureAlarm = new cloudwatch.Alarm(this, 'ItineraryFailureAlarm', {
      alarmName: `planwitch-itinerary-failures-${suffix}`,
      alarmDescription: 'Bedrock itinerary generation is failing (often: model access not enabled)',
      metric: new cloudwatch.Metric({
        namespace: 'PlanWitch/AWS',
        metricName: 'ItineraryFailed',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 2,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    itineraryFailureAlarm.addAlarmAction(alarmAction);

    // --- Dashboard -----------------------------------------------------------
    const appMetric = (metricName: string, statistic = 'Sum') => new cloudwatch.Metric({
      namespace: 'PlanWitch/AWS', metricName, statistic, period: cdk.Duration.minutes(5),
    });

    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `PlanWitch-${suffix}`,
      defaultInterval: cdk.Duration.hours(12),
    });

    dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: [
          `# PlanWitch on AWS -- \`${this.stackName}\``,
          '',
          `Region **${this.region}** | Bedrock model \`${props.bedrockModelId}\``,
          '',
          'Traffic flows: CloudFront -> S3 (web) and client -> HTTP API -> Lambda ->',
          'Bedrock / DynamoDB / Location / Polly / Rekognition, with Step Functions',
          'handling long-running itinerary generation and Firehose feeding Athena.',
        ].join('\n'),
        width: 24, height: 4,
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API requests & errors',
        left: [httpApi.metricCount({ period: cdk.Duration.minutes(5) })],
        right: [
          httpApi.metricServerError({ period: cdk.Duration.minutes(5) }),
          httpApi.metricClientError({ period: cdk.Duration.minutes(5) }),
        ],
        width: 12, height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'API latency (p50 / p99)',
        left: [
          httpApi.metricLatency({ statistic: 'p50', period: cdk.Duration.minutes(5) }),
          httpApi.metricLatency({ statistic: 'p99', period: cdk.Duration.minutes(5) }),
        ],
        width: 12, height: 6,
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Bedrock itineraries',
        left: [appMetric('ItineraryGenerated'), appMetric('ItineraryFailed'), appMetric('WorkflowStarted')],
        right: [appMetric('BedrockLatency', 'Average')],
        width: 12, height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'AI service usage',
        left: [
          appMetric('TextTranslated'), appMetric('SpeechSynthesized'),
          appMetric('ImageAnalysed'), appMetric('PlaceSearch'), appMetric('RouteCalculated'),
        ],
        width: 12, height: 6,
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Trips & jobs',
        left: [appMetric('TripSaved'), appMetric('TripsListed'), appMetric('JobProcessed')],
        right: [appMetric('TotalTrips', 'Maximum'), appMetric('UpcomingTrips', 'Maximum')],
        width: 12, height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Workflow executions',
        left: [
          stateMachine.metricStarted({ period: cdk.Duration.minutes(5) }),
          stateMachine.metricSucceeded({ period: cdk.Duration.minutes(5) }),
          stateMachine.metricFailed({ period: cdk.Duration.minutes(5) }),
        ],
        width: 12, height: 6,
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: 'Queue depth',
        metrics: [
          jobsQueue.metricApproximateNumberOfMessagesVisible(),
          jobsDlq.metricApproximateNumberOfMessagesVisible(),
        ],
        width: 8, height: 5,
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB consumed capacity',
        left: [
          tripsTable.metricConsumedReadCapacityUnits({ period: cdk.Duration.minutes(5) }),
          tripsTable.metricConsumedWriteCapacityUnits({ period: cdk.Duration.minutes(5) }),
        ],
        width: 8, height: 5,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda errors -- every function',
        left: [new cloudwatch.MathExpression({
          expression: `SEARCH('{AWS/Lambda,FunctionName} MetricName="Errors" planwitch-${suffix}', 'Sum', 300)`,
          label: '',
          period: cdk.Duration.minutes(5),
          usingMetrics: {},
        })],
        width: 24, height: 6,
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.AlarmStatusWidget({
        title: 'Alarms',
        alarms: [errorAlarm, dlqAlarm, itineraryFailureAlarm],
        width: 8, height: 5,
      }),
    );

    // --- Cost guardrail ------------------------------------------------------
    // This account is disposable, but a runaway loop should still page someone.
    const budgetAlert = (notificationType: string, threshold: number, comparison = 'GREATER_THAN') => ({
      notification: {
        notificationType,
        comparisonOperator: comparison,
        threshold,
        thresholdType: 'PERCENTAGE',
      },
      subscribers: [{ subscriptionType: 'EMAIL', address: props.alertEmail }],
    });

    // Tiered alerts: an early warning long before the cap, then escalating.
    // Note: editing notificationsWithSubscribers replaces the budget, and the
    // name is its physical id, so deploy.sh clears old budgets of these names
    // first -- otherwise CloudFormation fails with "same name but a different
    // internalId already exists".
    new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetName: `planwitch-monthly-${suffix}`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: props.monthlyBudgetUsd, unit: 'USD' },
      },
      ...(props.alertEmail ? {
        notificationsWithSubscribers: [
          budgetAlert('ACTUAL', 25),
          budgetAlert('ACTUAL', 50),
          budgetAlert('ACTUAL', 80),
          budgetAlert('ACTUAL', 100),
          budgetAlert('FORECASTED', 100),
        ],
      } : {}),
    });

    // A daily budget catches a runaway loop within hours rather than at
    // month end, which is the failure mode that actually burns credits.
    new budgets.CfnBudget(this, 'DailyBudget', {
      budget: {
        budgetName: `planwitch-daily-${suffix}`,
        budgetType: 'COST',
        timeUnit: 'DAILY',
        budgetLimit: { amount: 1, unit: 'USD' },
      },
      ...(props.alertEmail ? {
        notificationsWithSubscribers: [budgetAlert('ACTUAL', 80), budgetAlert('ACTUAL', 100)],
      } : {}),
    });

    // Per-service budget: isolates compute spend from everything else, so a
    // runaway function shows up here before it moves the account total.
    // (A USAGE budget cannot filter on Service -- Budgets only accepts
    // dimensions like UsageType and UsageTypeGroup there.)
    new budgets.CfnBudget(this, 'LambdaCostBudget', {
      budget: {
        budgetName: `planwitch-lambda-${suffix}`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: 1, unit: 'USD' },
        costFilters: { Service: ['AWS Lambda'] },
      },
      ...(props.alertEmail ? {
        notificationsWithSubscribers: [budgetAlert('ACTUAL', 80)],
      } : {}),
    });

    // --- Config discovery ----------------------------------------------------
    // SSM Parameter Store doubles as the app's runtime config lookup.
    const param = (name: string, value: string, description: string) =>
      new ssm.StringParameter(this, `Param${name.replace(/[^a-zA-Z0-9]/g, '')}`, {
        parameterName: `/planwitch/${name}`,
        stringValue: value,
        description,
        tier: ssm.ParameterTier.STANDARD,
      });

    param('api-url', httpApi.apiEndpoint, 'PlanWitch HTTP API base URL');
    param('cdn-url', siteBase, 'Public site base URL (CloudFront, or the S3 HTTPS endpoint)');
    param('user-pool-id', userPool.userPoolId, 'Cognito user pool id');
    param('user-pool-client-id', userPoolClient.userPoolClientId, 'Cognito app client id');
    param('identity-pool-id', identityPool.ref, 'Cognito identity pool id');
    param('map-name', locationMap.mapName, 'Amazon Location map resource');
    param('place-index-name', placeIndex.indexName, 'Amazon Location place index');
    param('bedrock-model-id', props.bedrockModelId, 'Bedrock model used for itineraries');
    param('state-machine-arn', stateMachine.stateMachineArn, 'Itinerary workflow state machine');

    // --- Outputs -------------------------------------------------------------
    const out = (name: string, value: string, description: string) =>
      new cdk.CfnOutput(this, name, { value, description });

    out('ApiUrl', httpApi.apiEndpoint, 'HTTP API base URL');
    out('WebAppUrl', webAppUrl, 'PlanWitch web app');
    out('DemoConsoleUrl', consoleUrl, 'Live AWS demo console');
    out('HealthCheck', `${httpApi.apiEndpoint}/health`, 'Smoke-test endpoint');
    out('DashboardUrl',
      `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=PlanWitch-${suffix}`,
      'CloudWatch dashboard');
    out('StateMachineUrl',
      `https://${this.region}.console.aws.amazon.com/states/home?region=${this.region}#/statemachines/view/${stateMachine.stateMachineArn}`,
      'Step Functions workflow');
    if (athenaWorkGroup) {
      out('AthenaWorkGroupName', athenaWorkGroup.name!, 'Athena work group for event analytics');
      out('GlueDatabaseName', glueDbName, 'Glue catalog database');
    }
    out('UserPoolId', userPool.userPoolId, 'Cognito user pool');
    out('UserPoolClientId', userPoolClient.userPoolClientId, 'Cognito app client');
    out('IdentityPoolId', identityPool.ref, 'Cognito identity pool');
    out('TripsTableName', tripsTable.tableName, 'DynamoDB trips table');
    out('UploadsBucket', uploadsBucket.bucketName, 'S3 bucket for trip photos');
    out('AnalyticsBucket', analyticsBucket.bucketName, 'S3 bucket Firehose writes to');
    out('EventsTopicArn', eventsTopic.topicArn, 'SNS topic for app events');
    out('JobsQueueUrl', jobsQueue.queueUrl, 'SQS job queue');
    out('EventBusName', eventBus.eventBusName, 'Custom EventBridge bus');
    if (thirdPartySecret) out('SecretName', thirdPartySecret.secretName, 'Secrets Manager entry for third-party keys');
    out('BedrockModelId', props.bedrockModelId, 'Bedrock model id in use');
  }
}
