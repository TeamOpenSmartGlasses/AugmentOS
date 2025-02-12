public void sendPhoneNotification(String notificationId, String app, String title, String content, String priority) {
    try {
        JSONObject event = new JSONObject();
        event.put("type", "phone_notification");
        event.put("notificationId", notificationId);
        event.put("app", app);
        event.put("title", title);
        event.put("content", content);
        event.put("priority", priority);
        event.put("timestamp", System.currentTimeMillis());
        wsManager.sendText(event.toString());
    } catch (JSONException e) {
        Log.e(TAG, "Error building phone_notification JSON", e);
    }
}

// ------------------------------------------------------------------------
// HARDWARE EVENTS (if needed)
// ------------------------------------------------------------------------

public void sendButtonPress(String buttonId, String pressType) {
    try {
        JSONObject event = new JSONObject();
        event.put("type", "button_press");
        event.put("buttonId", buttonId);
        event.put("pressType", pressType);
        event.put("timestamp", System.currentTimeMillis());
        wsManager.sendText(event.toString());
    } catch (JSONException e) {
        Log.e(TAG, "Error building button_press JSON", e);
    }
}

public void sendHeadPosition(String position) {
    try {
        JSONObject event = new JSONObject();
        event.put("type", "head_position");
        event.put("position", position);
        event.put("timestamp", System.currentTimeMillis());
        wsManager.sendText(event.toString());
    } catch (JSONException e) {
        Log.e(TAG, "Error building head_position JSON", e);
    }
}

public void sendGlassesBatteryUpdate(int level, boolean charging, Integer timeRemaining) {
    try {
        JSONObject event = new JSONObject();
        event.put("type", "glasses_battery_update");
        event.put("level", level);
        event.put("charging", charging);
        event.put("timestamp", System.currentTimeMillis());
        if (timeRemaining != null) {
            event.put("timeRemaining", timeRemaining);
        }
        wsManager.sendText(event.toString());
    } catch (JSONException e) {
        Log.e(TAG, "Error building battery_update JSON", e);
    }
}


public void sendPhoneBatteryUpdate(int level, boolean charging, Integer timeRemaining) {
    try {
        JSONObject event = new JSONObject();
        event.put("type", "phone_battery_update");
        event.put("level", level);
        event.put("charging", charging);
        event.put("timestamp", System.currentTimeMillis());
        if (timeRemaining != null) {
            event.put("timeRemaining", timeRemaining);
        }
        wsManager.sendText(event.toString());
    } catch (JSONException e) {
        Log.e(TAG, "Error building battery_update JSON", e);
    }
}

public void sendGlassesConnectionState(String modelName, String status) {
    try {
        JSONObject event = new JSONObject();
        event.put("type", "glasses_connection_state");
        event.put("modelName", modelName);
        event.put("status", status);
        event.put("timestamp", System.currentTimeMillis());
        wsManager.sendText(event.toString());
    } catch (JSONException e) {
        Log.e(TAG, "Error building button_press JSON", e);
    }
}

public void sendLocationUpdate(double lat, double lng) {
    try {
        JSONObject event = new JSONObject();
        event.put("type", "location_update");
        event.put("lat", lat);
        event.put("lng", lng);
        event.put("timestamp", System.currentTimeMillis());
        wsManager.sendText(event.toString());
    } catch (JSONException e) {
        Log.e(TAG, "Error building location_update JSON", e);
    }
}