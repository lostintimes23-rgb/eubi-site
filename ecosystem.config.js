module.exports = {
  apps: [
    {
      name: 'eubi-server',
      script: 'server.js',
      cwd: __dirname,
      watch: false,          // don't restart on file changes in production
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Restart automatically if the process crashes
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      // Log output
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};

