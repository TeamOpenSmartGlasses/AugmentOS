package com.teamopensmartglasses.augmentoslib;

import android.app.ActivityManager;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.Serializable;
import java.util.ArrayList;

public class ThirdPartyApp implements Serializable {
    transient final String TAG = "ThirdPartyApp";
    public String appName;
    public String appDescription;
    public String packageName;

    public String serviceName;
    public ThirdPartyAppType appType;
    transient private JSONArray settings;
    public String version;
    public AugmentOSCommand[] commandList;

    public ThirdPartyApp(String appName, String appDescription, String packageName, String serviceName, String version, ThirdPartyAppType appType, JSONArray settings, AugmentOSCommand[] commandList){
        this.appName = appName;
        this.appDescription = appDescription;
        this.packageName = packageName;
        this.serviceName = serviceName;
        this.appType = appType;
        this.settings = settings;
        this.version = version;
        this.commandList = commandList;
    }

    public JSONArray getSettings(Context context) {
        String authority = this.packageName + ".augmentosconfigprovider";
        Uri uri = Uri.parse("content://" + authority + "/config");

        Cursor cursor = context.getContentResolver().query(uri, null, null, null, null);
        if (cursor != null) {
            if (cursor.moveToFirst()) {
                int jsonColumnIndex = cursor.getColumnIndex("json");
                if (jsonColumnIndex != -1) {
                    String jsonStr = cursor.getString(jsonColumnIndex);
                    try {
                        JSONObject jsonObject = new JSONObject(jsonStr); // Parse the jsonStr into a JSONObject
                        JSONArray settingsObj = jsonObject.has("settings") ? jsonObject.getJSONArray("settings") : new JSONArray();
                        this.settings = settingsObj;
                        Log.d(TAG, "GOT SOME SETTINGS: " + settingsObj.toString());
                        return settingsObj;
                    } catch (Exception e) {
                        Log.e(TAG, "Error parsing JSON: " + e.getMessage(), e);
                    }
                }
            }
            cursor.close();
        }
        return null;
    }

    public boolean updateSetting(Context context, String settingKey, Object newValue) {
        String authority = this.packageName + ".augmentosconfigprovider";
        Uri settingUri = Uri.parse("content://" + authority + "/config/" + settingKey);

        ContentValues values = new ContentValues();

        // Determine the type of newValue and put it accordingly
        if (newValue instanceof Boolean) {
            values.put("currentValue", (Boolean) newValue);
        } else if (newValue instanceof Integer) {
            values.put("currentValue", (Integer) newValue);
        } else if (newValue instanceof Float) {
            values.put("currentValue", (Float) newValue);
        } else if (newValue instanceof Double) {
            values.put("currentValue", (Double) newValue);
        } else if (newValue instanceof String) {
            values.put("currentValue", (String) newValue);
        } else if (newValue instanceof JSONArray) {
            values.put("currentValue", newValue.toString());
        } else {
            // Handle unsupported types or convert to String
            Log.w("AugmentOS_Core", "Unsupported type for setting: " + newValue.getClass().getSimpleName());
            values.put("currentValue", newValue.toString());
        }

        int rowsUpdated = context.getContentResolver().update(settingUri, values, null, null);
        if (rowsUpdated > 0) {
            Log.d("AugmentOS_Core", "Successfully updated setting: " + settingKey);
            return true;
        } else {
            Log.e("AugmentOS_Core", "Failed to update setting: " + settingKey);
            return false;
        }
    }

    public JSONObject toJson(boolean includeSettings) {
        JSONObject tpaObj = new JSONObject();
        try {
            tpaObj.put("name", appName);
            tpaObj.put("description", appDescription);
            tpaObj.put("version", version);
            tpaObj.put("package_name", packageName);
            tpaObj.put("type", appType.name());

            if(includeSettings) {
                tpaObj.put("settings", settings);
            }
        } catch (JSONException e) {
            throw new RuntimeException(e);
        }
        return tpaObj;
    }
}
