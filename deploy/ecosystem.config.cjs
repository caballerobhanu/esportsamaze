module.exports = {
  apps: [
    {
      name: 'esportsamaze',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/esportsamaze',
      instances: 3, // 3 cluster workers leave 1 dedicated core for PostgreSQL + Nginx on 4 vCPUs
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1500M',
      node_args: '--max-old-space-size=1536',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
