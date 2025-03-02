module.exports = {
  apps: [
    {
      name: 'israelov-dashboard-manager',
      script: 'packages/apps/dashboard-manager/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'israelov-dev'
      }
    },
    {
      name: 'israelov-flash',
      script: 'packages/apps/flash/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'israelov-dev'
      }
    },
    {
      name: 'israelov-live-captions',
      script: 'packages/apps/live-captions/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'israelov-dev'
      }
    },
    {
      name: 'israelov-miraai',
      script: 'packages/apps/miraai/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'israelov-dev'
      }
    },
    {
      name: 'israelov-notify',
      script: 'packages/apps/notify/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'israelov-dev'
      }
    },
    {
      name: 'israelov-cloud',
      script: 'packages/cloud/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'israelov-dev'
      }
    },
  ]
};
