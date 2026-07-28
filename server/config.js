import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env');

export const config = {
  port: Number(process.env.API_PORT || 3001),
  thingsBoard: {
    baseUrl: (process.env.TB_BASE_URL || '').replace(/\/+$/, ''),
    username: process.env.TB_USERNAME || '',
    password: process.env.TB_PASSWORD || '',
    deviceId: process.env.TB_DEVICE_ID || '',
    deviceName: process.env.TB_DEVICE_NAME || '',
    staleAfterMs: Number(process.env.TB_STALE_AFTER_MS || 30000),
  },
  distDir: join(process.cwd(), 'dist'),
};

export function assertThingsBoardConfigured() {
  const {
    baseUrl,
    username,
    password,
    deviceId,
    deviceName,
  } = config.thingsBoard;
  const missing = [];

  if (!baseUrl) missing.push('TB_BASE_URL');
  if (!username) missing.push('TB_USERNAME');
  if (!password) missing.push('TB_PASSWORD');
  if (!deviceId && !deviceName) {
    missing.push('TB_DEVICE_ID atau TB_DEVICE_NAME');
  }

  if (missing.length) {
    throw new Error(`Konfigurasi belum lengkap: ${missing.join(', ')}`);
  }
}

export function isThingsBoardConfigured() {
  const {
    baseUrl,
    username,
    password,
    deviceId,
    deviceName,
  } = config.thingsBoard;

  return Boolean(
    baseUrl && username && password && (deviceId || deviceName),
  );
}
