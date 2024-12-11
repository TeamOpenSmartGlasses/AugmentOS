import { NativeModules } from 'react-native';

interface ManagerCoreCommsServiceInterface {
  // startService: () => void;
  // stopService: () => void;
  sendCommandToCore: (jsonString: string) => void;
}

const { ManagerCoreCommsService } = NativeModules;

export default ManagerCoreCommsService as ManagerCoreCommsServiceInterface;
