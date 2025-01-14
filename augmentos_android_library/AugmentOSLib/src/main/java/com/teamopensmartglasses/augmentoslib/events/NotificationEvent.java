package com.teamopensmartglasses.augmentoslib.events;

import org.json.JSONObject;

public class NotificationEvent {
    public final JSONObject notificationData;

    public NotificationEvent(JSONObject notificationData) {
        this.notificationData = notificationData;
    }
}