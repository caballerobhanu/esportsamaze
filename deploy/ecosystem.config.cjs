module.exports = {
  apps: [
    {
      name: 'esportsamaze',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/esportsamaze',
      instances: 2, // 2 cluster workers for zero-downtime rolling reload on 4 vCPUs
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
