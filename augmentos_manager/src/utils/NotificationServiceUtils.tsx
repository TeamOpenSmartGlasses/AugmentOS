import { Alert, NativeModules, Platform } from 'react-native';

const { NotificationAccess } = NativeModules;

export async function checkNotificationAccessSpecialPermission() {
  if (Platform.OS !== 'android') {
    return false;
  }

  return await NotificationAccess.hasNotificationAccess();
}

export async function checkAndRequestNotificationAccessSpecialPermission() {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const hasAccess = await NotificationAccess.hasNotificationAccess();
    if (!hasAccess) {
      Alert.alert(
        'Enable Notification Access',
        'We need permission to read your phone notifications and display them on the glasses. ' +
         'On the next screen, please find \"AugmentOS Manager\" in the list and toggle it on.',
        [
          {
            text: 'OK, Take Me There',
            onPress: () => {
              NotificationAccess.requestNotificationAccess()
                .then(() => {
                  console.log("YAY THE THING DID THE THING")
                })
                .catch((err: any) => {
                  console.error('Error opening notification settings:', err);
                });
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true },
      );
    }
  } catch (error) {
    console.error('Failed to check notification listener permission:', error);
    throw error;
  }
}
