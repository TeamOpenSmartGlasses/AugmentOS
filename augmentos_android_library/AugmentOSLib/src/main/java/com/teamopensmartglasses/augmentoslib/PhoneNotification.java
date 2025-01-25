package com.teamopensmartglasses.augmentoslib;


public class PhoneNotification {
    private String title;
    private String message;
    private String appName;
    private long timestamp;
    private String id;

    public PhoneNotification(String title, String message, String appName, long timestamp, String id) {
        this.title = title;
        this.message = message;
        this.appName = appName;
        this.timestamp = timestamp;
        this.id = id;
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

    public long getTimestamp() {
        return timestamp;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    @Override
    public String toString() {
        return String.format("Notification{title='%s', text='%s', appName='%s', uuid='%s'}",
                title, message, appName, id);
    }
}