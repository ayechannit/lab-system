// PM2 process file for the EC2 deployment.
//   api.shwehealth.com -> Nginx -> lab-backend (PORT from apps/lab_backend/.env)
//   shwehealth.com     -> Nginx -> lab-admin-web (port 4173, static SPA build)
//
// Usage (from the repo root on the server):
//   pm2 start ecosystem.config.js
//   pm2 reload ecosystem.config.js   # after pulling new code
module.exports = {
  apps: [
    {
      name: 'lab-backend',
      // cwd matters: dotenv reads apps/lab_backend/.env from the working directory.
      cwd: './apps/lab_backend',
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      // PORT is deliberately not set here: dotenv never overrides an existing env var,
      // so setting it here would silently win over PORT in apps/lab_backend/.env.
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'lab-admin-web',
      // PM2's built-in static server; serves the Vite build with SPA fallback to index.html.
      script: 'serve',
      env: {
        PM2_SERVE_PATH: './apps/lab_admin_web/dist',
        PM2_SERVE_PORT: 4173,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html',
      },
    },
  ],
};
