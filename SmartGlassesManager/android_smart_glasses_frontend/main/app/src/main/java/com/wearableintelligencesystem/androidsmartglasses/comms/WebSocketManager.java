package com.wearableintelligencesystem.androidsmartglasses.comms;

import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.util.Log;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.concurrent.TimeUnit;

import org.json.JSONObject;

import io.reactivex.rxjava3.subjects.PublishSubject;

public class WebSocketManager implements Runnable{
    private boolean killme = false;

    private String TAG = "WearableAI_WebSocket_Reconnector";
    public AsgWebSocketClient ws;
    private URI serverURI;

    //data to save and pass to the socket
    //observables to send data around app
    PublishSubject<JSONObject> dataObservable;
    String mySourceName;

    private static Handler handler;
    private static HandlerThread mHandlerThread;
    private static int delay;
    private static boolean firstRun = true;

    public void setObservable(PublishSubject<JSONObject> dataO){
        dataObservable = dataO;
    }

    public void setSourceName(String name){
        mySourceName = name;
    }

    public int getConnectionState(){
        if (ws != null) {
            return ws.getConnectionState();
        } else {
            return 0;
        }
    }

    public void sendJson(JSONObject data){
//        Log.d(TAG, "SENDING JSON FROM ASG WS");
        if (ws != null) {
            ws.send(data.toString());
        }
    }

    public WebSocketManager(String ip, String port){
        //handler = new Handler();
        //handler = new Handler(Looper.getMainLooper());
        mHandlerThread = new HandlerThread("WebSocketHandler");
        mHandlerThread.start();
        handler = new Handler(mHandlerThread.getLooper());
        delay = 3500; // 1000 milliseconds == 1 second

        if (port == null){
            port = "8887";
        }
        //create new URI to connect with
        try{
            this.serverURI = new URI("ws://" + ip + ":" + port);
        } catch (URISyntaxException e){
            e.printStackTrace();
        }

        //start a heartbeat, which will try to send a heartbeat every n seconds iff the connection appears to be open. This will reveal if the other end has closed the connection and we weren't notified
        handler.postDelayed(new Runnable() {
            public void run() {
                //if the ws doesn't exist or is not open, then the manager already knows we A) need to restart b) are starting, so don't send heart beat
                if (ws != null) {
                    if (ws.getConnectionState() == 2 && !ws.isClosed()) {
//                        Log.d(TAG, "tryna send heart beat");
                        ws.sendHeartBeat();
//                        Log.d(TAG, "done did send heart beat");
                    } else {
//                        Log.d(TAG, "not even gonna tryna send eart beat");
                    }
                }
                handler.postDelayed(this, 3000); //run again in delay milliseconds
            }
        }, delay);
    }

    public void setNewIp(String ip){
        int prevPort = serverURI.getPort();
        try {
            this.serverURI = new URI("ws://" + ip + ":" + Integer.toString(prevPort));
        } catch (URISyntaxException e){
            e.printStackTrace();
        }
    }

    @Override
    public void run() {
        int currDelay;
        if (firstRun){
            Log.d(TAG, "first run, so go fast");
            currDelay = 1;
        } else {
            currDelay = delay;
        }
        firstRun = false;
        handler.postDelayed(new Runnable() {
            public void run() {
                boolean connected = false;
                try {
                    Log.d(TAG, "Trying to connect...");
                    ws = new AsgWebSocketClient(WebSocketManager.this, serverURI);
                    ws.setObservable(dataObservable);
                    ws.setSourceName(mySourceName);
                    ws.setReuseAddr(true);
                    connected = ws.connectBlocking(2500, TimeUnit.MILLISECONDS); //add this so we don't get stuck trying to connect if the ip address updated
                    Log.d(TAG, "Web socket connected: " + connected);
                } catch (Exception e) {
                    connected = false;
                    e.printStackTrace();
                }
                if (!connected || ws.getConnectionState() == 0 || ws.isClosed()){
                    ws.stop();
                    handler.postDelayed(this, delay); //run again in delay milliseconds if we didn't successfully connect
                }
            }
        }, currDelay);
    }

    protected void onClose(){
        //reconnect
        Runnable restarter = new Runnable() {
            public void run() {
                Log.d(TAG, "Starting new run after onClose called...");
                runny();
            }
        };

        //must put this on handler as onClose here is called by onClose in socket, and we need to make sure socket it done shutting down before restarting
        handler.postDelayed(new Runnable() {
            public void run() {
                Log.d(TAG, "WebSocketManager onClose called");
                boolean closed = ws.stop();
                if (! closed){
                    Log.d(TAG, "WARNING: Old ws did not properly close");
                }
                Log.d(TAG, "onClose Stopped web socket");
                if (!killme) { //only restart if we aren't supposed to die yet
                    handler.postDelayed(restarter, delay);
                }
            }
        }, 100);
    }

    //this is because we need to delay this running, but there is a namespace overlap with run()
    protected void runny(){
        run();
    }

    public void destroy(){
        killme = true;

        //stop our heartbeat and connect loops
        handler.removeCallbacksAndMessages(null);
        mHandlerThread.quit();

        //close the websocket
        boolean closed = ws.stop();
    }
}