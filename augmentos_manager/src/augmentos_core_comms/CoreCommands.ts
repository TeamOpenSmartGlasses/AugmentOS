import { CoreTransport } from './CoreTransport';

/**
 * Send a 'ping' command to check if the core is alive.
 */
export async function sendHeartbeat(transport: CoreTransport) {
  await transport.sendData({ command: 'ping' });
}

/**
 * Request the status from the core (e.g. glasses, battery, etc.).
 */
export async function sendRequestStatus(transport: CoreTransport) {
  await transport.sendData({ command: 'request_status' });
}

/**
 * Search for devices by a specific model name.
 */
export async function sendSearchForCompatibleDeviceNames(
  transport: CoreTransport,
  modelName: string,
) {
  await transport.sendData({
    command: 'search_for_compatible_device_names',
    params: {
      model_name: modelName,
    },
  });
}

/**
 * Attempt to connect a wearable by model name (and optionally a device name).
 */
export async function sendConnectWearable(
  transport: CoreTransport,
  modelName: string,
  deviceName: string = '',
) {
  await transport.sendData({
    command: 'connect_wearable',
    params: {
      model_name: modelName,
      device_name: deviceName,
    },
  });
}

/**
 * Send a phone notification to the core (to be displayed on connected glasses, etc.).
 */
export async function sendPhoneNotification(
  transport: CoreTransport,
  appName: string = '',
  title: string = '',
  text: string = '',
  timestamp: number = -1,
  uuid: string = '',
) {
  await transport.sendData({
    command: 'phone_notification',
    params: {
      appName,
      title,
      text,
      timestamp,
      uuid,
    },
  });
}

/**
 * Disconnect any currently connected wearable device (smart glasses, etc.).
 */
export async function sendDisconnectWearable(transport: CoreTransport) {
  await transport.sendData({ command: 'disconnect_wearable' });
}

/**
 * Forget any previously paired smart glasses so they won't auto-reconnect.
 */
export async function sendForgetSmartGlasses(transport: CoreTransport) {
  await transport.sendData({ command: 'forget_smart_glasses' });
}

/**
 * Toggle the simulated (virtual) wearable on/off in the Core.
 */
export async function sendToggleVirtualWearable(
  transport: CoreTransport,
  enabled: boolean,
) {
  await transport.sendData({
    command: 'enable_virtual_wearable',
    params: { enabled },
  });
}

/**
 * Toggle sensor collection (e.g. camera, mic, etc.) in the Core.
 */
export async function sendToggleSensing(
  transport: CoreTransport,
  enabled: boolean,
) {
  await transport.sendData({
    command: 'enable_sensing',
    params: { enabled },
  });
}

/**
 * Force usage of the onboard microphone (Core device's mic) rather than an external.
 */
export async function sendToggleForceCoreOnboardMic(
  transport: CoreTransport,
  enabled: boolean,
) {
  await transport.sendData({
    command: 'force_core_onboard_mic',
    params: { enabled },
  });
}

/**
 * Enable or disable the contextual dashboard.
 */
export async function sendToggleContextualDashboard(
  transport: CoreTransport,
  enabled: boolean,
) {
  await transport.sendData({
    command: 'enable_contextual_dashboard',
    params: { enabled },
  });
}

/**
 * Update the brightness and auto-light settings for the connected glasses.
 */
export async function setGlassesBrightnessMode(
  transport: CoreTransport,
  brightness: number,
  autoLight: boolean,
) {
  await transport.sendData({
    command: 'update_glasses_brightness',
    params: {
      brightness,
      autoLight,
    },
  });
}

/**
 * Update the head-up angle for the connected glasses.
 */
export async function setGlassesHeadUpAngle(
  transport: CoreTransport,
  headUpAngle: number,
) {
  await transport.sendData({
    command: 'update_glasses_headUp_angle',
    params: {
      headUpAngle,
    },
  });
}

/**
 * Start (launch) an app by package name on the Core device.
 */
export async function startAppByPackageName(
  transport: CoreTransport,
  packageName: string,
) {
  await transport.sendData({
    command: 'start_app',
    params: {
      target: packageName,
      repository: packageName,
    },
  });
}

/**
 * Stop (kill) a running app by package name on the Core device.
 */
export async function stopAppByPackageName(
  transport: CoreTransport,
  packageName: string,
) {
  await transport.sendData({
    command: 'stop_app',
    params: { target: packageName },
  });
}

/**
 * Install an app from the default repository, specifying its package name.
 */
export async function installAppByPackageName(
  transport: CoreTransport,
  packageName: string,
) {
  await transport.sendData({
    command: 'install_app_from_repository',
    params: { target: packageName },
  });
}

/**
 * Set the authentication secret key for the user in the Core's internal storage.
 */
export async function setAuthenticationSecretKey(
  transport: CoreTransport,
  userId: string,
  authSecretKey: string,
) {
  await transport.sendData({
    command: 'set_auth_secret_key',
    params: {
      userId,
      authSecretKey,
    },
  });
}

/**
 * Verify that the saved authentication secret key is valid.
 */
export async function verifyAuthenticationSecretKey(
  transport: CoreTransport,
) {
  await transport.sendData({
    command: 'verify_auth_secret_key',
  });
}

/**
 * Delete any stored authentication secret key from the Core.
 */
export async function deleteAuthenticationSecretKey(
  transport: CoreTransport,
) {
  await transport.sendData({
    command: 'delete_auth_secret_key',
  });
}

/**
 * Request details about a given app (by package name).
 */
export async function sendRequestAppDetails(
  transport: CoreTransport,
  packageName: string,
) {
  await transport.sendData({
    command: 'request_app_info',
    params: {
      target: packageName,
    },
  });
}

/**
 * Update settings (key-value pairs) for a given app on the Core.
 */
export async function sendUpdateAppSetting(
  transport: CoreTransport,
  packageName: string,
  settingsDeltaObj: any,
) {
  await transport.sendData({
    command: 'update_app_settings',
    params: {
      target: packageName,
      settings: settingsDeltaObj,
    },
  });
}

/**
 * Uninstall an app by package name.
 */
export async function sendUninstallApp(
  transport: CoreTransport,
  packageName: string,
) {
  await transport.sendData({
    command: 'uninstall_app',
    params: {
      target: packageName,
    },
  });
}
