package com.teamopensmartglasses.convoscope;

import static com.teamopensmartglasses.convoscope.Constants.SEND_NOTIFICATIONS_ENDPOINT;

import android.util.Log;

import com.teamopensmartglasses.augmentoslib.events.NotificationEvent;
import com.teamopensmartglasses.convoscope.convoscopebackend.BackendServerComms;
import com.teamopensmartglasses.convoscope.convoscopebackend.VolleyJsonCallback;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import org.greenrobot.eventbus.ThreadMode;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import java.util.UUID;

public class NotificationSystem {
    private static final String TAG = "NotificationSystem";

    // JSONArray to manage notifications
    private final JSONArray notificationQueue;
    private static final int MAX_DISPLAYED_NOTIFICATIONS = 10;
    private BackendServerComms backendServerComms;
    private long lastDataSentTime = 0;

    public NotificationSystem() {
        notificationQueue = new JSONArray();
        // Register as a subscriber to the EventBus
        EventBus.getDefault().register(this);
    }

    @Subscribe(threadMode = ThreadMode.BACKGROUND)
    public void onNotificationEvent(NotificationEvent event) {
        JSONObject notificationData = event.notificationData;
        try {
            if (notificationData != null) {
                Log.d(TAG, "Received event: " + notificationData.toString());
                // Process the incoming notification
                addNotification(notificationData);
            } else {
                Log.d(TAG, "Notification data in event is null");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing notification event: " + e.getMessage());
        }
    }

    public synchronized void addNotification(JSONObject notificationData) {
        // Add a unique ID and timestamp to the notification
        try {
            if (notificationData != null) {
                notificationData.put("id", UUID.randomUUID().toString());

                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                String formattedDateTime = LocalDateTime.now().format(formatter);
                notificationData.put("timestamp", formattedDateTime);

                notificationQueue.put(notificationData); // Add to the JSONArray
                Log.d(TAG, "Notification added to queue: " + notificationData);
            }
        } catch (JSONException e) {
            Log.e(TAG, "Error adding id/timestamp to notification: " + e.getMessage());
        }
    }

    public JSONArray getNotificationQueue() {
        return notificationQueue;
    }

    public void sendNotificationsRequest() {
        updateLastDataSentTime();
        JSONObject queueWrapper = new JSONObject();
        try {
            queueWrapper.put("notifications", notificationQueue);
        } catch (JSONException e) {
            Log.e(TAG, "Error sending notifications: " + e.getMessage());
        }

        try {
            // Send the entire JSONArray
            backendServerComms.restRequest(SEND_NOTIFICATIONS_ENDPOINT, queueWrapper, new VolleyJsonCallback() {
                @Override
                public void onSuccess(JSONObject result) {
                    try {
                        parseSendNotificationsResult(result);
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }

                @Override
                public void onFailure(int code) {
                    Log.d(TAG, "SOME FAILURE HAPPENED (sendChatRequest)");
                }
            });
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public void parseSendNotificationsResult(JSONObject response) throws JSONException {
        Log.d(TAG, "Got result from server: " + response.toString());
    }

    private void updateLastDataSentTime() {
        lastDataSentTime = System.currentTimeMillis();
    }

    public void cleanup() {
        EventBus.getDefault().unregister(this);
    }
}