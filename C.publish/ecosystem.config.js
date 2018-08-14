module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
      {
          name: 'publish',
          script: 'index.js',
          "exec_mode": "cluster",
          cwd: 'src',
          env: {
              DEBUG: '*',             
          },
      },
  ],

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */
  deploy: {
      production: {
          "key": "/home/max/.ssh/keysvirginia.pem",
          user: 'ubuntu',
          host: '34.229.181.14',
          ref: 'origin/master',
          repo: ' https://github.com/modestemax/m24_trading_bot.git',
          path: '/home/ubuntu/bot/prod',
          'post-deploy': 'pm2 reload ecosystem.config.js --env production'
      },
      dev: {
          "key": "/home/max/.ssh/keysvirginia.pem",
          user: 'ubuntu',
          host: '34.229.181.14',
          ref: 'origin/master',
          repo: ' https://github.com/modestemax/m24_trading_bot.git',
          path: '/home/ubuntu/bot/dev',
          'post-deploy': 'pm2 reload ecosystem.config.js --env dev',
          // 'post-deploy': 'pm2 reload ecosystem.config.js --env dev',
          // 'post-deploy': 'pm2 restart bot_btc_val_46',
          env: {
              NODE_ENV: 'dev'
          }
      }
  }
};
