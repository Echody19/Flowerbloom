import { createServer as createHttpServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';
import vercelChatHandler from '../api/chat.js';

loadEnvFile('.env');
loadEnvFile('.env.local');

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 5173);

const vite = await createViteServer({
  appType: 'mpa',
  configLoader: 'native',
  server: {
    host,
    middlewareMode: true,
  },
});

const server = createHttpServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);

  if (requestUrl.pathname === '/api/chat') {
    await handleVercelChatRequest(request, response);
    return;
  }

  vite.middlewares(request, response, (error) => {
    if (error) {
      vite.ssrFixStacktrace(error);
      response.statusCode = 500;
      response.end(error.stack);
      return;
    }

    response.statusCode = 404;
    response.end('Not found');
  });
});

server.listen(port, host, () => {
  console.log(`EchoBloom is running at http://${host}:${port}/`);
});

async function handleVercelChatRequest(request, response) {
  const vercelResponse = {
    status(statusCode) {
      response.statusCode = statusCode;
      return this;
    },
    json(payload) {
      if (!response.headersSent) {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
      }

      response.end(JSON.stringify(payload));
    },
    end(payload) {
      response.end(payload);
    },
  };

  await vercelChatHandler(request, vercelResponse);
}

function loadEnvFile(filename) {
  const envPath = resolve(process.cwd(), filename);

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^(['"])(.*)\1$/, '$2');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}
