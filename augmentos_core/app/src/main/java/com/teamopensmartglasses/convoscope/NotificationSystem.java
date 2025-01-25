package com.teamopensmartglasses.convoscope;

import static com.teamopensmartglasses.convoscope.Constants.SEND_NOTIFICATIONS_ENDPOINT;

import android.content.Context;
import android.util.Log;

import com.teamopensmartglasses.augmentoslib.PhoneNotification;
import com.teamopensmartglasses.augmentoslib.events.NotificationEvent;
import com.teamopensmartglasses.convoscope.convoscopebackend.BackendServerComms;
import com.teamopensmartglasses.convoscope.convoscopebackend.VolleyJsonCallback;
import com.teamopensmartglasses.convoscope.events.GoogleAuthFailedEvent;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import org.greenrobot.eventbus.ThreadMode;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.UUID;

public class NotificationSystem {
    private static final String TAG = "NotificationSystem";

    private final ArrayList<PhoneNotification> notificationQueue;
    private BackendServerComms backendServerComms;
    private long lastDataSentTime = 0;

    public NotificationSystem(Context context) {
        notificationQueue = new ArrayList<>();
        backendServerComms = BackendServerComms.getInstance(context);
        EventBus.getDefault().register(this);
    }

    @Subscribe(threadMode = ThreadMode.BACKGROUND)
    public void onNotificationEvent(NotificationEvent event) {
        PhoneNotification notif = new PhoneNotification(event.title, event.text, event.appName, event.timestamp, event.id);
        Log.d(TAG, "Received event: " + notif.toString());
        addNotification(notif);
    }

    public synchronized void addNotification(PhoneNotification notif) {
        // Remove existing notification with same title and appName
        notificationQueue.removeIf(existing ->
                existing.getTitle().equals(notif.getTitle()) &&
                        existing.getAppName().equals(notif.getAppName())
        );

        if (notificationQueue.size() >= 5) {
            notificationQueue.remove(0);
        }

        notificationQueue.add(notif);
        sendNotificationsRequest();
        Log.d(TAG, "Notification added to queue: " + notif);
    }

    public ArrayList<PhoneNotification> getNotificationQueue() {
        return notificationQueue;
    }

    public void sendNotificationsRequest() {
        try {
            JSONObject requestWrapper = new JSONObject();
            JSONArray notificationsArray = new JSONArray();

            for (PhoneNotification notif : notificationQueue) {
                JSONObject notifJson = new JSONObject();
                notifJson.put("title", notif.getTitle());
                notifJson.put("message", notif.getText());
                notifJson.put("appName", notif.getAppName());
                notifJson.put("timestamp", notif.getTimestamp());
                notifJson.put("id", notif.getId());
                notificationsArray.put(notifJson);
            }
            requestWrapper.put("notifications", notificationsArray);

            backendServerComms.restRequest(SEND_NOTIFICATIONS_ENDPOINT, requestWrapper, new VolleyJsonCallback() {
                @Override
                public void onSuccess(JSONObject result) {
                    Log.d(TAG, "Request sent Successfully: " + result.toString());
                }

                @Override
                public void onFailure(int code) {
                    Log.d(TAG, "SOME FAILURE HAPPENED (sendNotificationsRequest)");
                    if (code == 401) {
                        EventBus.getDefault().post(new GoogleAuthFailedEvent("401 AUTH ERROR (requestUiPoll)"));
                    }
                }
            });
        } catch (JSONException e) {
            Log.e(TAG, "Error sending notifications: " + e.getMessage());
        }
    }

    public void parseSendNotificationsResult(JSONObject response) {
        Log.d(TAG, "Got result from server: " + response.toString());
    }

    private void updateLastDataSentTime() {
        lastDataSentTime = System.currentTimeMillis();
    }

    public void cleanup() {
        EventBus.getDefault().unregister(this);
    }
}