module.exports = {
  apps: [
    {
      name: 'staging-dashboard-manager',
      script: 'packages/apps/dashboard-manager/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging'
      }
    },
    {
      name: 'staging-flash',
      script: 'packages/apps/flash/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging'
      }
    },
    {
      name: 'staging-live-captions',
      script: 'packages/apps/live-captions/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging'
      }
    },
    {
      name: 'staging-miraai',
      script: 'packages/apps/miraai/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging'
      }
    },
    {
      name: 'staging-notify',
      script: 'packages/apps/notify/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging'
      }
    },
    {
      name: 'staging-live-translation',
      script: 'packages/apps/live-translation/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging'
      }
    },
    {
      name: 'staging-cloud',
      script: 'packages/cloud/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging'
      }
    },
  ]
};
