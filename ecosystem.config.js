module.exports = {
  apps: [
    {
      name: 'eubi-server',
      script: 'server.js',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'cf-tunnel',
      // Full path because cloudflared is not on PATH in PM2's environment
      script: 'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
      args: 'tunnel run',
      // cloudflared finds config.yml automatically from ~/.cloudflared/
      autorestart: true,
      max_restarts: 20,
      restart_delay: 3000,
      out_file: './logs/tunnel-out.log',
      error_file: './logs/tunnel-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};

