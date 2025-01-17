package com.teamopensmartglasses.convoscope;

import static com.teamopensmartglasses.convoscope.Constants.SEND_NOTIFICATIONS_ENDPOINT;

import android.util.Log;

import com.teamopensmartglasses.augmentoslib.events.NotificationEvent;
import com.teamopensmartglasses.convoscope.convoscopebackend.BackendServerComms;
import com.teamopensmartglasses.convoscope.convoscopebackend.VolleyJsonCallback;
import com.teamopensmartglasses.convoscope.events.GoogleAuthFailedEvent;

import android.content.Context;
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
    private BackendServerComms backendServerComms;
    private long lastDataSentTime = 0;

    public NotificationSystem(Context context) {
        notificationQueue = new JSONArray();
        backendServerComms = BackendServerComms.getInstance(context);
        // Register as a subscriber to the EventBus
        EventBus.getDefault().register(this);
    }

    @Subscribe(threadMode = ThreadMode.BACKGROUND)
    public void onNotificationEvent(NotificationEvent event) throws JSONException {
        JSONObject notificationData = event.getNotificationData();
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
            if (notificationData != null && notificationData.has("appName") 
                && !notificationData.getString("appName").toLowerCase().contains("augmentos")) {
                notificationData.put("uuid", UUID.randomUUID().toString());

                for (int i = 0; i < notificationQueue.length(); i++) { // Remove element with same title and appName
                    try {
                        JSONObject existingNotification = notificationQueue.getJSONObject(i);
                        if (existingNotification.getString("title").equals(notificationData.getString("title")) &&
                            existingNotification.getString("appName").equals(notificationData.getString("appName"))) {
                            notificationQueue.remove(i);
                            break; // Exit loop after removing the duplicate
                        }
                    } catch (JSONException e) {
                        Log.e(TAG, "Error checking existing notifications in queue: " + e.getMessage());
                    }
                }

                if (notificationQueue.length() >= 5) {
                    notificationQueue.remove(0);
                }

                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                String formattedDateTime = LocalDateTime.now().format(formatter);
                notificationData.put("timestamp", formattedDateTime);

                notificationQueue.put(notificationData); // Add to the JSONArray
                sendNotificationsRequest(); // Send the notification to the server
                Log.d(TAG, "Notification added to queue: " + notificationData);
            }
        } catch (JSONException e) {
            Log.e(TAG, "Error adding id/timestamp to notification: " + e.getMessage());
        }
    }

    public JSONArray getNotificationQueue() {
        return notificationQueue;
    }

    public void sendNotificationsRequest() throws JSONException {
        JSONArray notificationQueue = getNotificationQueue();
        JSONObject requestWrapper = new JSONObject();
        requestWrapper.put("notifications", notificationQueue);

        try {
            backendServerComms.restRequest(SEND_NOTIFICATIONS_ENDPOINT, requestWrapper, new VolleyJsonCallback() {
                @Override
                public void onSuccess(JSONObject result) {
                    Log.d(TAG, "Request sent Successfully: " + result.toString());
                }
                @Override
                public void onFailure(int code) {
                    Log.d(TAG, "SOME FAILURE HAPPENED (sendNotificationsRequest)");
                    if (code == 401){
                        EventBus.getDefault().post(new GoogleAuthFailedEvent("401 AUTH ERROR (requestUiPoll)"));
                    }
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