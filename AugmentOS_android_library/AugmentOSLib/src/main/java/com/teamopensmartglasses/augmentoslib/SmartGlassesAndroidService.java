package com.teamopensmartglasses.augmentoslib;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.drawable.Drawable;
import android.os.Binder;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.lifecycle.LifecycleService;

import com.teamopensmartglasses.augmentoslib.events.KillTpaEvent;

import org.greenrobot.eventbus.Subscribe;

//a service provided for third party apps to extend, that make it easier to create a service in Android that will continually run in the background
public abstract class SmartGlassesAndroidService extends LifecycleService {
    // Service Binder given to clients
    private final IBinder binder = new LocalBinder();
    public static final String INTENT_ACTION = "AugmentOS_COMMAND_INTENT";
    public static final String TPA_ACTION = "tpaAction";
    public static final String ACTION_START_FOREGROUND_SERVICE = "AugmentOSLIB_ACTION_START_FOREGROUND_SERVICE";
    public static final String ACTION_STOP_FOREGROUND_SERVICE = "AugmentOSLIB_ACTION_STOP_FOREGROUND_SERVICE";
    private int myNotificationId;
    private Class mainActivityClass;
    private String myChannelId;
    private String notificationAppName;
    private String notificationDescription;
    private int notificationDrawable;

    public FocusStates focusState;

    public SmartGlassesAndroidService(Class mainActivityClass, String myChannelId, int myNotificationId, String notificationAppName, String notificationDescription, int notificationDrawable){
        this.myNotificationId = myNotificationId;
        this.mainActivityClass = mainActivityClass;
        this.myChannelId = myChannelId;
        this.notificationAppName = notificationAppName;
        this.notificationDescription = notificationDescription;
        this.notificationDrawable = notificationDrawable;

        this.focusState = FocusStates.OUT_FOCUS;
    }

    //service stuff
    private Notification updateNotification() {
        Context context = getApplicationContext();

        PendingIntent action = PendingIntent.getActivity(context,
                0, new Intent(context, mainActivityClass),
                PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_MUTABLE); // Flag indicating that if the described PendingIntent already exists, the current one should be canceled before generating a new one.

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationCompat.Builder builder;

        String CHANNEL_ID = myChannelId;

        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, notificationAppName,
                NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(notificationDescription);
        manager.createNotificationChannel(channel);

        builder = new NotificationCompat.Builder(this, CHANNEL_ID);

        return builder.setContentIntent(action)
                .setContentTitle(notificationAppName)
                .setContentText(notificationDescription)
                .setSmallIcon(notificationDrawable)
                .setTicker("...")
                .setContentIntent(action)
                .setOngoing(true).build();
    }

    public class LocalBinder extends Binder {
        public SmartGlassesAndroidService getService() {
            // Return this instance of LocalService so clients can call public methods
            return SmartGlassesAndroidService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        super.onBind(intent);
        return binder;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);
        if (intent != null) {
            String action = intent.getAction();
            Bundle extras = intent.getExtras();
           
            //True when service is started from AugmentOS
            if(action == INTENT_ACTION && extras != null){
                action = (String) extras.get(TPA_ACTION);
            }

            switch (action) {
                case ACTION_START_FOREGROUND_SERVICE:
                    // start the service in the foreground
                    Log.d("TEST", "starting foreground");
                    startForeground(myNotificationId, updateNotification());
                    break;
                case ACTION_STOP_FOREGROUND_SERVICE:
                    stopForeground(true);
                    stopSelf();
                    break;
            }
        }
        return Service.START_STICKY;
    }

    @Subscribe
    public void onKillTpaEvent(KillTpaEvent receivedEvent){
        //if(receivedEvent.uuid == this.appUUID) //TODO: Figure out implementation here...
        if(true)
        {
            stopSelf();
        }
    }
}
