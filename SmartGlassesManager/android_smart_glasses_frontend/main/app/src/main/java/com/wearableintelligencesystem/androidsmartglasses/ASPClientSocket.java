package com.wearableintelligencesystem.androidsmartglasses;

import android.content.Context;

import com.wearableintelligencesystem.androidsmartglasses.archive.GlboxClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.comms.MessageTypes;
import com.wearableintelligencesystem.androidsmartglasses.comms.WebSocketManager;

import android.content.Intent;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Random;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

import io.reactivex.rxjava3.disposables.Disposable;
import io.reactivex.rxjava3.subjects.PublishSubject;

//singleton clientsocket class for connecting o ASP
public class ASPClientSocket {
    public static boolean killme = false;

    private static Handler handler;

    public static String TAG = "WearableAiAsg_AspClientSocket";
    //data observable we can send data through
    private static PublishSubject<JSONObject> dataObservable;
    private static Disposable dataSubscriber;

    //our websocket connection to the ASP
    private static WebSocketManager aspWebSocketManager;
    private static Disposable webSocketSub;

    private static int socketTimeout = 10000;

    //observables to receive data from websocket
    private static PublishSubject<JSONObject> webSocketObservable;

    //broadcast intent string
    //broadcast intent string
    public final static String ACTION_RECEIVE_MESSAGE = "com.example.wearableaidisplaymoverio.ACTION_RECEIVE_MESSAGE";
    public final static String EXTRAS_MESSAGE = "com.example.wearableaidisplaymoverio.EXTRAS_MESSAGE";
    public final static String EYE_CONTACT_5_MESSAGE = "com.example.wearableaidisplaymoverio.EYE_CONTACT_5";
    public final static String EYE_CONTACT_30_MESSAGE = "com.example.wearableaidisplaymoverio.EYE_CONTACT_30";
    public final static String EYE_CONTACT_300_MESSAGE = "com.example.wearableaidisplaymoverio.EYE_CONTACT_300";
    public final static String FACIAL_EMOTION_5_MESSAGE = "com.example.wearableaidisplaymoverio.FACIAL_EMOTION_5";
    public final static String FACIAL_EMOTION_30_MESSAGE = "com.example.wearableaidisplaymoverio.FACIAL_EMOTION_30";
    public final static String FACIAL_EMOTION_300_MESSAGE = "com.example.wearableaidisplaymoverio.FACIAL_EMOTION_300";

    public final static String ACTION_UI_DATA = "ACTION_UI_DATA";
    public final static String RAW_MESSAGE_JSON_STRING = "RAW_MESSAGE_JSON_STRING";

    public final static String ACTION_AFFECTIVE_MEM_TRANSCRIPT_LIST = "com.example.wearableaidisplaymoverio.ACTION_AFFECTIVE_MEM_TRANSCRIPT_LIST";
    public final static String AFFECTIVE_MEM_TRANSCRIPT_LIST = "com.example.wearableaidisplaymoverio.AFFECTIVE_MEM_TRANSCRIPT_LIST";

    public final static String ACTION_AFFECTIVE_SEARCH_QUERY = "com.example.wearableaidisplaymoverio.ACTION_AFFECTIVE_SEARCH_QUERY";
    public final static String AFFECTIVE_SEARCH_QUERY_RESULT = "com.example.wearableaidisplaymoverio.AFFECTIVE_SEARCH_QUERY_RESULT";

    //singleton instance
    private static ASPClientSocket clientsocket;
    //socket data
    static Thread SocketThread = null;
    static Thread ReceiveThread = null;
    static Thread SendThread = null;
    static Thread WebSocketThread = null;
    static private DataOutputStream output;

    //socket message ids
    static final byte [] heart_beat_id = {0x19, 0x20}; //id for heart beat
    static final byte [] ack_id = {0x13, 0x37};

    //static private BufferedReader input;
    static private DataInputStream input;
    static String SERVER_IP = "0.0.0.0"; //gets updated
    static int SERVER_PORT = 4567;
    private static int mConnectState = 0;

    private static boolean gotAck = false;

    //our actual socket connection object
    private static Socket socket;

    //remember how many packets we have in our buffer
    private static int packets_in_buf = 0;

    //queue of data to send through the socket
    private static BlockingQueue<byte []> data_queue;
    private static BlockingQueue<String> type_queue;
    private static int queue_size = 50;
    private static int image_buf_size = 0;

    //we need a reference to the context of whatever called this class so we can send broadcast updates on receving new info
    private static Context mContext;

    private boolean socketStarted = false;
    private static boolean webSocketStarted = false;
    private boolean audioSocketStarted = false;

    private ASPClientSocket(Context context){
        //create send queue and a thread to handle sending
        data_queue = new ArrayBlockingQueue<byte[]>(queue_size);
        type_queue = new ArrayBlockingQueue<String>(queue_size);

        //service context set 
        mContext = context;
    }

    public static ASPClientSocket getInstance(Context c){
        if (clientsocket == null){
            clientsocket = new ASPClientSocket(c);
        }
        return clientsocket;
    }

    public static void setIp(String ip){
        SERVER_IP = ip;
        if (aspWebSocketManager != null) {
            aspWebSocketManager.setNewIp(ip);
        }
    }

    public static ASPClientSocket getInstance(){
        if (clientsocket == null){
            return null;
        }
        return clientsocket;
    }

    public void startSocket(){
        socketStarted = true;
        //start first socketThread
        if (socket == null) {
            mConnectState = 1;
            Log.d(TAG, "startSocket starting");
            SocketThread = new Thread(new SocketThread());
            SocketThread.start();

            //setup handler to handle keeping connection alive, all subsequent start of SocketThread
            //start a new handler thread to send heartbeats
            HandlerThread thread = new HandlerThread("HeartBeater");
            thread.start();
            handler = new Handler(thread.getLooper());
            final int delay = 1000;
            final int min_delay = 3000;
            final int max_delay = 4000;
            Random rand = new Random();
            handler.postDelayed(new Runnable() {
                public void run() {
                    heartBeat();
                    //random delay for heart beat so as to disallow synchronized failure between client and server
                    int random_delay = rand.nextInt((max_delay - min_delay) + 1) + min_delay;
//                    Log.d(TAG, "Run next heart beat in n seconds, n = " + random_delay);
                    handler.postDelayed(this, random_delay);
                }
            }, delay);
        }
    }

    private void heartBeat(){
        //check if we are still connected
        //if not , reconnect,
        //we don't need to actively send heart beats from the client, as it's assumed that we are ALWAYS streaming data. Later, if we have periods of time where no data is sent, we will want to send a heart beat perhaps. but the client doesn't really need to, we just need to check if we are still connected
        if (mConnectState == 0) {
            updateUi();
            restartSocket();
        }
    }

    public static void restartSocket() {
        Log.d(TAG, "Restarting socket");
        mConnectState = 1;
        if (socket != null && (!socket.isClosed())){
            try {
                if (output != null) {
                    output.close();
                }
                if (input != null) {
                    input.close();
                }
                socket.close();
            } catch (IOException e) {
                System.out.println("FAILED TO CLOSE SOCKET, SOMETHING IS WRONG");
            }
        }


//        //kill threads
//        stopThread(SendThread);
//        stopThread(ReceiveThread);

        //restart socket thread
        SocketThread = new Thread(new SocketThread());
        SocketThread.start();
    }

    public static void stopThread(Thread thread){
        if(thread!=null){
            thread.interrupt();
            thread = null;
        }
    }

    public static  byte[] my_int_to_bb_be(int myInteger){
        return ByteBuffer.allocate(4).order(ByteOrder.BIG_ENDIAN).putInt(myInteger).array();
    }

    public void sendBytes(byte[] id, byte [] data, String type){
        //only try to send data if the socket is connected state
        if (mConnectState != 2){
            System.out.println("MCONNECTED IS FALSE IN sendBytes, returning");
            return;
        }

        //handle different types differently
        if (type == "image"){
            image_buf_size++;
        }
        //first, send hello
        byte [] hello = {0x01, 0x02, 0x03};
        //then send length of body
        byte[] len;
        if (data != null) {
             len = my_int_to_bb_be(data.length);
        } else {
            len = my_int_to_bb_be(0);
        }
        //then send id of message type
        byte [] msg_id = id;
        //then send data
        byte [] body = data;
        //then send end tag - eventually make this unique to the image
        byte [] goodbye = {0x3, 0x2, 0x1};
        //combine those into a payload
        ByteArrayOutputStream outputStream;
        try {
            outputStream = new ByteArrayOutputStream();
            outputStream.write(hello);
            outputStream.write(len);
            outputStream.write(msg_id);
            if (body != null) {
                outputStream.write(body);
            }
            outputStream.write(goodbye);
        } catch (IOException e){
            mConnectState = 0;
            return;
        }
        byte [] payload = outputStream.toByteArray();

        //send it in a background thread
        //new Thread(new SendThread(payload)).start();
        boolean try_send;
        if (type == "image"){
            if (data_queue.size() < (queue_size / 2)){ //if our queue is over half full, don't keep adding images to queue
                try_send = true;
            } else {
                try_send = false;
            }
        } else { //if not an image, try to send anyway
            try_send = true;
        }

        //add the data to the send queue
        if (try_send) {
            try {
                data_queue.add(payload);
                type_queue.add(type);
            } catch (IllegalStateException e) {
                Log.d(TAG, "Queue is full, skipping this one");
            }
        }
    }

    public int getConnected(){
        return mConnectState;
    }

    static class SocketThread implements Runnable {
        public void run() {
            try {
                if (killme){
                    return;
                }
                System.out.println("TRYING TO CONNECT AspClient Socket on IP: " + SERVER_IP + " and port: " + SERVER_PORT);
                socket = new Socket();
                socket.setSoTimeout(5000);
                socket.connect(new InetSocketAddress(SERVER_IP, SERVER_PORT), socketTimeout);
                Log.d(TAG, "CONNECTED!");
                output = new DataOutputStream(socket.getOutputStream());
                //input = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                input = new DataInputStream(new DataInputStream(socket.getInputStream()));
                mConnectState = 2;

                //update UI so user knows we're connected
                updateUi();

                //make the threads that will send and receive
                if (ReceiveThread == null) { //if the thread is null, make a new one (the first one)
                    ReceiveThread = new Thread(new ReceiveThread());
                    ReceiveThread.start();
                } else if (!ReceiveThread.isAlive()) { //if the thread is not null but it's dead, let it join then start a new one
                    Log.d(TAG, "IN SocketThread, WAITING FOR RECEIVETHREAD JOING");
                    try {
                        ReceiveThread.join(); //make sure socket thread has joined before throwing off a new one
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    Log.d(TAG, "receive JOINED");
                    ReceiveThread = new Thread(new ReceiveThread());
                    ReceiveThread.start();
                }
                if (SendThread == null) { //if the thread is null, make a new one (the first one)
                    SendThread = new Thread(new SendThread());
                    SendThread.start();
                } else if (!SendThread.isAlive()) { //if the thread is not null but it's dead, let it join then start a new one
                    Log.d(TAG, "IN SocketThread, WAITING FOR send THREAD JOING");
                    try {
                        SendThread.join(); //make sure socket thread has joined before throwing off a new one
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    Log.d(TAG, "send JOINED");
                    SendThread =  new Thread(new SendThread());
                    SendThread.start();
                }
            } catch (IOException e) {
                Log.d(TAG, "Connection Refused on socket");
                e.printStackTrace();
                mConnectState = 0;
            }
        }
    }

    public static int my_bb_to_int_be(byte [] byteBarray){
        return ByteBuffer.wrap(byteBarray).order(ByteOrder.BIG_ENDIAN).getInt();
    }

    public boolean getConnectState(){
        if (mConnectState != 2){
            return false;
        } else {
            return true;
        }
    }

    static class ReceiveThread implements Runnable {
        @Override
        public void run() {
            while (true) {
                if (killme){
                    return;
                }
                if (mConnectState != 2){
                    System.out.println("MCONNECTED IS FALSE IN REEIVE THREAD, BREAKING");
                    break;
                }
                byte b1, b2;
                byte [] raw_data = null;
                byte goodbye1, goodbye2, goodbye3;
                //just read in data here
                try {
                    byte hello1 = input.readByte(); // read hello of incoming message
                    byte hello2 = input.readByte(); // read hello of incoming message
                    byte hello3 = input.readByte(); // read hello of incoming message

                    //make sure header is verified
                    if (hello1 != 0x01 || hello2 != 0x02 || hello3 != 0x03){
                        Log.d(TAG, "Socket hello header broken, restarting socket");
                        break;
                    }
                    //length of body
                    int body_len = input.readInt();

                    //read in message id bytes
                    b1 = input.readByte();
                    b2 = input.readByte();

                    //read in message body (if there is one)
                    if (body_len > 0){
                        raw_data = new byte[body_len];
                        input.readFully(raw_data, 0, body_len); // read the body
                    }

                    goodbye1 = input.readByte(); // read goodbye of incoming message
                    goodbye2 = input.readByte(); // read goodbye of incoming message
                    goodbye3 = input.readByte(); // read goodbye of incoming message
                } catch (IOException e) {
                    e.printStackTrace();
                    mConnectState = 0;
                    break;
                }

                //make sure footer is verified
                if (goodbye1 != 0x03 || goodbye2 != 0x02 || goodbye3 != 0x01) {
                    Log.d(TAG, "Socket stream - footer broken, restarting socket");
                    break;
                }

                //then process the data
                if ((b1 == ack_id[0]) && (b2 == ack_id[1])){ //got ack response
                    gotAck = true;
                } else if ((b1 == heart_beat_id[0]) && (b2 == heart_beat_id[1])) { //heart beat check if alive
                    //got heart beat, respond with heart beat
                    clientsocket.sendBytes(heart_beat_id, null, "heartbeat");
                } else {
                    System.out.println("BAD SIGNAL, RECONNECT");
                    mConnectState = 0;
                    break;
                }
            }
            mConnectState = 0;
        }
    }
    static class SendThread implements Runnable {
        SendThread() {
        }
        @Override
        public void run() {
            //clear queue so we don't have a buildup of images
            data_queue.clear();
            type_queue.clear();
            while (true) {
                if (killme){
                    return;
                }
                if (packets_in_buf > 5) { //if 5 packets in buffer (NOT QUEUE, BUF NETWORK BUFFER), restart socket
                    break;
                }
                byte[] data;
                String type;
                try {
                    data = data_queue.take(); //block until there is something we can pull out to send
                    type = type_queue.take();
                } catch (InterruptedException e){
                    e.printStackTrace();
                    break;
                }
                try {
                    output.write(data);           // write the message
                } catch (java.io.IOException e) {
                    e.printStackTrace();
                    break;
                }

                //handle different types of sends differently
                if (type == "image"){
                    image_buf_size--;
                }
            }
            mConnectState = 0;
        }
    }

    private void parseData(JSONObject data){
        try {
            String typeOf = data.getString(MessageTypes.MESSAGE_TYPE_LOCAL);

            //the first bit does a bunch of if statement. The new, better way of doing things is our syncing of data across ASP and ASG with MessageTypes shared class. Now, we just pass a JSON string through to the UI if it's a MessageType that it needs to see, and let the UI deal with how to parse/handle it
            String [] uiMessages = new String[] {MessageTypes.NATURAL_LANGUAGE_QUERY, MessageTypes.REFERENCE_CARD_SIMPLE_VIEW, MessageTypes.REFERENCE_CARD_TEXT_WALL_VIEW, MessageTypes.REFERENCE_CARD_IMAGE_VIEW, MessageTypes.ACTION_SWITCH_MODES, MessageTypes.VOICE_COMMAND_STREAM_EVENT, MessageTypes.SCROLLING_TEXT_VIEW_START, MessageTypes.SCROLLING_TEXT_VIEW_STOP};
            for (String uiMessage : uiMessages){
               if (typeOf.equals(uiMessage)){
                   final Intent intent = new Intent();
                   intent.setAction(ASPClientSocket.ACTION_UI_DATA);
                   intent.putExtra(RAW_MESSAGE_JSON_STRING, data.toString());
                   mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from

                   //new method
                   final Intent nintent = new Intent();
                   nintent.setAction(typeOf);
                   nintent.putExtra(RAW_MESSAGE_JSON_STRING, data.toString());
                   mContext.sendBroadcast(nintent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
               }
            }

            //manual parsing, kept here until someone updates the ui to handle like above
            if (typeOf.equals(MessageTypes.SCROLLING_TEXT_VIEW_INTERMEDIATE )) {
                String intermediate_transcript = data.getString(MessageTypes.SCROLLING_TEXT_VIEW_TEXT);
                final Intent intent = new Intent();
                intent.putExtra(MessageTypes.SCROLLING_TEXT_VIEW_TEXT, intermediate_transcript);
                intent.setAction(MessageTypes.SCROLLING_TEXT_VIEW_INTERMEDIATE);
                mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
            } else if (typeOf.equals(MessageTypes.SCROLLING_TEXT_VIEW_FINAL)) {
                String final_transcript = data.getString(MessageTypes.SCROLLING_TEXT_VIEW_TEXT);
                final Intent intent = new Intent();
                intent.putExtra(MessageTypes.SCROLLING_TEXT_VIEW_TEXT, final_transcript);
                intent.setAction(MessageTypes.SCROLLING_TEXT_VIEW_FINAL);
                mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
            }
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public void setObservable(PublishSubject observable){
        dataObservable = observable;
        //dataSubscriber = dataObservable.subscribe(i -> parseData(i));
        dataSubscriber = dataObservable.subscribe(i -> parseData(i));
    }

    public static void startWebSocket(){
        webSocketStarted = true;
        WebSocketThread = new Thread(new WebSocketThread());
        WebSocketThread.start();
    }

    static class WebSocketThread implements Runnable {
        public void run() {
            //start a thread to hold the websocket connection to ASP
            aspWebSocketManager = new WebSocketManager(SERVER_IP, "8887");
            aspWebSocketManager.setObservable(dataObservable);
            aspWebSocketManager.setSourceName("asg_web_socket"); //should be pulled from R.string
            aspWebSocketManager.run(); //start socket which will auto reconnect on disconnect
        }
    }

    public boolean getSocketStarted(){
        return socketStarted;
    }

    public boolean getWebSocketStarted(){
        return webSocketStarted;
    }

    public boolean getAudioSocketStarted(){
        return audioSocketStarted;
    }

    private static void updateUi() {
        boolean connected = false;
        if (mConnectState == 2){
            connected = true;
        }
        //tell WearableAI service new info that the ui needs
        try {
            JSONObject uiUpdate = new JSONObject();
            uiUpdate.put(MessageTypes.MESSAGE_TYPE_LOCAL, MessageTypes.UI_UPDATE_ACTION);
            uiUpdate.put(MessageTypes.PHONE_CONNECTION_STATUS, connected);
            dataObservable.onNext(uiUpdate);
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public static void destroy(){
        killme = true;

        aspWebSocketManager.destroy();
        handler.removeCallbacksAndMessages(null);

        try {
            SendThread.join();
            ReceiveThread.join();
            SocketThread.join();
        } catch (InterruptedException e){
            e.printStackTrace();
        }
    }
}
