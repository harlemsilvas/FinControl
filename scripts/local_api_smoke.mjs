import process from 'node:process';

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
const loginEmail = process.env.BOOTSTRAP_MASTER_EMAIL ?? 'master@example.com';
const loginPassword = process.env.BOOTSTRAP_MASTER_PASSWORD ?? 'Harlem010101';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { status: response.status, body };
}

const login = await request('/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: loginEmail, password: loginPassword }),
});

if (login.status !== 200) {
  process.stdout.write(`${JSON.stringify({ login }, null, 2)}\n`);
  process.exit(1);
}

const accessToken = login.body.accessToken;
const headers = { authorization: `Bearer ${accessToken}` };
const [me, suppliers, categories, payables, batches, xmlImports, dashboard, agenda] = await Promise.all([
  request('/auth/me', { headers }),
  request('/api/v1/suppliers?pageSize=20', { headers }),
  request('/api/v1/financial-categories?pageSize=100&active=true', { headers }),
  request('/api/v1/payables?pageSize=20', { headers }),
  request('/api/v1/payment-batches', { headers }),
  request('/api/v1/xml-imports', { headers }),
  request('/api/v1/dashboard?from=2026-07-01&to=2026-07-31', { headers }),
  request('/api/v1/agenda?from=2026-07-01&to=2026-07-31', { headers }),
]);

process.stdout.write(`${JSON.stringify({ loginStatus: login.status, me, suppliers, categories, payables, batches, xmlImports, dashboard, agenda }, null, 2)}\n`);
