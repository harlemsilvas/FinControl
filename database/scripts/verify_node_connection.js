const net = require('node:net');

const host = process.env.DB_HOST || '127.0.0.1';
const port = Number(process.env.DB_PORT || 5434);
const socket = net.createConnection({ host, port });

socket.setTimeout(5000);
socket.once('connect', () => {
  console.log(`PASS: Node.js reached PostgreSQL at ${host}:${port}`);
  socket.end();
});
socket.once('timeout', () => {
  console.error(`FAIL: connection to ${host}:${port} timed out`);
  socket.destroy();
  process.exitCode = 1;
});
socket.once('error', (error) => {
  console.error(`FAIL: connection to ${host}:${port}: ${error.message}`);
  process.exitCode = 1;
});
