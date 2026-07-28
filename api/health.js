import { isThingsBoardConfigured } from '../server/config.js';
import { sendJson } from '../server/http-utils.js';

export default function handler(request, response) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { message: 'Method not allowed' });
    return;
  }

  sendJson(response, 200, {
    ok: true,
    configured: isThingsBoardConfigured(),
  });
}
