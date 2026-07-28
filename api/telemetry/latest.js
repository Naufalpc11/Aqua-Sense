import { getLatestTelemetry } from '../../server/telemetry-service.js';
import { sendJson } from '../../server/http-utils.js';

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { message: 'Method not allowed' });
    return;
  }

  try {
    sendJson(response, 200, await getLatestTelemetry());
  } catch (error) {
    sendJson(response, 503, {
      connected: false,
      message: errorMessage(error, 'Telemetry tidak tersedia'),
    });
  }
}
