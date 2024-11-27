package com.wearableintelligencesystem.androidsmartglasses.archive;

import android.content.Context;
import android.content.Intent;
import android.os.Environment;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import android.util.Base64;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Random;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

import io.reactivex.rxjava3.disposables.Disposable;
import io.reactivex.rxjava3.subjects.PublishSubject;

//singleton clientsocket class for connecting to ASP
public class GlboxClientSocket {
    //data observable we can send data through
    private static PublishSubject<JSONObject> dataObservable;
    private static Disposable dataSubscriber;

    //broadcast intent string
    public final static String ACTION_RECEIVE_TEXT = "com.example.wearableaidisplaymoverio.ACTION_RECEIVE_TEXT";
//    public final static String EXTRAS_MESSAGE = "com.example.wearableaidisplaymoverio.EXTRAS_MESSAGE";
    public final static String FINAL_REGULAR_TRANSCRIPT = "com.example.wearableaidisplaymoverio.FINAL_REGULAR_TRANSCRIPT";
    public final static String INTERMEDIATE_REGULAR_TRANSCRIPT = "com.example.wearableaidisplaymoverio.INTERMEDIATE_REGULAR_TRANSCRIPT";
    public final static String COMMAND_RESPONSE = "com.example.wearableaidisplaymoverio.COMMAND_RESPONSE";
    public final static String WIKIPEDIA_RESULT = "com.example.wearableaidisplaymoverio.WIKIPEDIA_RESULT";
    public final static String ACTION_WIKIPEDIA_RESULT = "com.example.wearableaidisplaymoverio.ACTION_WIKIPEDIA_RESULT";
    public final static String TRANSLATION_RESULT = "com.example.wearableaidisplaymoverio.TRANSLATION_RESULT";
    public final static String VISUAL_SEARCH_RESULT = "com.example.wearableaidisplaymoverio.VISUAL_SEARCH_RESULT";
    public final static String AFFECTIVE_SUMMARY_RESULT = "com.example.wearableaidisplaymoverio.AFFECTIVE_SUMMARY_RESULT";
    public final static String ACTION_TRANSLATION_RESULT = "com.example.wearableaidisplaymoverio.ACTION_TRANSLATION_RESULT";
    public final static String ACTION_VISUAL_SEARCH_RESULT = "com.example.wearableaidisplaymoverio.ACTION_VISUAL_SEARCH_RESULT";
    public final static String ACTION_AFFECTIVE_SUMMARY_RESULT = "com.example.wearableaidisplaymoverio.ACTION_AFFECTIVE_SUMMARY_RESULT";

    public final static String COMMAND_SWITCH_MODE = "com.example.wearableaidisplaymoverio.COMMAND_SWITCH_MODE";
    public final static String COMMAND_ARG = "com.example.wearableaidisplaymoverio.COMMAND_ARG";
    //public final static String COMMAND_RESPONSE_TEXT = "com.example.wearableaidisplaymoverio.COMMAND_RESPONSE_TEXT";
//    public final static String EYE_CONTACT_30_MESSAGE = "com.example.wearableaidisplaymoverio.EYE_CONTACT_30";
//    public final static String EYE_CONTACT_300_MESSAGE = "com.example.wearableaidisplaymoverio.EYE_CONTACT_300";
//    public final static String FACIAL_EMOTION_5_MESSAGE = "com.example.wearableaidisplaymoverio.FACIAL_EMOTION_5";
//    public final static String FACIAL_EMOTION_30_MESSAGE = "com.example.wearableaidisplaymoverio.FACIAL_EMOTION_30";
//    public final static String FACIAL_EMOTION_300_MESSAGE = "com.example.wearableaidisplaymoverio.FACIAL_EMOTION_300";

    public static String TAG = "WearableAiDisplayMoverio";
    //singleton instance
    private static GlboxClientSocket clientsocket;
    //socket data
    static Thread SocketThread = null;
    static Thread ReceiveThread = null;
    static Thread SendThread = null;
    static private DataOutputStream output;
    //ids of message types
    //socket message ids
    //metrics
    static final byte [] intermediate_transcript_cid = {0xC, 0x01};
    static final byte [] final_transcript_cid = {0xC, 0x02};
    static final byte [] switch_mode_cid = {0xC, 0x03};
    static final byte [] command_response_cid = {0xC, 0x04};
    static final byte [] wikipedia_result_cid = {0xC, 0x05};
    static final byte [] translation_result_cid = {0xC, 0x06};
    static final byte [] visual_search_images_result_cid = {0xC, 0x07};
    static final byte [] affective_summary_result_cid = {0xC, 0x08};

    static final byte [] social_mode_id = {0xF, 0x00};
    static final byte [] llc_mode_id = {0xF, 0x01};
    static final byte [] blank_mode_id = {0xF, 0x02};
    static final byte [] translate_mode_id = {0xF, 0x03};
    static final byte [] visual_search_mode_viewfind_id = {0xF, 0x04};

    static final byte [] affective_conversation_message = {0xD, 0x01};
//    static final byte [] eye_contact_info_id_30 = {0x12, 0x02};
//    static final byte [] eye_contact_info_id_300 = {0x12, 0x03};
//    static final byte [] facial_emotion_info_id_5 = {0x13, 0x01};
//    static final byte [] facial_emotion_info_id_30 = {0x13, 0x02};
//    static final byte [] facial_emotion_info_id_300 = {0x13, 0x03};
//
//    static final byte [] img_id = {0x01, 0x10}; //id for images
    static final byte [] heart_beat_id = {0x19, 0x20}; //id for heart beat
//    static final byte [] ack_id = {0x13, 0x37};

    //static private BufferedReader input;
    static private DataInputStream input;
    static String SERVER_IP = "0.0.0.0"; //gets updated
    static int SERVER_PORT = 8989;
    private static int mConnectState = 0;

    //handle heart beat stuff
    private static long lastHeartbeatTime;
    private static int heartbeatInterval = 3000; //milliseconds
    private static int heartbeatPanicX = 3; // number of intervals before we reset connection
    static Thread HeartbeatThread = null;

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

    private GlboxClientSocket(Context context){
        //create send queue and a thread to handle sending
        data_queue = new ArrayBlockingQueue<byte[]>(queue_size);
        type_queue = new ArrayBlockingQueue<String>(queue_size);

        //service context set
        mContext = context;
    }

    public static GlboxClientSocket getInstance(Context c){
        if (clientsocket == null){
            clientsocket = new GlboxClientSocket(c);
        }
        return clientsocket;
    }

    public static void setIp(String ip){
        SERVER_IP = ip;
    }

    public static GlboxClientSocket getInstance(){
        if (clientsocket == null){
            return null;
        }
        return clientsocket;
    }

    public void startSocket(){
        //start first socketThread
        if (socket == null) {
            mConnectState = 1;
            Log.d(TAG, "onCreate starting");
            Log.d(TAG, "starting socket");
            SocketThread = new Thread(new SocketThread());
            SocketThread.start();

            //setup handler to handle keeping connection alive, all subsequent start of SocketThread
            //start a new handler thread to send heartbeats
            HandlerThread thread = new HandlerThread("HeartBeater");
            thread.start();
            Handler handler = new Handler(thread.getLooper());
            final int delay = 3000;
            final int min_delay = 3000;
            final int max_delay = 4000;
            Random rand = new Random();
            handler.postDelayed(new Runnable() {
                public void run() {
                    heartBeat();
                    //random delay for heart beat so as to disallow synchronized failure between client and server
                    int random_delay = rand.nextInt((max_delay - min_delay) + 1) + min_delay;
                    handler.postDelayed(this, random_delay);
                }
            }, delay);
        }
    }

    //heart beat checker - check if we have received a heart rate
    private void heartBeat(){
        //check if we are still connected.
        //if not , reconnect,
        //we don't need to actively send heart beats from the client, as it's assumed that we are ALWAYS streaming data. Later, if we have periods of time where no data is sent, we will want to send a heart beat perhaps. but the client doesn't really need to, we just need to check if we are still connected
        if (mConnectState == 0) {
            restartSocket();
        }

        //or, if haven't been receiving heart beats, restart socket
        if (mConnectState == 2) {
            if ((System.currentTimeMillis() - lastHeartbeatTime) > (heartbeatInterval * heartbeatPanicX)) {
                Log.d(TAG, "DIDN'T RECEIVE HEART BEATS, RESTARTING SOCKET");
                mConnectState = 0;
                restartSocket();
            }
        }
    }

    public static void restartSocket() {
        Log.d(TAG, "Restarting socket");
        mConnectState = 1;
        if (socket != null && (!socket.isClosed())){
            try {
                output.close();
                input.close();
                socket.close();
            } catch (IOException e) {
                System.out.println("FAILED TO CLOSE SOCKET, SOMETHING IS WRONG");
            }
        }


//        //kill threads
//        stopThread(SendThread);
//        stopThread(ReceiveThread);

        //restart socket thread
        Log.d(TAG, "starting socket");
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

//    public void sendBytes(byte[] id, byte [] data, String type){
//        //handle different types differently
//        if (type == "image"){
//            image_buf_size++;
//        }
//        //first, send hello
//        byte [] hello = {0x01, 0x02, 0x03};
//        //then send length of body
//        byte[] len;
//        if (data != null) {
//            len = my_int_to_bb_be(data.length);
//        } else {
//            len = my_int_to_bb_be(0);
//        }
//        //then send id of message type
//        byte [] msg_id = id;
//        //then send data
//        byte [] body = data;
//        //then send end tag - eventually make this unique to the image
//        byte [] goodbye = {0x3, 0x2, 0x1};
//        //combine those into a payload
//        ByteArrayOutputStream outputStream;
//        try {
//            outputStream = new ByteArrayOutputStream();
//            outputStream.write(hello);
//            outputStream.write(len);
//            outputStream.write(msg_id);
//            if (body != null) {
//                outputStream.write(body);
//            }
//            outputStream.write(goodbye);
//        } catch (IOException e){
//            mConnectState = 0;
//            return;
//        }
//        byte [] payload = outputStream.toByteArray();
//
//        //send it in a background thread
//        //new Thread(new SendThread(payload)).start();
//        boolean try_send;
//        if (type == "image"){
//            if (data_queue.size() < (queue_size / 2)){ //if our queue is over half full, don't keep adding images to queue
//                try_send = true;
//            } else {
//                try_send = false;
//            }
//        } else { //if not an image, try to send anyway
//            try_send = true;
//        }
//
//        //add the data to the send queue
//        if (try_send) {
//            try {
//                data_queue.add(payload);
//                type_queue.add(type);
//            } catch (IllegalStateException e) {
//                Log.d(TAG, "Queue is full, skipping this one");
//            }
//        }
//    }
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


    //returns how many images are in the buffer
    public int getImageBuf(){
        return image_buf_size;
    }

    public int getConnected(){
        return mConnectState;
    }

    static class SocketThread implements Runnable {
        public void run() {
            try {
                System.out.println("TRYING TO CONNECT GLBOX");
                socket = new Socket(SERVER_IP, SERVER_PORT);
                lastHeartbeatTime = System.currentTimeMillis();
                System.out.println("GLBOX CONNECTED!");
                output = new DataOutputStream(socket.getOutputStream());
                //input = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                input = new DataInputStream(new DataInputStream(socket.getInputStream()));
                mConnectState = 2;
                //make the threads that will send and receive
                if (ReceiveThread == null) { //if the thread is null, make a new one (the first one)
                    ReceiveThread = new Thread(new ReceiveThread());
                    ReceiveThread.start();
                } else if (!ReceiveThread.isAlive()) { //if the thread is not null but it's dead, let it join then start a new one
                    Log.d(TAG, "IN SocketThread, WAITING FOR receive THREAD JOING");
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

    static class ReceiveThread implements Runnable {
        @Override
        public void run() {
            Log.d(TAG, "GLBOX starting ReceiveThread");
            while (true) {
                if (mConnectState != 2){
                    System.out.println("MCONNECTED IS FALSE IN REEIVE THREAD, BREAKING");
                    break;
                }

//                try {
//                    System.out.println("GLBOX PRETRANSCRIPT:");

//                    String transcript = readLine(input);
//                    System.out.println("GLBOX TRANSCRIPT:");
//                    System.out.println(transcript);
//                    final Intent intent = new Intent();
//                    intent.putExtra(GlboxClientSocket.REGULAR_TRANSCRIPT, transcript);
//                    intent.setAction(GlboxClientSocket.ACTION_RECEIVE_TEXT);
//                    mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from

//                    Byte transcript = input.readByte();
//                    System.out.println("GLBOX TRANSCRIPT:");
//                    System.out.println(Byte.toString(transcript));
//                } catch (IOException e) {
//                    System.out.println("IOException getting transcript string.");
//                    mConnectState = 0;
//                    break;
//                }

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
                    } else {
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
                //if ((b1 == ack_id[0]) && (b2 == ack_id[1])) { //got ack response
                if ((b1 == final_transcript_cid[0]) && (b2 == final_transcript_cid[1])) { //got ack response
                    Log.d(TAG, "final_transcript_cid received");
                    String final_transcript_json_string = new String(raw_data, StandardCharsets.UTF_8);
                    JSONObject transcript_object;
                    try {
                        transcript_object = new JSONObject(final_transcript_json_string);
                        final Intent intent = new Intent();
                        intent.putExtra(GlboxClientSocket.FINAL_REGULAR_TRANSCRIPT, transcript_object.toString());
                        intent.setAction(GlboxClientSocket.ACTION_RECEIVE_TEXT);
                        dataObservable.onNext(transcript_object);
                        mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
                        Log.d(TAG, "F. Transcript is: " + transcript_object.toString());
                    } catch (JSONException e) {
                    }
                } else if ((b1 == heart_beat_id[0]) && (b2 == heart_beat_id[1])) { //heart beat check if alive
                    //got heart beat, respond with heart beat
                    //clientsocket.sendBytes(heart_beat_id, null, "heartbeat");
                    lastHeartbeatTime = System.currentTimeMillis();
                } else if ((b1 == intermediate_transcript_cid[0]) && (b2 == intermediate_transcript_cid[1])) { //got ack response
                    Log.d(TAG, "intermediate_transcript_cid received");
                    String intermediate_transcript = new String(raw_data, StandardCharsets.UTF_8);
                    final Intent intent = new Intent();
                    intent.putExtra(GlboxClientSocket.INTERMEDIATE_REGULAR_TRANSCRIPT, intermediate_transcript);
                    intent.setAction(GlboxClientSocket.ACTION_RECEIVE_TEXT);
                    mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
                    Log.d(TAG, "I. Transcript is: " + intermediate_transcript);
                } else if ((b1 == switch_mode_cid[0]) && (b2 == switch_mode_cid[1])) { //got ack response
                    Log.d(TAG, "switch mode found");
                    Log.d(TAG, raw_data.toString());
                    //the follow if block should be made WAY simpler ... just a dictionary or something
                    if ((raw_data[0] == social_mode_id[0]) && (raw_data[1] == social_mode_id[1])) { //got ack response
                        Log.d(TAG, "SWITCHING TO SOCIAL MODE");
                        final Intent intent = new Intent();
                        intent.setAction(GlboxClientSocket.COMMAND_SWITCH_MODE);
                        intent.putExtra(GlboxClientSocket.COMMAND_ARG, "social");
                        mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
                    } else if ((raw_data[0] == llc_mode_id[0]) && (raw_data[1] == llc_mode_id[1])) { //got ack response
                        Log.d(TAG, "SWITCHING TO LLC MODE");
                        final Intent intent = new Intent();
                        intent.setAction(GlboxClientSocket.COMMAND_SWITCH_MODE);
                        intent.putExtra(GlboxClientSocket.COMMAND_ARG, "llc");
                        mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
                    } else if ((raw_data[0] == blank_mode_id[0]) && (raw_data[1] == blank_mode_id[1])) { //got ack response
                        Log.d(TAG, "BLANK TOGGLE");
                        final Intent intent = new Intent();
                        intent.setAction(GlboxClientSocket.COMMAND_SWITCH_MODE);
                        intent.putExtra(GlboxClientSocket.COMMAND_ARG, "blank");
                        mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
                    } else if ((raw_data[0] == translate_mode_id[0]) && (raw_data[1] == translate_mode_id[1])) { //got ack response
                        Log.d(TAG, "TRANSLATE MODE TOGGLE");
                        final Intent intent = new Intent();
                        intent.setAction(GlboxClientSocket.COMMAND_SWITCH_MODE);
                        intent.putExtra(GlboxClientSocket.COMMAND_ARG, "translate");
                        mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
                    } else if ((raw_data[0] == visual_search_mode_viewfind_id[0]) && (raw_data[1] == visual_search_mode_viewfind_id[1])) { //got ack response
                        Log.d(TAG, "VISUAL SEARCH MODE VIEWFIND TOGGLE");
                        final Intent intent = new Intent();
                        intent.setAction(GlboxClientSocket.COMMAND_SWITCH_MODE);
                        intent.putExtra(GlboxClientSocket.COMMAND_ARG, "visualsearchviewfind");
                        mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
                    }
                } else if ((b1 == command_response_cid[0]) && (b2 == command_response_cid[1])) { //got command response
                    Log.d(TAG, "command_response_cid received");
                    String response_string = new String(raw_data, StandardCharsets.UTF_8);
                    final Intent intent = new Intent();
                    intent.putExtra(GlboxClientSocket.COMMAND_RESPONSE, response_string);
                    intent.setAction(GlboxClientSocket.ACTION_RECEIVE_TEXT);
                    mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
                } else if ((b1 == wikipedia_result_cid [0]) && (b2 == wikipedia_result_cid [1])) { //got command response
                    Log.d(TAG, "wikipedia_result_cid received");
                    String wikipedia_result_json_string = new String(raw_data, StandardCharsets.UTF_8);
                    JSONObject wikipedia_result_json;
                    try {
                        wikipedia_result_json = new JSONObject(wikipedia_result_json_string);
                        //we have to pull out the image, decode it, save locally, and then send the location of that saved file, because an image is too big to communicate over IPC (Android Intent)
                        String img_string = wikipedia_result_json.getString("image");
                        byte[] img_b64_bytes = img_string.getBytes("UTF-8");
                        byte[] img_bytes = Base64.decode(img_b64_bytes, Base64.DEFAULT);
                        img_b64_bytes = null;
                        File img_file = savePicture(img_bytes);
                        String img_path = img_file.getAbsolutePath();
                        wikipedia_result_json.remove("image");
                        wikipedia_result_json.put("image_path", img_path);
                        img_bytes = null;
                        System.gc();

                        final Intent intent = new Intent();
                        intent.putExtra(GlboxClientSocket.WIKIPEDIA_RESULT, wikipedia_result_json.toString());
                        intent.setAction(GlboxClientSocket.ACTION_WIKIPEDIA_RESULT);
                        mContext.sendBroadcast(intent);
                    } catch( JSONException e){
                        Log.d(TAG, e.toString());
                    } catch (UnsupportedEncodingException e){
                        Log.d(TAG, e.toString());
                    }
                } else if ((b1 == translation_result_cid[0]) && (b2 == translation_result_cid[1])) { //got command response
                    Log.d(TAG, "translation_result_cid received");
                    String translated_text_string = new String(raw_data, StandardCharsets.UTF_8);
                    final Intent intent = new Intent();
                    intent.putExtra(GlboxClientSocket.TRANSLATION_RESULT, translated_text_string);
                    intent.setAction(GlboxClientSocket.ACTION_TRANSLATION_RESULT);
                    mContext.sendBroadcast(intent);
                } else if ((b1 == visual_search_images_result_cid[0]) && (b2 == visual_search_images_result_cid[1])) { //got command response
                    Log.d(TAG, "visual_search_images_result_cid received");
                    String str_data = new String(raw_data, StandardCharsets.UTF_8);
                    final Intent intent = new Intent();
                    intent.putExtra(GlboxClientSocket.VISUAL_SEARCH_RESULT, str_data);
                    intent.setAction(GlboxClientSocket.ACTION_VISUAL_SEARCH_RESULT);
                    mContext.sendBroadcast(intent);

//                    String translated_text_string = new String(raw_data, StandardCharsets.UTF_8);
//                    final Intent intent = new Intent();
//                    intent.putExtra(GlboxClientSocket.TRANSLATION_RESULT, translated_text_string);
//                    intent.setAction(GlboxClientSocket.ACTION_TRANSLATION_RESULT);
//                    mContext.sendBroadcast(intent);
                } else if ((b1 == affective_summary_result_cid[0]) && (b2 == affective_summary_result_cid[1])) { //got command response
                    Log.d(TAG, "affective_summary_result_cid received");
                    String str_data = new String(raw_data, StandardCharsets.UTF_8);
                    final Intent intent = new Intent();
                    intent.putExtra(GlboxClientSocket.AFFECTIVE_SUMMARY_RESULT, str_data);
                    intent.setAction(GlboxClientSocket.ACTION_AFFECTIVE_SUMMARY_RESULT);
                    mContext.sendBroadcast(intent);
                }

//                } else if ((b1 == heart_beat_id[0]) && (b2 == heart_beat_id[1])) { //heart beat check if alive
//                    //got heart beat, respond with heart beat
//                    clientsocket.sendBytes(heart_beat_id, null, "heartbeat");
//                } else if ((b1 == eye_contact_info_id_5[0]) && (b2 == eye_contact_info_id_5[1])) { //we got a message with information to display
//                    Log.d(TAG, "eye contact info 5");
//                    String message = Integer.toString(my_bb_to_int_be(raw_data));
//                    final Intent intent = new Intent();
//                    intent.putExtra(GlboxClientSocket.EYE_CONTACT_5_MESSAGE, message);
//                    intent.setAction(GlboxClientSocket.ACTION_RECEIVE_MESSAGE);
//                    mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
//                } else if ((b1 == eye_contact_info_id_30[0]) && (b2 == eye_contact_info_id_30[1])) { //we got a message with information to display
//                    String message = Integer.toString(my_bb_to_int_be(raw_data));
//                    final Intent intent = new Intent();
//                    intent.putExtra(GlboxClientSocket.EYE_CONTACT_30_MESSAGE, message);
//                    intent.setAction(GlboxClientSocket.ACTION_RECEIVE_MESSAGE);
//                    mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
//                } else if ((b1 == eye_contact_info_id_300[0]) && (b2 == eye_contact_info_id_300[1])) { //we got a message with information to display
//                    String message = Integer.toString(my_bb_to_int_be(raw_data));
//                    final Intent intent = new Intent();
//                    intent.putExtra(GlboxClientSocket.EYE_CONTACT_300_MESSAGE, message);
//                    intent.setAction(GlboxClientSocket.ACTION_RECEIVE_MESSAGE);
//                    mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
//                } else if ((b1 == facial_emotion_info_id_5[0]) && (b2 == facial_emotion_info_id_5[1])) {
//                    String message = new String(raw_data);
//                    final Intent intent = new Intent();
//                    intent.putExtra(GlboxClientSocket.FACIAL_EMOTION_5_MESSAGE, message);
//                    intent.setAction(GlboxClientSocket.ACTION_RECEIVE_MESSAGE);
//                    mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
//                }  else if ((b1 == facial_emotion_info_id_30[0]) && (b2 == facial_emotion_info_id_30[1])) {
//                    String message = new String(raw_data);
//                    final Intent intent = new Intent();
//                    intent.putExtra(GlboxClientSocket.FACIAL_EMOTION_30_MESSAGE, message);
//                    intent.setAction(GlboxClientSocket.ACTION_RECEIVE_MESSAGE);
//                    mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
//                }  else if ((b1 == facial_emotion_info_id_300[0]) && (b2 == facial_emotion_info_id_300[1])) {
//                    String message = new String(raw_data);
//                    final Intent intent = new Intent();
//                    intent.putExtra(GlboxClientSocket.FACIAL_EMOTION_300_MESSAGE, message);
//                    intent.setAction(GlboxClientSocket.ACTION_RECEIVE_MESSAGE);
//                    mContext.sendBroadcast(intent); //eventually, we won't need to use the activity context, as our service will have its own context to send from
//                } else {
//                    System.out.println("BAD SIGNAL, RECONNECT");
//                    mConnectState = 0;
//                    break;
//                }
            }
            mConnectState = 0;
        }
    }

    private static File getDir() {
        File sdDir = Environment
                .getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
        return new File(sdDir, "WearableAI_Cache");
    }

    private static File savePicture(byte[] data){
//        byte[] data = Base64.encodeToString(ata, Base64.DEFAULT).getBytes();
        File pictureFileDir = getDir();

        if (!pictureFileDir.exists() && !pictureFileDir.mkdirs()) {

            Log.d("PHOTO_HANDLER", "Can't create directory to save image.");
            return null;

        }

        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyymmddhhmmss");
        String date = dateFormat.format(new Date());
        String photoFile = "Picture_" + date + ".jpg";

        String filename = pictureFileDir.getPath() + File.separator + photoFile;

        File pictureFile = new File(filename);

        try {
            FileOutputStream fos = new FileOutputStream(pictureFile);
            fos.write(data);
            fos.close();
            Log.d(TAG, "File saved: " + filename);
        } catch (Exception error) {
            Log.d(TAG, "File" + filename + "not saved: "
                    + error.getMessage());
        }
        return pictureFile;
    }

    static class SendThread implements Runnable {
        SendThread() {
        }
        @Override
        public void run() {
            if (mConnectState != 2){
                System.out.println("MCONNECTED IS FALSE IN SendThread, returning");
                return;
            }
            //clear queue so we don't have a buildup of images
            data_queue.clear();
            type_queue.clear();
            while (true) {
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

    /** Reads UTF-8 character data; lines are terminated with '\n' */
    public static String readLine(DataInputStream in) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        while (true) {
            int b = in.readByte();
            if (b < 0) {
                throw new IOException("Data truncated");
            }
            if (b == 0x0A) {
                break;
            }
            buffer.write(b);
        }
        return new String(buffer.toByteArray(), "UTF-8");
    }


    public void setObservable(PublishSubject<JSONObject> observable){
        dataObservable = observable;
        dataSubscriber = dataObservable.subscribe(i -> parseData(i));
    }

    private void parseData(JSONObject data){
        Log.d(TAG, "Parsing data");
        try {
            String typeOf = data.getString("type");
            if (typeOf.equals("affective_conversation")) {
                Log.d(TAG, data.toString());
                sendBytes(affective_conversation_message, data.toString().getBytes(), "message");
            }
        } catch (JSONException e){
            e.printStackTrace();
        }
    }


}
