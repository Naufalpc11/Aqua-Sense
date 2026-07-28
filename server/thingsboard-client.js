import { config } from './config.js';

const {
  baseUrl,
  username,
  password,
  deviceId: configuredDeviceId,
  deviceName,
} = config.thingsBoard;

let jwt = '';
let resolvedDeviceId = configuredDeviceId;

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(`Login ThingsBoard gagal (${response.status})`);
  }

  const body = await response.json();
  if (!body.token) {
    throw new Error('ThingsBoard tidak mengembalikan JWT');
  }

  jwt = body.token;
}

export async function thingsBoardRequest(path, retry = true) {
  if (!jwt) await login();

  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'X-Authorization': `Bearer ${jwt}` },
  });

  if (response.status === 401 && retry) {
    jwt = '';
    return thingsBoardRequest(path, false);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `ThingsBoard API gagal (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`,
    );
  }

  return response.json();
}

export async function getDeviceId() {
  if (resolvedDeviceId) return resolvedDeviceId;

  const device = await thingsBoardRequest(
    `/api/tenant/devices?deviceName=${encodeURIComponent(deviceName)}`,
  );
  resolvedDeviceId = device?.id?.id || device?.id || '';

  if (!resolvedDeviceId) {
    throw new Error(`Device ThingsBoard "${deviceName}" tidak ditemukan`);
  }

  return resolvedDeviceId;
}
