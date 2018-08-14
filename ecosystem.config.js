module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [

    // First application
    {
      name: 'F.telegram',
      script: 'F.telegram/src/index.js',
      "exec_mode": "cluster",
      env: {
        COMMON_VARIABLE: 'true'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'D.run',
      script: 'D.run/src/index.js',
      "exec_mode": "cluster",
      env: {
        COMMON_VARIABLE: 'true'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'C.publish ',
      script: 'C.publish/src/index.js',
      "exec_mode": "cluster",
      env: {
        COMMON_VARIABLE: 'true'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'B.build',
      script: 'B.build/src/index.js',
      "exec_mode": "cluster",
      env: {
        COMMON_VARIABLE: 'true',
        "DEBUG": "*"
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'A.compile',
      script: 'A.compile/src/index.js',
      "exec_mode": "cluster",
      env: {
        DEBUG: '*',
        SYMBOLS_FILTER: 'btc$',
        // SYMBOLS_FILTER: '(eth|xrp|bcc|ltc|eos|ada|xlm|miota|trx|neo|tusd|bcn|xmr|dash|xem|ven|bnb|etc|qtum|ont)btc$',
        EXCHANGE: 'binance',
        TIMEFRAMES: '60,240'
      },
      env_production: {
        NODE_ENV: 'production'
      }
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
      repo: 'https://github.com/modestemax/m24-crypto-micro-project',
      path: '/home/ubuntu/m24/prod',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    },
    dev: {
      // user: 'node',
      // host: '212.83.163.1',
      // ref: 'origin/master',
      // repo: 'git@github.com:repo.git',
      // path: '/var/www/development',
      // 'post-deploy': 'npm run install && pm2 reload ecosystem.config.js --env dev',
      // env: {
      //   NODE_ENV: 'dev'
      // }
    }
  }
};
