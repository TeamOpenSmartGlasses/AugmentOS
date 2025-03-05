package com.augmentos.asg_client;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.Log;

public class BootService extends Service {
    private static final String TAG = "BootService";
    private static final String CHANNEL_ID = "BootServiceChannel";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "BootService created");

        // Create the notification channel
        createNotificationChannel();
        Notification notification = new Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Boot Service")
                .setContentText("Running post-boot tasks...")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .build();

        // Start the service in the foreground
        startForeground(1, notification);
    }


    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "BootService started");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Log.d(TAG, "Requesting overlay permission");
            Intent overlayIntent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
            overlayIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(overlayIntent);
        } else {
            Log.d(TAG, "Launching WebViewActivity...");

            // Launch WebViewActivity
//            Intent webViewIntent = new Intent(this, WebViewActivity.class);
//            webViewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
//            startActivity(webViewIntent);
        }

        // Stop the service after task completion
        stopSelf();
        return START_NOT_STICKY;
    }
    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not used
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Boot Service Channel",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
