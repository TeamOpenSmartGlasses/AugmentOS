package com.wearableintelligencesystem.androidsmartglasses;

import android.app.ActivityManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.os.AsyncTask;
import android.os.BatteryManager;
import android.os.Binder;
import android.os.Environment;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.wearableintelligencesystem.androidsmartglasses.R;
import com.wearableintelligencesystem.androidsmartglasses.archive.GlboxClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.comms.MessageTypes;
import com.wearableintelligencesystem.androidsmartglasses.comms.WifiStatusCallback;
import com.wearableintelligencesystem.androidsmartglasses.comms.WifiUtils;
import com.wearableintelligencesystem.androidsmartglasses.sensors.BluetoothScanner;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;

import io.reactivex.rxjava3.disposables.Disposable;
import io.reactivex.rxjava3.exceptions.UndeliverableException;
import io.reactivex.rxjava3.plugins.RxJavaPlugins;
import io.reactivex.rxjava3.subjects.PublishSubject;

//handles all of the background stuff like
    //-socket connection to ASP
    //-socket connection to GLBox
    //-receiving data from both ASP and GLBox
    //-whatever else we need in the background
public class WearableAiService extends Service {
    public static final String ACTION_START_FOREGROUND_SERVICE = "ACTION_START_FOREGROUND_SERVICE";
    public static final String ACTION_STOP_FOREGROUND_SERVICE = "ACTION_STOP_FOREGROUND_SERVICE";

    public static boolean killme = false;

    // Binder given to clients
    private final IBinder binder = new LocalBinder();

    //device status
    boolean phoneConnected = false;
    boolean wifiConnected;
    float batteryPercentage;
    boolean batteryIsCharging;

    //ASP socket
    ASPClientSocket asp_client_socket;
    String asp_address;
    String asp_adv_key = "WearableAiCyborg";

    //GLBOX socket
    GlboxClientSocket glbox_client_socket;
    String glbox_address = "3.23.98.82";

    //id of packet
    static final byte[] img_id = {0x01, 0x10}; //id for images

    //settings
    private String router = "web";

    //tag
    private String TAG = "WearableAiDisplay";

    public int PORT_NUM = 8891;
    public DatagramSocket socket;

    private Context mContext;

    Thread adv_thread;

    //observables to send data around app
    PublishSubject<JSONObject> dataObservable;
    private Disposable dataSubscriber;

    //bluetooth sensors
    private BluetoothScanner mBluetoothScanner;

    //audio system
    AudioSystem audioSystem;

    @Override
    public void onCreate() {
        super.onCreate();

        //set the error handler for rxjava
        RxJavaPlugins.setErrorHandler(throwable -> {
            throwable.printStackTrace();
            if (throwable instanceof  UndeliverableException){
                Log.d(TAG, "Got RXJAVA error UndeliverableException.... carrying on.");
            }
        }); // nothing or some logging

        dataObservable = PublishSubject.create();
        dataSubscriber = dataObservable.subscribe(i -> handleDataStream(i));

        //setup our connection to the ASP
        asp_client_socket = ASPClientSocket.getInstance(this);
        asp_client_socket.setObservable(dataObservable);

        //first we have to listen for the UDP broadcast from the compute module so we know the IP address to connect to. Once we get that , we will connect to it on a socket and starting sending pictures
        //this will start the asp socket when ASP address is received and ASP is not connected. If ASP socket already running, it will update the ASP address (useful when ASP IP changes, like on new wifi)
        Thread adv_thread = new Thread(new ReceiveAdvThread());
        adv_thread.start();

        //setup audio streaming
        audioSystem = new AudioSystem(this);
        audioSystem.setObservable(dataObservable);
        audioSystem.startStreaming();

        mContext = this;

        //start sensor scan
//        mBluetoothScanner = new BluetoothScanner(this);
//        mBluetoothScanner.startScan();

        //register for battery information
        this.registerReceiver(this.mBatInfoReceiver, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));

        //register for wifi information
        IntentFilter wifiFilter = new IntentFilter();
        wifiFilter.addAction("android.net.conn.CONNECTIVITY_CHANGE");
        WifiStatusCallback wifiConnectCallback = new WifiStatusCallback() {
            @Override
            public void onSuccess(boolean connected) {
                wifiConnected = connected;
                if (!wifiConnected){ //if wifi connects, then phone must disconnect too - ACTUALLY not true on all phone, some bounce off and on, but websocket stays up
//                    phoneConnected = false;
                }
                updateUi();
            }
        };
        this.registerReceiver(new WifiUtils.WifiReceiver(wifiConnectCallback), wifiFilter);
    }

    class ReceiveAdvThread extends Thread {
        public void run() {
            receiveUdpBroadcast();
        }
    }

    class StartGlbox extends Thread {
        public void run() {
            glbox_starter();
        }
    }


    public void receiveUdpBroadcast() {
        try {
            //Keep a socket open to listen to all the UDP trafic that is destined for this port
            socket = new DatagramSocket(PORT_NUM, InetAddress.getByName("0.0.0.0"));
            socket.setBroadcast(true);

            while (!killme) {
                //Receive a packet
                byte[] recvBuf = new byte[64];
                DatagramPacket packet = new DatagramPacket(recvBuf, recvBuf.length);
                socket.receive(packet);

                //Packet received
                String data = new String(packet.getData()).trim();
                if (data.equals(asp_adv_key)) {
                    asp_address = packet.getAddress().getHostAddress();
                    asp_client_socket.setIp(asp_address);
                    asp_comms_starter();
                }
                int hundos = 5; //how many hundredths of a second to wait, we split it up so we don't get stuck when the app is closed/killed
                for (int i = 0; i < hundos; i++){
                    SystemClock.sleep(100); //this is how we delay the loop from running too fast, there is probably a better way, but setting up a hanlder failed with no error, so this works for now
                    if (killme){
                        break;
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
            Log.d(TAG, "Exception: " + e);
        }
    }

    public void asp_comms_starter() {
        //start the web socket to communicate with ASP, to replace TCP socket below
        if (!asp_client_socket.getWebSocketStarted()) {
            asp_client_socket.startWebSocket();
        }

        //start comms to ASP
        if (!asp_client_socket.getSocketStarted()) {
            asp_client_socket.startSocket();
        }
    }


    public void glbox_starter() {
        startGlboxSocket();
    }

    @Override
    public void onDestroy() {
        killme = true;
        dataSubscriber.dispose();
        asp_client_socket.destroy();

        try {
            adv_thread.join();
        } catch(InterruptedException e){
            e.printStackTrace();
        }

        super.onDestroy();
    }

    public class LocalBinder extends Binder {
        WearableAiService getService() {
            // Return this instance of LocalService so clients can call public methods
            return WearableAiService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    private void startMyOwnForeground(){

    }

    //service stuff
    private Notification updateNotification() {

        String NOTIFICATION_CHANNEL_ID = "com.wearableintelligencesystem.main_notify_channel";
        String channelName = "SmartGlassesManager";
        NotificationChannel chan = new NotificationChannel(NOTIFICATION_CHANNEL_ID, channelName, NotificationManager.IMPORTANCE_NONE);
        chan.setLightColor(Color.BLUE);
        chan.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        assert manager != null;
        manager.createNotificationChannel(chan);

        Context context = getApplicationContext();
        PendingIntent action = PendingIntent.getActivity(context,
                0, new Intent(context, MainActivity.class),
                PendingIntent.FLAG_CANCEL_CURRENT); // Flag indicating that if the described PendingIntent already exists, the current one should be canceled before generating a new one.

        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID);
        Notification notification = notificationBuilder.setOngoing(true)
                .setSmallIcon(R.drawable.elon)
                .setContentTitle("Wearable Intelligence System")
                .setContentText("Running...")
                .setContentIntent(action)
                .setPriority(NotificationManager.IMPORTANCE_MIN)
                .setCategory(Notification.CATEGORY_SERVICE)
                .setOngoing(true).build();

        return notification;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null){
            String action = intent.getAction();
            switch (action) {
                case ACTION_START_FOREGROUND_SERVICE:
                    // start the service in the foreground
                    startForeground(1234, updateNotification());
                    break;
                case ACTION_STOP_FOREGROUND_SERVICE:
                    stopForeground(true);
                    stopSelf();
                    break;
            }
        }

        return START_NOT_STICKY;
    }

    private void startGlboxSocket() {
        //create client socket and setup socket
        System.out.println("STARTING GLBOX SOCKET");
        glbox_client_socket = GlboxClientSocket.getInstance(this);
        glbox_client_socket.setObservable(dataObservable);
        glbox_client_socket.setIp(glbox_address);
        glbox_client_socket.startSocket();
    }

    private File getDir() {
        File sdDir = Environment
                .getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
        return new File(sdDir, "CameraAPIDemo");
    }

    //check if service is running
    private boolean isMyServiceRunning(Class<?> serviceClass) {
        ActivityManager manager = (ActivityManager) this.getSystemService(Context.ACTIVITY_SERVICE);
        for (ActivityManager.RunningServiceInfo service : manager.getRunningServices(Integer.MAX_VALUE)) {
            if (serviceClass.getName().equals(service.service.getClassName())) {
                return true;
            }
        }
        return false;
    }

    private BroadcastReceiver mBatInfoReceiver = new BroadcastReceiver(){
        @Override
        public void onReceive(Context ctxt, Intent intent) {
            // Are we charging / charged?
            int status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
            batteryIsCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL;

            //what is the charge level?
            int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            batteryPercentage = level * 100 / (float)scale;
//            Log.d(TAG, "BATTERY PERCENTAGE IS: " + batteryPercentage);
//            Log.d(TAG, "BATTERY IS charging: " + batteryIsCharging);
            updateUi();
        }
    };

    private void updateUi() {
        //send to main ui
        final Intent intent = new Intent();
        intent.setAction(MainActivity.ACTION_UI_UPDATE);
        intent.putExtra(MainActivity.BATTERY_LEVEL_STATUS_UPDATE, batteryPercentage);
        intent.putExtra(MainActivity.BATTERY_CHARGING_STATUS_UPDATE, batteryIsCharging);
        intent.putExtra(MainActivity.WIFI_CONN_STATUS_UPDATE, wifiConnected);
        intent.putExtra(MainActivity.PHONE_CONN_STATUS_UPDATE, phoneConnected);
        mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
    }

    public void requestUiUpdate(){
        updateUi();
    }

    private void handleDataStream(JSONObject data){
        try {
            String dataType = data.getString(MessageTypes.MESSAGE_TYPE_LOCAL);
            if (dataType.equals(MessageTypes.UI_UPDATE_ACTION)){
                if (data.has(MessageTypes.PHONE_CONNECTION_STATUS)){
                    phoneConnected = data.getBoolean(MessageTypes.PHONE_CONNECTION_STATUS);
                    updateUi();
                }
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    //wake up the screen
    private void wakeupScreen() {
        new AsyncTask<Void, Void, Exception>() {
            @Override
            protected Exception doInBackground(Void... params) {
                try {
                    Log.d(TAG, "WAITING TO TURN ON SCREEN");
                    try {
                        Thread.sleep(10000); // turn on duration
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    Log.d(TAG, "TURNING ON SCREEN");
                    PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
                    PowerManager.WakeLock fullWakeLock = powerManager.newWakeLock((PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP), "WIS:Loneworker-FULL WAKE LOCK");
                    fullWakeLock.acquire(); // turn on
                    try {
                        Thread.sleep(5000); // turn on duration
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    Log.d(TAG, "RELEASING SCREEN");
                    fullWakeLock.release();
                } catch (Exception e) {
                    return e;
                }
                return null;
            }
        }.execute();
    }

}

