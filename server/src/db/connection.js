import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || process.env.SUPABASE_URL,
  pool: {
    min: 2,
    max: 10
  }
});

export default db;
