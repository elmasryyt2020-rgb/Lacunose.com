/**
 * PM2 ecosystem for Lacunose backend.
 *
 * Run:
 *   pm2 start infra/ecosystem.config.cjs
 *   pm2 save && pm2 startup systemd
 *
 * All apps read .env from repo root via dotenv inside the tsx entrypoints.
 */
module.exports = {
  apps: [
    {
      name: 'edge-fn',
      script: 'tsx',
      args: 'src/edge/app.ts',
      cwd: '/home/deploy/lacunose-backend',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
      error_file: '/home/deploy/.pm2/logs/edge-fn.err.log',
      out_file: '/home/deploy/.pm2/logs/edge-fn.out.log',
      time: true,
    },
    {
      name: 'worker-ingest',
      script: 'tsx',
      args: 'src/workers/ingest.ts',
      cwd: '/home/deploy/lacunose-backend',
      instances: 2,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'worker-parse',
      script: 'tsx',
      args: 'src/workers/parse.ts',
      cwd: '/home/deploy/lacunose-backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '384M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'worker-embed',
      script: 'tsx',
      args: 'src/workers/embed.ts',
      cwd: '/home/deploy/lacunose-backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '384M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'worker-gap',
      script: 'tsx',
      args: 'src/workers/gap.ts',
      cwd: '/home/deploy/lacunose-backend',
      instances: 2,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'worker-critique',
      script: 'tsx',
      args: 'src/workers/critique.ts',
      cwd: '/home/deploy/lacunose-backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '384M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'worker-support',
      script: 'tsx',
      args: 'src/workers/support.ts',
      cwd: '/home/deploy/lacunose-backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '256M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'web-waitlist',
      script: 'npm',
      args: 'start',
      cwd: '/home/deploy/lacunose-website',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      error_file: '/home/deploy/.pm2/logs/web-waitlist.err.log',
      out_file: '/home/deploy/.pm2/logs/web-waitlist.out.log',
      time: true,
    },
  ],
};
