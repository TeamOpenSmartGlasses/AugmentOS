package com.teamopensmartglasses.augmentoslib.events;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.Serializable;

public class NotificationEvent implements Serializable {
    public String title;
    public String text;
    public String appName;
    public long timestamp;
    public String id;
    public static final String eventId = "notificationEvent";

    public NotificationEvent(String title, String text, String appName, long timestamp, String id) {
        this.title = title;
        this.text = text;
        this.appName = appName;
        this.timestamp = timestamp;
        this.id = id;
    }
}