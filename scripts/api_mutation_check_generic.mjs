import process from 'node:process';

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
const loginEmail = process.env.BOOTSTRAP_MASTER_EMAIL ?? 'master@example.com';
const loginPassword = process.env.BOOTSTRAP_MASTER_PASSWORD ?? 'Harlem010101';
const titlePrefix = process.env.SEED_TITLE_PREFIX ?? 'LOCAL';
const batchPrefix = process.env.BATCH_PREFIX ?? titlePrefix;

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
const openTitle = payables.body.data.find((item) => item.documentNumber === `${titlePrefix}-TIT-001` || item.documentNumber === `${titlePrefix}-OPEN-001`);

if (!openTitle) {
  process.stdout.write(`${JSON.stringify({ error: 'Open seed title not found', titlePrefix, payables: payables.body }, null, 2)}\n`);
  process.exit(1);
}

const bankAccountId = accountList.body.data[0]?.id;
if (!bankAccountId) {
  process.stdout.write(`${JSON.stringify({ error: 'No bank account available for mutation test', accounts: accountList.body }, null, 2)}\n`);
  process.exit(1);
}

const duplicates = await request(`/api/v1/payables/duplicates?supplierId=${openTitle.supplierId}&documentNumber=${encodeURIComponent(openTitle.documentNumber)}&documentSeries=${encodeURIComponent(openTitle.documentSeries ?? '')}&installmentNumber=1`, { headers });
const detailsBefore = await request(`/api/v1/payables/${openTitle.id}`, { headers });
const installmentId = detailsBefore.body.installments?.[0]?.id;
const paymentMethodId = detailsBefore.body.installments?.[0]?.paymentMethodId;

if (!installmentId || !paymentMethodId) {
  process.stdout.write(`${JSON.stringify({ error: 'No installment available for mutation test', detailsBefore }, null, 2)}\n`);
  process.exit(1);
}

const batch = await request('/api/v1/payment-batches', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    batchCode: `${batchPrefix}-BATCH-${Date.now()}`,
    bankAccountId,
    scheduledDate: new Date().toISOString().slice(0, 10),
    notes: `Lote automatico de validacao ${titlePrefix}`,
  }),
});

const payment = await request('/api/v1/payments', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    installmentId,
    batchId: batch.status === 201 ? batch.body.id : null,
    bankAccountId,
    paymentMethodId,
    paymentDate: new Date().toISOString().slice(0, 10),
    principalAmount: 50,
    transactionNumber: `${batchPrefix}-PAY-${Date.now()}`,
  }),
});

const batches = await request('/api/v1/payment-batches', { headers });
const afterTitle = await request(`/api/v1/payables/${openTitle.id}`, { headers });

process.stdout.write(`${JSON.stringify({
  titlePrefix,
  loginStatus: login.status,
  duplicateCount: Array.isArray(duplicates.body) ? duplicates.body.length : null,
  batch,
  payment,
  batches,
  afterTitle,
}, null, 2)}\n`);
