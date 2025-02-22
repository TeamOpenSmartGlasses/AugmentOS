import { Platform } from "react-native";
import BleManager from 'react-native-ble-manager';
import { check, PERMISSIONS, RESULTS } from "react-native-permissions";

export async function isBluetoothEnabled(): Promise<boolean> {
    const state = await BleManager.checkState();
    return state === 'on';
}

export async function isLocationEnabled(): Promise<boolean> {
    if (Platform.OS === 'android') {
        const result = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        return result === RESULTS.GRANTED;
    } else if (Platform.OS === 'ios') {
        console.log("FIGURE THIS OUT FOR IOS");
        return true;
    }
    console.log("Checking for location on a non-mobile device?");
    return false;
}