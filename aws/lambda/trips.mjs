// /trips -- CRUD backed by DynamoDB (PK userId, SK tripId) with a GSI for recency.
import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, ok, fail, parseBody, qs, id, metric, track, userIdOf } from './_lib.mjs';

const TABLE = process.env.TRIPS_TABLE;

export const handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method || 'GET';
    const body = parseBody(event);
    const userId = userIdOf(event, body);

    if (method === 'GET') {
      const tripId = event.pathParameters?.tripId;
      if (tripId) {
        const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { userId, tripId } }));
        if (!r.Item) return ok({ ok: false, error: 'trip not found' }, 404);
        return ok({ ok: true, trip: r.Item });
      }
      const r = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId },
        Limit: Number(qs(event, 'limit', 50)),
      }));
      await metric('TripsListed', r.Count || 0);
      return ok({ ok: true, userId, count: r.Count || 0, trips: r.Items || [] });
    }

    if (method === 'POST' || method === 'PUT') {
      const trip = {
        userId,
        tripId: body.tripId || id('trip'),
        destination: body.destination || 'Unknown',
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        travellers: body.travellers ?? 1,
        budget: body.budget ?? null,
        interests: body.interests || [],
        itinerary: body.itinerary || null,
        status: body.status || 'draft',
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await ddb.send(new PutCommand({ TableName: TABLE, Item: trip }));
      await metric('TripSaved');
      await track('trip_saved', { userId, destination: trip.destination });
      return ok({ ok: true, trip }, 201);
    }

    if (method === 'DELETE') {
      const tripId = event.pathParameters?.tripId || body.tripId;
      if (!tripId) return ok({ ok: false, error: 'tripId required' }, 400);
      await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { userId, tripId } }));
      await metric('TripDeleted');
      return ok({ ok: true, deleted: tripId });
    }

    return ok({ ok: false, error: `unsupported method ${method}` }, 405);
  } catch (e) {
    return fail(e);
  }
};
