module.exports = {
  apps: [
    {
      name: 'isaiah-dashboard-manager',
      script: 'packages/apps/dashboard-manager/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'isaiah-dev'
      }
    },
    {
      name: 'isaiah-flash',
      script: 'packages/apps/flash/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'isaiah-dev'
      }
    },
    {
      name: 'isaiah-live-captions',
      script: 'packages/apps/live-captions/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'isaiah-dev'
      }
    },
    {
      name: 'isaiah-miraai',
      script: 'packages/apps/miraai/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'isaiah-dev'
      }
    },
    {
      name: 'isaiah-notify',
      script: 'packages/apps/notify/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'isaiah-dev'
      }
    },
    {
      name: 'isaiah-cloud',
      script: 'packages/cloud/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'isaiah-dev'
      }
    },
  ]
};
