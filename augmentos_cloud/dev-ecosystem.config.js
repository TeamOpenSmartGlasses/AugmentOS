module.exports = {
  apps: [
    {
      name: 'dev-dashboard-manager',
      script: 'packages/apps/dashboard-manager/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'dev-flash',
      script: 'packages/apps/flash/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'dev-live-captions',
      script: 'packages/apps/live-captions/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'dev-miraai',
      script: 'packages/apps/miraai/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'dev-notify',
      script: 'packages/apps/notify/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'dev-translation',
      script: 'packages/apps/live-translation/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'dev-cloud',
      script: 'packages/cloud/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      }
    },
  ]
};
