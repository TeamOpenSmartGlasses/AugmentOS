// CoreConnectionManager.ts

import { BLECoreTransport } from './BLECoreTransport';
import { LocalCoreTransport } from './LocalCoreTransport';
import { CoreTransport } from './CoreTransport';

import GlobalEventEmitter from '../logic/GlobalEventEmitter';
import { openCorePermissionsActivity } from '../bridge/CoreServiceStarter';

// (Optional) If you had a function to check if local core is installed
// import { isAugmentOsCoreInstalled } from '../augmentos_core_comms/CoreServiceStarter';

export class CoreConnectionManager {
  // --- Singleton setup ---
  private static instance: CoreConnectionManager | null = null;

  public static getInstance(): CoreConnectionManager {
    if (!CoreConnectionManager.instance) {
      CoreConnectionManager.instance = new CoreConnectionManager();
    }
    return CoreConnectionManager.instance;
  }

  // --- Transports & State ---
  private bleTransport: BLECoreTransport;
  private localTransport: LocalCoreTransport;

  /**
   * If true, we route outgoing commands to the local transport;
   * if false, we route them to the BLE transport.
   */
  private useLocal = false;

  /**
   * If we are currently awaiting a response, store the promise here so
   * we avoid stacking multiple validations.
   */
  private validationInProgress: Promise<boolean> | null = null;

  // Used internally to manually resolve/reject that promise:
  private _validationResolve: ((val: boolean) => void) | null = null;
  private _validationReject: ((err: any) => void) | null = null;

  // Make constructor private so only the singleton accessor can instantiate.
  private constructor() {
    this.bleTransport = new BLECoreTransport();
    this.localTransport = new LocalCoreTransport();
  }

  /**
   * Initialize both transports (start BLE manager, local manager).
   * Also register "onData" handlers for both, so we can parse their incoming data.
   */
  public async initialize(): Promise<void> {
    await this.bleTransport.initialize();
    await this.localTransport.initialize();

    this.bleTransport.onData((data) => this.handleIncomingData(data));
    this.localTransport.onData((data) => this.handleIncomingData(data));
  }

  /**
   * Set whether to use Local or BLE transport for outgoing commands.
   */
  public setTransportMode(mode: 'local' | 'ble') {
    this.useLocal = (mode === 'local');
    console.log(`CoreConnectionManager: setTransportMode -> ${mode}`);
  }

  /**
   * Decide which transport to use for all "send" calls, based on the current mode.
   */
  private getTransport(): CoreTransport {
    return this.useLocal ? this.localTransport : this.bleTransport;
  }

  /**
   * Connect specifically to the BLE device (e.g. scanning for "AugOS").
   * If you want to automatically switch to BLE mode once connected, you can do so.
   */
  public async connectBLE(): Promise<void> {
    await this.bleTransport.connect();
  }

  /**
   * Connect local (on the same device). Usually just sets it "connected."
   */
  public async connectLocal(): Promise<void> {
    await this.localTransport.connect();
  }

  /**
   * Disconnect from both. If you want to only disconnect BLE or local,
   * you can also add separate methods.
   */
  public async disconnectAll(): Promise<void> {
    await this.bleTransport.disconnect();
    await this.localTransport.disconnect();
  }

  /**
   * Return true if either transport is connected. Adjust if you only
   * care about the "active" transport, etc.
   */
  public isConnected(): boolean {
    return (this.bleTransport.isConnected() || this.localTransport.isConnected());
  }

  // ------------------------------------------------------------------
  // "High-Level Command" Methods
  // (Replicating the logic from CoreCommands.ts so you can do:
  //   CoreConnectionManager.getInstance().sendRequestAppDetails(...)
  // without changing the rest of your code too much.)
  // ------------------------------------------------------------------

  public async sendHeartbeat(): Promise<void> {
    await this.getTransport().sendData({ command: 'ping' });
  }

  public async sendRequestStatus(): Promise<void> {
    await this.getTransport().sendData({ command: 'request_status' });
  }

  public async sendSearchForCompatibleDeviceNames(modelName: string): Promise<void> {
    await this.getTransport().sendData({
      command: 'search_for_compatible_device_names',
      params: { model_name: modelName },
    });
  }

  public async sendConnectWearable(modelName: string, deviceName = ''): Promise<void> {
    await this.getTransport().sendData({
      command: 'connect_wearable',
      params: { model_name: modelName, device_name: deviceName },
    });
  }

  public async sendPhoneNotification(
    appName = '',
    title = '',
    text = '',
    timestamp = -1,
    uuid = '',
  ): Promise<void> {
    await this.getTransport().sendData({
      command: 'phone_notification',
      params: { appName, title, text, timestamp, uuid },
    });
  }

  public async sendDisconnectWearable(): Promise<void> {
    await this.getTransport().sendData({ command: 'disconnect_wearable' });
  }

  public async sendForgetSmartGlasses(): Promise<void> {
    await this.getTransport().sendData({ command: 'forget_smart_glasses' });
  }

  public async sendToggleVirtualWearable(enabled: boolean): Promise<void> {
    await this.getTransport().sendData({
      command: 'enable_virtual_wearable',
      params: { enabled },
    });
  }

  public async sendToggleSensing(enabled: boolean): Promise<void> {
    await this.getTransport().sendData({
      command: 'enable_sensing',
      params: { enabled },
    });
  }

  public async sendToggleForceCoreOnboardMic(enabled: boolean): Promise<void> {
    await this.getTransport().sendData({
      command: 'force_core_onboard_mic',
      params: { enabled },
    });
  }

  public async sendToggleContextualDashboard(enabled: boolean): Promise<void> {
    await this.getTransport().sendData({
      command: 'enable_contextual_dashboard',
      params: { enabled },
    });
  }

  public async setGlassesBrightnessMode(brightness: number, autoLight: boolean): Promise<void> {
    await this.getTransport().sendData({
      command: 'update_glasses_brightness',
      params: { brightness, autoLight },
    });
  }

  public async setGlassesHeadUpAngle(headUpAngle: number): Promise<void> {
    await this.getTransport().sendData({
      command: 'update_glasses_headUp_angle',
      params: { headUpAngle },
    });
  }

  public async startAppByPackageName(packageName: string): Promise<void> {
    await this.getTransport().sendData({
      command: 'start_app',
      params: { target: packageName, repository: packageName },
    });
  }

  public async stopAppByPackageName(packageName: string): Promise<void> {
    await this.getTransport().sendData({
      command: 'stop_app',
      params: { target: packageName },
    });
  }

  public async installAppByPackageName(packageName: string): Promise<void> {
    await this.getTransport().sendData({
      command: 'install_app_from_repository',
      params: { target: packageName },
    });
  }

  public async setAuthenticationSecretKey(userId: string, authSecretKey: string): Promise<void> {
    await this.getTransport().sendData({
      command: 'set_auth_secret_key',
      params: { userId, authSecretKey },
    });
  }

  public async verifyAuthenticationSecretKey(): Promise<void> {
    await this.getTransport().sendData({
      command: 'verify_auth_secret_key',
    });
  }

  public async deleteAuthenticationSecretKey(): Promise<void> {
    await this.getTransport().sendData({
      command: 'delete_auth_secret_key',
    });
  }

  public async sendRequestAppDetails(packageName: string): Promise<void> {
    await this.getTransport().sendData({
      command: 'request_app_info',
      params: { target: packageName },
    });
  }

  public async sendUpdateAppSetting(packageName: string, settingsDeltaObj: any): Promise<void> {
    await this.getTransport().sendData({
      command: 'update_app_settings',
      params: { target: packageName, settings: settingsDeltaObj },
    });
  }

  public async sendUninstallApp(packageName: string): Promise<void> {
    await this.getTransport().sendData({
      command: 'uninstall_app',
      params: { target: packageName },
    });
  }

  // ------------------------------------------------------------------
  // "validateResponseFromCore" Mechanism
  // ------------------------------------------------------------------

  /**
   * Allows you to wait for ANY incoming data from the core within a certain
   * timeout window. If no data arrives, we throw an error. If you want to
   * wait for *specific* data, you'd need more logic here.
   */
  public async validateResponseFromCore(timeoutMs: number = 4500): Promise<boolean> {
    // If we're already validating or (optionally) if the core is installed, skip
    // if (await isAugmentOsCoreInstalled()) { ... } // If you want to short-circuit
    if (this.validationInProgress) {
      return this.validationInProgress;
    }

    this.validationInProgress = new Promise<boolean>((resolve, reject) => {
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          // No data arrived in time:
          GlobalEventEmitter.emit('PUCK_DISCONNECTED', { message: 'Response timeout.' });
          reject(new Error('Response timeout.'));
        }
      }, timeoutMs);

      this._validationResolve = (val: boolean) => {
        resolved = true;
        clearTimeout(timer);
        resolve(val);
      };
      this._validationReject = (err: any) => {
        resolved = true;
        clearTimeout(timer);
        reject(err);
      };
    });

    // Once the promise is done, reset
    this.validationInProgress.finally(() => {
      this.validationInProgress = null;
      this._validationResolve = null;
      this._validationReject = null;
    });

    return this.validationInProgress;
  }

  // Internal calls to resolve or reject the validation promise
  private resolveValidationPromise(success: boolean) {
    if (this._validationResolve) {
      this._validationResolve(success);
    }
  }
  private rejectValidationPromise(err: any) {
    if (this._validationReject) {
      this._validationReject(err);
    }
  }

  // ------------------------------------------------------------------
  // Incoming Data Parsing
  // ------------------------------------------------------------------

  /**
   * Called by each transport's onData callback. We parse the JSON for known
   * fields and emit events or handle special logic. If there's a validation
   * promise in progress, we resolve it upon receiving ANY data (or you can be
   * more specific if needed).
   */
  private handleIncomingData(jsonData: any) {
    if (!jsonData) return;

    console.log("HANDLING COMINNG DAT!:")
    console.log(JSON.stringify(jsonData));

    try {
      // This is basically the parseDataFromAugmentOsCore logic you had
      if ('status' in jsonData) {
        GlobalEventEmitter.emit('statusUpdateReceived', jsonData);
      } else if ('glasses_display_event' in jsonData) {
        GlobalEventEmitter.emit('GLASSES_DISPLAY_EVENT', jsonData.glasses_display_event);
      } else if ('ping' in jsonData) {
        // Possibly do nothing
      } else if ('notify_manager' in jsonData) {
        const nm = jsonData.notify_manager;
        GlobalEventEmitter.emit('SHOW_BANNER', { message: nm.message, type: nm.type });
      } else if ('compatible_glasses_search_result' in jsonData) {
        GlobalEventEmitter.emit('COMPATIBLE_GLASSES_SEARCH_RESULT', jsonData.compatible_glasses_search_result);
      } else if ('compatible_glasses_search_stop' in jsonData) {
        GlobalEventEmitter.emit('COMPATIBLE_GLASSES_SEARCH_STOP', jsonData.compatible_glasses_search_stop);
      } else if ('app_info' in jsonData) {
        GlobalEventEmitter.emit('APP_INFO_RESULT', { appInfo: jsonData.app_info });
      } else if ('app_is_downloaded' in jsonData) {
        GlobalEventEmitter.emit('APP_IS_DOWNLOADED_RESULT', { appIsDownloaded: jsonData.app_is_downloaded });
      } else if ('need_permissions' in jsonData) {
        console.log("CoreConnectionManager: got 'need_permissions' -> openCorePermissionsActivity");
        openCorePermissionsActivity();
      } else if ('auth_error' in jsonData) {
        GlobalEventEmitter.emit('AUTH_ERROR');
      }
      // Add more keys as needed...
    } catch (e) {
      console.error('CoreConnectionManager: error parsing incoming data:', e);
      GlobalEventEmitter.emit('STATUS_PARSE_ERROR');
    }

    // If we are waiting for ANY response, fulfill it
    if (this.validationInProgress) {
      this.resolveValidationPromise(true);
    }
  }
}
