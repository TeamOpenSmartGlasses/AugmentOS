import { NativeModule, NativeModules } from 'react-native';

interface ManagerCoreCommsServiceInterface extends NativeModule {
  startService: () => void;
  stopService: () => void;
  isServiceRunning: () => boolean;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
  sendCommandToCore: (jsonString: string) => void;
}

const { ManagerCoreCommsService } = NativeModules;

export default ManagerCoreCommsService as ManagerCoreCommsServiceInterface;
