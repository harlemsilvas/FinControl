import { readFile } from 'node:fs/promises';
import process from 'node:process';
import pg from 'pg';

const [filePath] = process.argv.slice(2);

if (!filePath) {
  process.stderr.write('Usage: node scripts/run_sql_file.mjs <sql-file>\n');
  process.exit(1);
}

const sql = (await readFile(filePath, 'utf8'))
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('\\'))
  .join('\n');

const client = new pg.Client({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? '5434'),
  database: process.env.DB_NAME ?? 'fincontrol',
  user: process.env.DB_USER ?? 'fincontrol',
  password: process.env.DB_PASSWORD ?? 'fincontrol_local',
});

try {
  await client.connect();
  const result = await client.query(sql);
  process.stdout.write(`${JSON.stringify(result.rows, null, 2)}\n`);
} finally {
  await client.end();
}
