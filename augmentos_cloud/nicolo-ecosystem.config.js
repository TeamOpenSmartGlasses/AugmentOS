module.exports = {
  apps: [
    {
      name: 'nicolo-dashboard-manager',
      script: 'packages/apps/dashboard-manager/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'nicolo-dev'
      }
    },
    {
      name: 'nicolo-flash',
      script: 'packages/apps/flash/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'nicolo-dev'
      }
    },
    {
      name: 'nicolo-live-captions',
      script: 'packages/apps/live-captions/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'nicolo-dev'
      }
    },
    {
      name: 'nicolo-miraai',
      script: 'packages/apps/miraai/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'nicolo-dev'
      }
    },
    {
      name: 'nicolo-notify',
      script: 'packages/apps/notify/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'nicolo-dev'
      }
    },
    {
      name: 'nicolo-cloud',
      script: 'packages/cloud/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'nicolo-dev'
      }
    },
  ]
};
