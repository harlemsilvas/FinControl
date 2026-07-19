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

const headers = {
  authorization: `Bearer ${login.body.accessToken}`,
  'content-type': 'application/json',
};

const accountList = await request('/api/v1/bank-accounts?pageSize=20', { headers });
const payables = await request('/api/v1/payables?pageSize=20', { headers });
const openTitle = payables.body.data.find((item) => item.documentNumber === 'LOCAL-OPEN-001');

if (!openTitle) {
  process.stdout.write(`${JSON.stringify({ error: 'Open seed title not found', payables: payables.body }, null, 2)}\n`);
  process.exit(1);
}

const bankAccountId = accountList.body.data[0]?.id;
const duplicates = await request(`/api/v1/payables/duplicates?supplierId=${openTitle.supplierId}&documentNumber=${encodeURIComponent(openTitle.documentNumber)}&documentSeries=${encodeURIComponent(openTitle.documentSeries ?? '')}&installmentNumber=1`, { headers });

const batch = await request('/api/v1/payment-batches', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    batchCode: `LOCAL-BATCH-${Date.now()}`,
    bankAccountId,
    scheduledDate: new Date().toISOString().slice(0, 10),
    notes: 'Lote automatico de validacao local v2',
  }),
});

const batches = await request('/api/v1/payment-batches', { headers });
const afterTitle = await request(`/api/v1/payables/${openTitle.id}`, { headers });

process.stdout.write(`${JSON.stringify({
  loginStatus: login.status,
  duplicateCount: Array.isArray(duplicates.body) ? duplicates.body.length : null,
  batch,
  batches,
  afterTitle,
}, null, 2)}\n`);
