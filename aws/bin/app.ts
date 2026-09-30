#!/usr/bin/env node
// PlanWitch AWS demo stack -- entry point.
//
// Everything lives in ONE stack so the whole footprint can be torn down with a
// single `npm run destroy` when the throwaway account is closed.
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PlanWitchStack } from '../lib/planwitch-stack';

const app = new cdk.App();

const region = app.node.tryGetContext('region') || process.env.CDK_DEFAULT_REGION || 'ap-south-1';
const account = process.env.CDK_DEFAULT_ACCOUNT;

new PlanWitchStack(app, 'PlanWitchAws', {
  env: { account, region },
  description: 'PlanWitch travel app -- AWS reference architecture (demo/review stack)',
  alertEmail: app.node.tryGetContext('alertEmail') || '',
  senderEmail: app.node.tryGetContext('senderEmail') || '',
  bedrockModelId: app.node.tryGetContext('bedrockModelId'),
  monthlyBudgetUsd: Number(app.node.tryGetContext('monthlyBudgetUsd') || 5),
  deployWebApp: String(app.node.tryGetContext('deployWebApp')) !== 'false',
  useCloudFront: String(app.node.tryGetContext('useCloudFront')) !== 'false',
  freeTierOnly: String(app.node.tryGetContext('freeTierOnly')) === 'true',
  restrictedServices: String(app.node.tryGetContext('restrictedServices') || '')
    .split(',').map((s) => s.trim()).filter(Boolean),
});

cdk.Tags.of(app).add('Project', 'PlanWitch');
cdk.Tags.of(app).add('Environment', 'review-demo');
cdk.Tags.of(app).add('ManagedBy', 'aws-cdk');

app.synth();
