import { createServer } from 'node:http';
import {
  config,
  isThingsBoardConfigured,
} from './config.js';
import { sendJson, serveStatic } from './http-utils.js';
import {
  getLatestTelemetry,
  getTelemetryHistory,
} from './telemetry-service.js';

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, 'http://localhost');
  const { pathname } = requestUrl;

  if (request.method === 'GET' && pathname === '/api/health') {
    sendJson(response, 200, {
      ok: true,
      configured: isThingsBoardConfigured(),
    });
    return;
  }

  if (request.method === 'GET' && pathname === '/api/telemetry/latest') {
    try {
      sendJson(response, 200, await getLatestTelemetry());
    } catch (error) {
      sendJson(response, 503, {
        connected: false,
        message: errorMessage(error, 'Telemetry tidak tersedia'),
      });
    }
    return;
  }

  if (request.method === 'GET' && pathname === '/api/telemetry/history') {
    try {
      const history = await getTelemetryHistory(requestUrl.searchParams);
      sendJson(response, 200, history);
    } catch (error) {
      sendJson(response, 503, {
        connected: false,
        message: errorMessage(error, 'Riwayat telemetry tidak tersedia'),
      });
    }
    return;
  }

  if (request.method === 'GET' && serveStatic(request, response)) return;
  sendJson(response, 404, { message: 'Not found' });
});

server.listen(config.port, () => {
  console.log(`AquaSense API listening on http://localhost:${config.port}`);
});
