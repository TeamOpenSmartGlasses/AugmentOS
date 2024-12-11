package com.teamopensmartglasses.augmentos_manager

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.content.Intent
import androidx.localbroadcastmanager.content.LocalBroadcastManager

class NotificationListenerService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        val notificationText = sbn.notification.extras.getString("android.text")

        // Send the notification data to React Native via a broadcast
        val intent = Intent("NOTIFICATION_LISTENER")
        intent.putExtra("package", packageName)
        intent.putExtra("text", notificationText)
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        // Optional: handle notification removal
    }
}
