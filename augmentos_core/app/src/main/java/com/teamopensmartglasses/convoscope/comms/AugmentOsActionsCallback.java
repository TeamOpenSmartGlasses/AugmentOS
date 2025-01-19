package com.teamopensmartglasses.convoscope.comms;

import org.json.JSONException;
import org.json.JSONObject;

public interface AugmentOsActionsCallback {
    void requestPing();
    void requestStatus();
    void searchForCompatibleDeviceNames(String modelName);
    void connectToWearable(String modelName, String deviceName);
    void disconnectWearable(String wearableId);
    void forgetSmartGlasses();
    void startApp(String packageName);
    void stopApp(String packageName);
    void setSensingEnabled(boolean sensingEnabled);
    void installAppFromRepository(String repository, String packageName);
    void uninstallApp(String packageName);
    void handleNotificationData(JSONObject notificationData);
    void setAuthSecretKey(String authSecretKey);
    void verifyAuthSecretKey();
    void deleteAuthSecretKey();
    void updateAppSettings(String targetApp, JSONObject settings);
    void requestAppInfo(String packageNameToGetDetails);
}
