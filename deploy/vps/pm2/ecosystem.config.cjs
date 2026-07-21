module.exports = {
  apps: [
    {
      name: 'fincontrol-api',
      script: '/opt/fincontrol/current/apps/api/dist/server.js',
      cwd: '/opt/fincontrol/current/apps/api',
      interpreter: '/opt/fincontrol/.local/bin/node',
      node_args: '--env-file=/opt/fincontrol/shared/.env',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      time: true,
    },
  ],
};
