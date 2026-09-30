// GET /places?q=...        -- Amazon Location place search (Esri data)
// GET /places?lon=&lat=    -- reverse geocode
// GET /route?from=lon,lat&to=lon,lat -- car route via Location route calculator
import {
  LocationClient, SearchPlaceIndexForTextCommand,
  SearchPlaceIndexForPositionCommand, CalculateRouteCommand,
} from '@aws-sdk/client-location';
import { ok, fail, qs, metric, track, REGION } from './_lib.mjs';

const location = new LocationClient({ region: REGION });
const pair = (s) => (s || '').split(',').map(Number).filter((n) => Number.isFinite(n));

export const handler = async (event) => {
  try {
    const path = event.rawPath || '';

    if (path.includes('/route')) {
      const from = pair(qs(event, 'from'));
      const to = pair(qs(event, 'to'));
      if (from.length !== 2 || to.length !== 2) {
        return ok({ ok: false, error: 'from and to required as "lon,lat"' }, 400);
      }
      const r = await location.send(new CalculateRouteCommand({
        CalculatorName: process.env.ROUTE_CALCULATOR_NAME,
        DeparturePosition: from,
        DestinationPosition: to,
        TravelMode: qs(event, 'mode', 'Car'),
        IncludeLegGeometry: false,
      }));
      await metric('RouteCalculated');
      return ok({
        ok: true,
        distanceKm: r.Summary?.Distance,
        durationMinutes: r.Summary?.DurationSeconds ? Math.round(r.Summary.DurationSeconds / 60) : null,
        legs: (r.Legs || []).length,
      });
    }

    const lon = Number(qs(event, 'lon'));
    const lat = Number(qs(event, 'lat'));
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      const r = await location.send(new SearchPlaceIndexForPositionCommand({
        IndexName: process.env.PLACE_INDEX_NAME, Position: [lon, lat], MaxResults: 5,
      }));
      await metric('ReverseGeocode');
      return ok({ ok: true, results: (r.Results || []).map((x) => x.Place) });
    }

    const q = qs(event, 'q');
    if (!q) return ok({ ok: false, error: 'q (or lon+lat) required' }, 400);
    const r = await location.send(new SearchPlaceIndexForTextCommand({
      IndexName: process.env.PLACE_INDEX_NAME,
      Text: q,
      MaxResults: Number(qs(event, 'limit', 8)),
      FilterCountries: qs(event, 'country') ? [qs(event, 'country')] : undefined,
    }));
    await metric('PlaceSearch');
    await track('place_search', { q });
    return ok({
      ok: true,
      query: q,
      results: (r.Results || []).map((x) => ({
        label: x.Place?.Label,
        point: x.Place?.Geometry?.Point,
        country: x.Place?.Country,
        municipality: x.Place?.Municipality,
        categories: x.Place?.Categories,
      })),
    });
  } catch (e) {
    return fail(e);
  }
};
