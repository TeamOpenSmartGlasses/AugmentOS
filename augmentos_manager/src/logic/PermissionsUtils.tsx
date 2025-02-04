import { Alert, Permission, PermissionsAndroid, Platform } from "react-native";
import { checkNotificationPermission, NotificationService } from "../augmentos_core_comms/NotificationServiceUtils";
import { checkAndRequestNotificationAccessSpecialPermission, checkNotificationAccessSpecialPermission } from "../utils/NotificationServiceUtils";

export const requestGrantPermissions = async () => {
  // Request permissions on Android
  if (Platform.OS === 'android' && Platform.Version >= 23) {
    PermissionsAndroid.requestMultiple(getAndroidPermissions()).then(async (result) => {
      console.log('Permissions granted:', result);

      //if (await checkNotificationPermission() && !(await NotificationService.isNotificationListenerEnabled())) {
      //  await NotificationService.startNotificationListenerService()
      //}

      const allGranted = Object.values(result).every(
        (value) => value === PermissionsAndroid.RESULTS.GRANTED
      );

      try {
        await checkAndRequestNotificationAccessSpecialPermission();
      } catch (error) {
        console.warn('Notification permission request error:', error);
      }

      if (!allGranted) {
        console.warn('Some permissions were denied:', result);
        // Optionally handle partial denial here
        displayPermissionDeniedWarning();
      }
    })
      .catch((error) => {
        console.error('Error requesting permissions:', error);
      });
  }
}

export const displayPermissionDeniedWarning = async () => {
  Alert.alert(
    'Permissions Required',
    'Some permissions were denied. Please go to Settings and enable all required permissions for the app to function properly.',
    [
      { text: 'OK', style: 'default' }
    ]
  );
}

export const doesHaveAllPermissions = async () => {
  if (Platform.OS == 'android') {
    let perms = getAndroidPermissions();
    let allGranted = true;
    for (let i = 0; i < perms.length; i++) {
      if (!await PermissionsAndroid.check(perms[i])) {
        allGranted = false;
      }
    }

    if(!await checkNotificationAccessSpecialPermission()) {
      allGranted = false;
    }

    return allGranted;
  } else if (Platform.OS == 'ios') {
    // TODO: ios Perm check
    return true;
  }
  return false;
};

export const getAndroidPermissions = (): Permission[] => {
  const list = [];
  if (Platform.OS === 'android') {
    if (Platform.Version >= 23) {
      list.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }
    if (Platform.Version >= 31) {
      list.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      list.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      list.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
    }
    if (Platform.Version >= 33) {
      list.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
  }
  return list as Permission[];
}
