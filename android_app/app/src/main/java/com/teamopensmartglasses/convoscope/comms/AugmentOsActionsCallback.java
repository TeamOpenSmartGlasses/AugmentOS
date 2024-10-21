package com.teamopensmartglasses.convoscope.comms;

import org.json.JSONObject;

public interface AugmentOsActionsCallback {
    void requestStatus();
    void connectToWearable(String wearableId);
    void disconnectWearable(String wearableId);
    void enableVirtualWearable(boolean enabled);
    void startApp(String packageName);
    void stopApp(String packageName);
    void setAuthSecretKey(String authSecretKey);
    void verifyAuthSecretKey();
    void deleteAuthSecretKey();
    void updateAppSettings(String targetApp, JSONObject settings);
}
