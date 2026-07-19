const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
const email = process.env.BOOTSTRAP_MASTER_EMAIL ?? 'master@example.com';
const password = process.env.BOOTSTRAP_MASTER_PASSWORD ?? 'Harlem010101';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { status: response.status, body };
}

const login = await request('/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

if (login.status !== 200) {
  console.log(JSON.stringify({ login }, null, 2));
  process.exit(1);
}

const headers = { authorization: `Bearer ${login.body.accessToken}` };
const costCenters = await request('/api/v1/cost-centers?pageSize=100&active=true', { headers });
const paymentTerms = await request('/api/v1/payment-terms?pageSize=100&active=true', { headers });

console.log(JSON.stringify({ loginStatus: login.status, costCenters, paymentTerms }, null, 2));
