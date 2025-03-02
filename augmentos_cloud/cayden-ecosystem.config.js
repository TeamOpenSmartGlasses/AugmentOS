module.exports = {
  apps: [
    {
      name: 'cayden-dashboard-manager',
      script: 'packages/apps/dashboard-manager/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'cayden-dev'
      }
    },
    {
      name: 'cayden-flash',
      script: 'packages/apps/flash/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'cayden-dev'
      }
    },
    {
      name: 'cayden-live-captions',
      script: 'packages/apps/live-captions/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'cayden-dev'
      }
    },
    {
      name: 'cayden-miraai',
      script: 'packages/apps/miraai/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'cayden-dev'
      }
    },
    {
      name: 'cayden-notify',
      script: 'packages/apps/notify/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'cayden-dev'
      }
    },
    {
      name: 'cayden-cloud',
      script: 'packages/cloud/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'cayden-dev'
      }
    },
  ]
};
