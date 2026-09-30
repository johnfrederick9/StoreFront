import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import * as schema from './schema'

// Pool over Neon's WebSocket driver so `db.transaction(...)` works — the
// Stripe webhook needs to write an order + its items + decrement stock as a
// unit. (The neon-http driver is simpler but cannot do interactive
// transactions.)
const pool = new Pool({ connectionString: process.env.DATABASE_URL! })

export const db = drizzle(pool, { schema })

export * from './schema'
