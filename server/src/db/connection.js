import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

let db;

if (dbUrl) {
  const url = new URL(dbUrl);
  db = knex({
    client: 'pg',
    connection: {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1),
      user: url.username,
      password: decodeURIComponent(url.password),
      ssl: { rejectUnauthorized: false }
    },
    pool: {
      min: 2,
      max: 10
    }
  });
} else {
  db = knex({
    client: 'sqlite3',
    connection: { filename: './flowdesk.db' },
    useNullAsDefault: true
  });
}

export default db;
