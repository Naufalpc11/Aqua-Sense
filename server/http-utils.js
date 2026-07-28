  import {
  existsSync,
  readFileSync,
  statSync,
} from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { config } from './config.js';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

export function serveStatic(request, response) {
  if (!existsSync(config.distDir)) return false;

  const pathname = new URL(request.url, 'http://localhost').pathname;
  const requestedPath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const relativePath = normalize(requestedPath).replace(
    /^(\.\.[/\\])+/,
    '',
  );
  let filePath = join(config.distDir, relativePath);

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(config.distDir, 'index.html');
  }

  response.writeHead(200, {
    'Content-Type':
      CONTENT_TYPES[extname(filePath)] || 'application/octet-stream',
  });
  response.end(readFileSync(filePath));
  return true;
}
