package com.teamopensmartglasses.convoscope;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.teamopensmartglasses.convoscope.events.NewScreenTextEvent;

import org.greenrobot.eventbus.EventBus;

import java.util.Arrays;
import java.util.List;

public class NotificationListener extends NotificationListenerService {
    private static final String TAG = "NotificationListener";

    private static final String CHANNEL_ID = "NotificationRelayChannel";

    private final List<String> packageBlacklist = Arrays.asList(
            "com.android.systemui",
            "com.samsung.android.app.smartcapture"
    );

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "NotificationService onCreate");
        startForegroundService();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    private void startForegroundService() {
        createNotificationChannel();

//        Intent notificationIntent = new Intent(this, MainActivity.class);
//        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
//
//        Notification notification = new Notification.Builder(this, CHANNEL_ID)
//                .setContentTitle("Notification Relay Service")
//                .setContentText("Capturing incoming notifications")
//                .setSmallIcon(com.teamopensmartglasses.smartglassesmanager.R.drawable.elon)
//                .setContentIntent(pendingIntent)
//                .build();
        Notification notification = createNotification();
        startForeground(3591, notification);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Notification Relay Service Channel",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(serviceChannel);
        }

        Log.d(TAG, "Started notification listener");
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

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Notification Listener Service")
                .setContentText("Capturing notifications")
                .setSmallIcon(com.teamopensmartglasses.smartglassesmanager.R.drawable.elon)
                .setContentIntent(pendingIntent)
                .build();
    }
}
