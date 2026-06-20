import {neon} from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  // On Vercel this is injected by the Neon integration.
  throw new Error('DATABASE_URL is not set');
}

export const sql = neon(process.env.DATABASE_URL);
