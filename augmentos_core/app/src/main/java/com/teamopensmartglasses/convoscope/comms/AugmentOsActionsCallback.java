package com.teamopensmartglasses.convoscope.comms;

import org.json.JSONObject;

public interface AugmentOsActionsCallback {
    void requestPing();
    void requestStatus();
    void connectToWearable(String modelName);
    void disconnectWearable(String wearableId);
    void forgetSmartGlasses();
    void startApp(String packageName);
    void stopApp(String packageName);
    void installAppFromRepository(JSONObject repoAppData);
    void uninstallApp(String packageName);
    void handleNotificationData(JSONObject notificationData);
    void setAuthSecretKey(String authSecretKey);
    void verifyAuthSecretKey();
    void deleteAuthSecretKey();
    void updateAppSettings(String targetApp, JSONObject settings);
}
