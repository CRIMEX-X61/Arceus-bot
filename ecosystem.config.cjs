module.exports = {
  apps: [
    {
      name: 'arceus-xd',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
