import { NativeModules } from 'react-native';

const { ServiceStarter } = NativeModules;

export const startExternalService = () => {
    ServiceStarter.startService();
};

export const stopExternalService = () => {
    ServiceStarter.stopService();
}
