package com.teamopensmartglasses.convoscope.comms;

import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;


public class AugmentOsManagerMessageParser {
    private static final String TAG = "AugmentOsMessageParser";
    private final AugmentOsActionsCallback callback;

    public AugmentOsManagerMessageParser(AugmentOsActionsCallback callback) {
        this.callback = callback;  // Store the callback reference for triggering actions
    }

    public void parseMessage(String json) throws JSONException {
            JSONObject commandObject = new JSONObject(json);
            String command = commandObject.getString("command");

            switch (command) {
                case "request_status":
                    callback.requestStatus();
                    break;

                case "connect_wearable":
                    String wearableId = commandObject.getJSONObject("params").getString("target");
                    callback.connectToWearable(wearableId);
                    break;

                case "disconnect_wearable":
                    String disconnectId = commandObject.getJSONObject("params").getString("target");
                    callback.disconnectWearable(disconnectId);
                    break;

                case "enable_virtual_wearable":
                    boolean enabled = commandObject.getJSONObject("params").getBoolean("enabled");
                    callback.enableVirtualWearable(enabled);
                    break;

                case "start_app":
                    String packageName = commandObject.getJSONObject("params").getString("target");
                    callback.startApp(packageName);
                    break;

                case "stop_app":
                    String stopPackage = commandObject.getJSONObject("params").getString("target");
                    callback.stopApp(stopPackage);
                    break;

                case "set_auth_secret_key":
                    String authKey = commandObject.getJSONObject("params").getString("authSecretKey");
                    callback.setAuthSecretKey(authKey);
                    break;

                case "verify_auth_secret_key":
                    callback.verifyAuthSecretKey();
                    break;

                case "delete_auth_secret_key":
                    callback.deleteAuthSecretKey();
                    break;

                case "update_app_settings":
                    String targetApp = commandObject.getJSONObject("params").getString("target");
                    JSONObject settings = commandObject.getJSONObject("params").getJSONObject("settings");
                    callback.updateAppSettings(targetApp, settings);
                    break;

                default:
                    Log.w(TAG, "Unknown command: " + command);
            }
    }
}
