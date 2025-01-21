package com.teamopensmartglasses.augmentoslib.events;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.Serializable;

public class NotificationEvent implements Serializable {
    private final String notificationDataString;
    public static final String eventId = "notificationEvent";

    public NotificationEvent(JSONObject notificationData) {
        this.notificationDataString = notificationData.toString();
    }

    public JSONObject getNotificationData() throws JSONException {
        return new JSONObject(notificationDataString);
    }
}