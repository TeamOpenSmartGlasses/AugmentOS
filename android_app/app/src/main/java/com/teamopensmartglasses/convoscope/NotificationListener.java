package com.teamopensmartglasses.convoscope;

import android.app.Notification;
import android.content.Intent;
import android.os.IBinder;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import com.teamopensmartglasses.convoscope.events.NewScreenTextEvent;

import org.greenrobot.eventbus.EventBus;

import java.util.Arrays;
import java.util.List;

public class NotificationListener extends NotificationListenerService {
    private static final String TAG = "NotificationListener";

    private final List<String> packageBlacklist = Arrays.asList(
            "com.android.systemui",
            "com.samsung.android.app.smartcapture"
    );

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service created");
    }

    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service Started");
        return super.onStartCommand(intent, flags, startId);
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        super.onNotificationPosted(sbn);

        String packageName = sbn.getPackageName();

        Log.d(TAG, "Notification Posted: " + sbn.getPackageName());

        if (packageBlacklist.contains(packageName)) {
            Log.d(TAG, "Notification from " + packageName + " ignored");
            return;
        }

        Notification notification = sbn.getNotification();
        String title = "";
        String text = "";

        if (notification.extras != null) {
            title = notification.extras.getString(Notification.EXTRA_TITLE);
            CharSequence textCharSequence = notification.extras.getCharSequence(Notification.EXTRA_TEXT);
            if (textCharSequence != null) {
                text = textCharSequence.toString();
            }
        }

        EventBus.getDefault().post(new NewScreenTextEvent(title + ": " + text));
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        super.onNotificationRemoved(sbn);
        Log.d(TAG, "Notification Removed: " + sbn.getPackageName());
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Stopped notification listener");
    }

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.d(TAG, "Listener Connected");
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        Log.d(TAG, "Listener Disconnected");
    }
}
