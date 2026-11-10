import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from './app';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Multi-path .env resolution so server runs identically whether invoked from repo root or node-backend
const envCandidates = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), 'node-backend/.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    try {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      for (const k in envConfig) {
        if (!process.env[k]) {
          process.env[k] = envConfig[k];
        }
      }
    } catch {
      // ignore parse errors
    }
  }
}

// Ensure default local database fallback if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:G2q2hxzc%2427@localhost:5432/trusthire_auth_db?schema=public";
}

const port = Number(process.env.PORT) || 8787;
console.log(`[Local DB Mode] Node Server is running on http://localhost:${port} (http://127.0.0.1:${port})`);
console.log(`Using Database: ${process.env.DATABASE_URL?.split('@')[1]}`);

serve({
  // Pass process.env as the Cloudflare c.env binding
  fetch: (req) => app.fetch(req, process.env, {} as any),
  port,
  hostname: '0.0.0.0'
});
