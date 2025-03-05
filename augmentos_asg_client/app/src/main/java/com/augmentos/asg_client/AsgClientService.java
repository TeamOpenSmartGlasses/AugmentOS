package com.augmentos.asg_client;

// ---------------------------------------------------------------------------------
// Below are the imports you likely need; if your project requires others, keep them:
// ---------------------------------------------------------------------------------
import static com.augmentos.asg_client.AsgConstants.asgServiceNotificationId;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Binder;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.augmentos.augmentos_core.AugmentosService; // Make sure this is the correct import path for your library
import com.augmentos.augmentos_core.smarterglassesmanager.camera.CameraRecordingService;

/**
 * This is the FULL AsgClientService code that:
 * 1) Runs in the foreground.
 * 2) Starts and binds to AugmentosService so we can get its instance.
 * 3) Cleans up properly when stopped or destroyed.
 *
 * "NOTHING LEFT OUT" – all functionality is shown below.
 */
public class AsgClientService extends Service {

    // ---------------------------------------------
    // Constants & Class Fields
    // ---------------------------------------------
    public static final String TAG = "AugmentOS_AsgClientService";

    // Actions for starting/stopping service
    public static final String ACTION_START_CORE = "ACTION_START_CORE";
    public static final String ACTION_STOP_CORE = "ACTION_STOP_CORE";
    public static final String ACTION_START_FOREGROUND_SERVICE = "MY_ACTION_START_FOREGROUND_SERVICE";
    public static final String ACTION_STOP_FOREGROUND_SERVICE = "MY_ACTION_STOP_FOREGROUND_SERVICE";

    // Notification channel info
    private final String notificationAppName = "ASG Client";
    private final String notificationDescription = "Running in foreground";
    private final String myChannelId = "asg_client";

    // Binder for any clients that bind to AsgClientService (optional usage)
    private final IBinder binder = new LocalBinder();

    // Reference to the AugmentosService we bind to
    private AugmentosService augmentosService = null;
    private boolean isAugmentosBound = false;

    // NetworkSetupManager stuff
    private NetworkSetupManager networkSetupManager;
    private CameraWebServer webServer;



    // ---------------------------------------------
    // ServiceConnection for the AugmentosService
    // ---------------------------------------------
    private final ServiceConnection augmentosConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            Log.d(TAG, "onServiceConnected: AugmentosService is connected");
            // We have the binder from AugmentosService, so cast and get the instance
            AugmentosService.LocalBinder binder = (AugmentosService.LocalBinder) service;
            augmentosService = binder.getService();
            isAugmentosBound = true;

            // At this point, AugmentosService is running, and we have direct access to it.
            // Example: Check if it's "fully booted" or do some post-boot tasks:
            // if (augmentosService.isFullyBooted()) {
            //     // doSomePostBootTask();
            // } else {
            //     augmentosService.setBootCompleteCallback(this::doSomePostBootTask);
            // }
            Log.d(TAG, "AugmentosService is bound and presumably ready for action!");
            //augmentosService.blePeripheral.start();
            //augmentosService.connectToWearable("Self Audio", "");

        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            Log.d(TAG, "onServiceDisconnected: AugmentosService disconnected");
            isAugmentosBound = false;
            augmentosService = null;
        }
    };

    // ---------------------------------------------
    // LocalBinder: allows this service to be bound
    // ---------------------------------------------
    public class LocalBinder extends Binder {
        public AsgClientService getService() {
            return AsgClientService.this;
        }
    }

    // ---------------------------------------------
    // Lifecycle Methods
    // ---------------------------------------------
    public AsgClientService() {
        // Empty constructor
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "AsgClientService onCreate");
        NetworkSetupManager.NetworkSetupCallback cb = createNetworkSetupCallback();
        //networkSetupManager = new NetworkSetupManager(getApplicationContext(), cb);
        //networkSetupManager.connectToWifi("Mentra", "interface4");

        //CameraRecordingService.startStreaming(getApplicationContext(), "rtmp://10.0.0.193:1935/live/SkaIT7MiJg");
        //CameraRecordingService.takePicture(getApplicationContext(), null);
        //CameraRecordingService.stopLocalRecording(getApplicationContext());
        // FOR THE DEMO APP
        // Create the server on port 8089
        webServer = new CameraWebServer(getApplicationContext(), 8089);
        // Set a callback for the "take-picture" route
        webServer.setOnPictureRequestListener(new CameraWebServer.OnPictureRequestListener() {
            @Override
            public void onPictureRequest() {
                // This is called when the user clicks "Take a Picture" on the webpage
                Log.d("MainActivity", "User requested a picture!");
                // TODO: trigger your camera capture logic here
                CameraRecordingService.takePicture(getApplicationContext(), null);
            }
        });
        // Start the server
        webServer.startServer();
    }

    /**
     * This is where we handle start commands, like ACTION_START_CORE or ACTION_STOP_CORE.
     * We also start/stop or bind/unbind AugmentosService here.
     */
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);

        if (intent == null || intent.getAction() == null) {
            Log.e(TAG, "Received null intent or null action");
            return START_STICKY;
        }

        String action = intent.getAction();
        Bundle extras = intent.getExtras(); // Not used, but available if needed

        switch (action) {
            case ACTION_START_CORE:
            case ACTION_START_FOREGROUND_SERVICE:
                Log.d(TAG, "AsgClientService onStartCommand -> starting foreground");
                createNotificationChannel();
                startForeground(asgServiceNotificationId, updateNotification());

                // 1) Start AugmentosService in the background/foreground
                //    so it's alive even if we unbind.
                Intent augmentosIntent = new Intent(this, AugmentosService.class);
                augmentosIntent.setAction(AugmentosService.ACTION_START_CORE);
                startForegroundService(augmentosIntent);

                // 2) Bind to AugmentosService to get a reference to it
                bindService(
                        new Intent(this, AugmentosService.class),
                        augmentosConnection,
                        BIND_AUTO_CREATE
                );
                break;

            case ACTION_STOP_CORE:
            case ACTION_STOP_FOREGROUND_SERVICE:
                Log.d(TAG, "AsgClientService onStartCommand -> stopping foreground");
                stopForeground(true);
                stopSelf();

                // If we’re bound to AugmentosService, unbind
                if (isAugmentosBound) {
                    unbindService(augmentosConnection);
                    isAugmentosBound = false;
                }

                // Optionally also stop AugmentosService entirely
                // if you want it fully shut down:
                stopService(new Intent(this, AugmentosService.class));
                break;

            default:
                Log.d(TAG, "Unknown action received in onStartCommand: " + action);
                break;
        }

        return START_STICKY;
    }

    private void recordFor5Seconds(){
        CameraRecordingService.startLocalRecording(getApplicationContext());
        new android.os.Handler().postDelayed(new Runnable() {
            @Override
            public void run() {
                CameraRecordingService.stopLocalRecording(getApplicationContext());
            }
        }, 5000); // 5000ms = 5 seconds
    }
    /**
     * Creates or updates our foreground notification channel and returns the
     * Notification object used by startForeground().
     */
    private Notification updateNotification() {
        Context context = getApplicationContext();

        // This PendingIntent leads to MainActivity if user taps the notification
        PendingIntent action = PendingIntent.getActivity(
                context,
                0,
                new Intent(context, MainActivity.class),
                PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_MUTABLE
        );

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            // Fallback - if manager is null, we can’t create a channel, but we can build a basic notification
            return new NotificationCompat.Builder(this, myChannelId)
                    .setContentTitle(notificationAppName)
                    .setContentText(notificationDescription)
                    .setSmallIcon(com.augmentos.augmentos_core.R.drawable.ic_launcher_foreground)
                    .setOngoing(true)
                    .build();
        }

        // For Android O+, create or update notification channel
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    myChannelId,
                    notificationAppName,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription(notificationDescription);
            manager.createNotificationChannel(channel);
        }

        // Build the actual notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, myChannelId)
                .setContentIntent(action)
                .setContentTitle(notificationAppName)
                .setContentText(notificationDescription)
                .setSmallIcon(com.augmentos.augmentos_core.R.drawable.ic_launcher_foreground)
                .setTicker("...")
                .setOngoing(true);

        return builder.build();
    }

    private NetworkSetupManager.NetworkSetupCallback createNetworkSetupCallback () {
        return new NetworkSetupManager.NetworkSetupCallback() {
            @Override
            public void onHotspotStarted() {

            }

            @Override
            public void onHotspotStopped() {

            }

            @Override
            public void onServerStarted(int port) {

            }

            @Override
            public void onServerStopped() {

            }

            @Override
            public void onCredentialsReceived(String ssid, String password, String authToken) {
                if(augmentosService != null) {
                    augmentosService.setAuthSecretKey("test123", authToken);
                }
            }

            @Override
            public void onWifiConnectionSuccess() {

            }

            @Override
            public void onWifiConnectionFailure() {

            }
        };
    }

    /**
     * Called when we’re destroyed. Good place to unbind from services if needed.
     */
    @Override
    public void onDestroy() {
        Log.d(TAG, "AsgClientService onDestroy");
        // If still bound to AugmentosService, unbind
        if (isAugmentosBound) {
            unbindService(augmentosConnection);
            isAugmentosBound = false;
        }

        if (webServer != null) {
            webServer.stopServer();
        }
        super.onDestroy();
    }

    // ---------------------------------------------
    // Binding and Binder logic
    // ---------------------------------------------
    @Override
    public IBinder onBind(Intent intent) {
        Log.d(TAG, "AsgClientService onBind -> returning binder");
        return binder;
    }

    // ---------------------------------------------
    // Example public method to use AugmentosService
    // ---------------------------------------------
    public void doSomethingWithAugmentos() {
        if (isAugmentosBound && augmentosService != null) {
            // For example, call some method on AugmentosService
            // augmentosService.sendStatusToBackend();
            Log.d(TAG, "Called a method on the bound AugmentosService!");
        } else {
            Log.w(TAG, "AugmentosService is not bound yet.");
        }
    }

    /**
     * If needed, you can check whether we’re bound to AugmentosService,
     * or retrieve the instance (e.g. for Activity usage).
     */
    public AugmentosService getAugmentosService() {
        return augmentosService;
    }

    public boolean isAugmentosServiceBound() {
        return isAugmentosBound;
    }

    /**
     * Creates the channel once (used by updateNotification()).
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    myChannelId,
                    notificationAppName,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription(notificationDescription);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
