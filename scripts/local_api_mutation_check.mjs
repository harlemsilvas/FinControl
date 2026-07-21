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

const payables = await request('/api/v1/payables?pageSize=20', { headers });
const openTitle = payables.body.data.find((item) => item.documentNumber === 'LOCAL-OPEN-001');
const partialTitle = payables.body.data.find((item) => item.documentNumber === 'LOCAL-PARTIAL-001');

if (!openTitle || !partialTitle) {
  process.stdout.write(`${JSON.stringify({ error: 'Seed data not found', payables: payables.body }, null, 2)}\n`);
  process.exit(1);
}

const openDetails = await request(`/api/v1/payables/${openTitle.id}`, { headers });
const duplicates = await request(`/api/v1/payables/duplicates?supplierId=${openTitle.supplierId}&documentNumber=${encodeURIComponent(openTitle.documentNumber)}&documentSeries=${encodeURIComponent(openTitle.documentSeries ?? '')}&installmentNumber=1`, { headers });

const batchCode = `LOCAL-BATCH-${Date.now()}`;
const batch = await request('/api/v1/payment-batches', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    batchCode,
    bankAccountId: openDetails.body.installments[0] ? openDetails.body.bankAccountId ?? openDetails.body.installments[0].bankAccountId ?? null : null,
    scheduledDate: new Date().toISOString().slice(0, 10),
    notes: 'Lote automatico de validacao local',
  }),
});

const accountList = await request('/api/v1/bank-accounts?pageSize=20', { headers });
const bankAccountId = accountList.body.data[0]?.id;

const payment = await request('/api/v1/payments', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    installmentId: openDetails.body.installments[0].id,
    batchId: batch.status === 201 ? batch.body.id : null,
    bankAccountId,
    paymentMethodId: openDetails.body.installments[0].paymentMethodId,
    paymentDate: new Date().toISOString().slice(0, 10),
    principalAmount: 100,
    transactionNumber: `LOCAL-PAY-${Date.now()}`,
  }),
});

const afterPayment = await request(`/api/v1/payables/${openTitle.id}`, { headers });

process.stdout.write(`${JSON.stringify({
  loginStatus: login.status,
  duplicateCount: Array.isArray(duplicates.body) ? duplicates.body.length : null,
  batch,
  payment,
  afterPayment,
  partialReference: partialTitle.id,
}, null, 2)}\n`);
