import { NativeModules, NativeEventEmitter } from 'react-native';

const { NotificationServiceUtils } = NativeModules;

export const isAndroidNotificationListenerEnabled = async (): Promise<boolean> => {
  return await NotificationServiceUtils.isNotificationListenerEnabled();
};

export const startAndroidNotificationListenerService = async (): Promise<string> => {
  return await NotificationServiceUtils.startNotificationListenerService();
};

export const stopAndroidNotificationListenerService = async (): Promise<string> => {
  return await NotificationServiceUtils.stopNotificationListenerService();
};

export const listenForNotifications = (callback: (notification: string) => void) => {
  const eventEmitter = new NativeEventEmitter(NotificationServiceUtils);
  const subscription = eventEmitter.addListener('onNotificationPosted', callback);
  return () => subscription.remove();
};
