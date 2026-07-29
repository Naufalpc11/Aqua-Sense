import { resetTelemetryInSupabase } from '../../server/supabase-service.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  const requestUrl = new URL(request.url, 'http://localhost');
  const token = requestUrl.searchParams.get('token') || '';
  const expectedToken = process.env.RESET_TOKEN || '';

  if (!expectedToken || token !== expectedToken) {
    response.status(403).json({ success: false, message: 'Token reset tidak valid' });
    return;
  }

  try {
    const result = await resetTelemetryInSupabase();
    response.status(200).json(result);
  } catch (error) {
    response.status(503).json({ success: false, message: error.message || 'Reset gagal' });
  }
}