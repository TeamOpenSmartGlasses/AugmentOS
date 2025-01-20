package com.teamopensmartglasses.augmentoslib;


public class PhoneNotification {
    private final String title;
    private final String message;
    private final String appName;
    private final String timestamp;
    private final String uuid;

    public PhoneNotification(String title, String message, String appName, String timestamp, String uuid) {
        this.title = title;
        this.message = message;
        this.appName = appName;
        this.timestamp = timestamp;
        this.uuid = uuid;
    }

    public String getTitle() {
        return title;
    }

    public String getText() {
        return message;
    }

    public String getAppName() {
        return appName;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public String getUuid() {
        return uuid;
    }
}