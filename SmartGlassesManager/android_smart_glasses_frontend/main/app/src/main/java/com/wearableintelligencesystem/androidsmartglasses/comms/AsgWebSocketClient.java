package com.wearableintelligencesystem.androidsmartglasses.comms;

/*
 * Copyright (c) 2010-2020 Nathan Rajlich
 *
 *  Permission is hereby granted, free of charge, to any person
 *  obtaining a copy of this software and associated documentation
 *  files (the "Software"), to deal in the Software without
 *  restriction, including without limitation the rights to use,
 *  copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the
 *  Software is furnished to do so, subject to the following
 *  conditions:
 *
 *  The above copyright notice and this permission notice shall be
 *  included in all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 *  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 *  OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 *  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 *  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 *  WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 *  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 *  OTHER DEALINGS IN THE SOFTWARE.
 */

import android.util.Log;

import java.net.URI;
import java.nio.ByteBuffer;
import java.util.Map;
import org.java_websocket.client.WebSocketClient;

import org.java_websocket.drafts.Draft;
import org.java_websocket.handshake.ServerHandshake;
import org.json.JSONException;
import org.json.JSONObject;

import io.reactivex.rxjava3.disposables.Disposable;
import io.reactivex.rxjava3.subjects.PublishSubject;

/**
 * This example demonstrates how to create a websocket connection to a server. Only the most
 * important callbacks are overloaded.
 */
public class AsgWebSocketClient extends WebSocketClient {
    private String TAG = "WearableAI_WebSocketClient";
    private int connected = 0;
    private URI serverURI;
    private WebSocketManager webSocketManager;
    public boolean killme = true; //shouldn't try to stay alive until we are born - i.e. one successful connect

    //observables to send data around app
    PublishSubject<JSONObject> dataObservable;
    Disposable dataSubscriber;

    private String mySourceName;

    public AsgWebSocketClient(URI serverUri, Draft draft) {
        super(serverUri, draft);

    }

    public void sendHeartBeat(){
//        Log.d(TAG, "send heartbeat");
        try {
            JSONObject ping = new JSONObject();
            ping.put(MessageTypes.MESSAGE_TYPE_LOCAL, MessageTypes.PING);
            ping.put("ping", "ping");
            //send(ping.toString());
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public AsgWebSocketClient(WebSocketManager manager, URI serverURI) {
        super(serverURI);
        connected = 0;
        webSocketManager = manager;
        this.serverURI = serverURI;
        setup();
    }

    public AsgWebSocketClient(URI serverUri, Map<String, String> httpHeaders) {
        super(serverUri, httpHeaders);
        setup();
    }

    private void setup(){
        //dataObservable = PublishSubject.create();
        mySourceName = "web_socket";
    }

    public void setObservable(PublishSubject<JSONObject> dataO){
        dataObservable = dataO;
    }

    public void setSourceName(String name){
        mySourceName = name;
    }

    public PublishSubject<JSONObject> getDataObservable(){
        return dataObservable;
    }

    //stop this socket, the socket will NOT try to restart itself after this, so whoever calls this must handle restart, thus should only be called by WebSocketManager
    public boolean stop(){
        killme = true;
        Log.d(TAG, "Stopping Web socket");
        connected = 0;
        if (! isClosed()) {
            close();
            getConnection().closeConnection(1000, "closing");
//            try {
//                closeBlocking();
//                Log.d(TAG, "Successfully closed");
//            } catch (InterruptedException e) {
//                Log.d(TAG, "Failed to close");
//                e.printStackTrace();
//                return false;
//            }
        }
        return true;
    }

    @Override
    public void onOpen(ServerHandshake handshakedata) {
        killme = false;
        connected = 2;
        Log.d(TAG, "Web Socket CONNECTED");
        setConnectionLostTimeout(6);
        startConnectionLostTimer();
        dataSubscriber = dataObservable.subscribe(i -> parseData(i));
        // if you plan to refuse connection based on ip or httpfields overload: onWebsocketHandshakeReceivedAsClient
    }

    @Override
    public void onMessage(String message) {
        try {
//            Log.d(TAG, "received: " + message);
            JSONObject json_message = new JSONObject(message);
            json_message.put("local_source", mySourceName); //ad our set name so rest of program knows the source of this message
            dataObservable.onNext(json_message);
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    @Override
    public void onMessage(ByteBuffer message) {
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
        Log.d(TAG, "onClose called");
        connected = 0;
        if (dataSubscriber != null) {
            Log.d(TAG, "dispose data subscriber");
            dataSubscriber.dispose();
        }

        if (!killme) {
            Log.d(TAG, "Ask manager to restart me");
            webSocketManager.onClose(); //tell manager that we are done and it should make a new socket to reconnect
        }

        // The codes are documented in class org.java_websocket.framing.CloseFrame
        Log.d(TAG,
                "Connection closed by " + (remote ? "remote peer" : "us") + " Code: " + code + " Reason: "
                        + reason);
        Log.d(TAG, "onClose complete");
    }

    @Override
    public void onError(Exception ex) {
        Log.d(TAG, "Web Socket error!");
        ex.printStackTrace();
        // if the error is fatal then onClose will be called additionally
    }


    public int getConnectionState(){
//        ReadyState ready_state = getReadyState();
//        if (ready_state == ReadyState.OPEN){
//            return 2;
//        } else if ((ready_state == ReadyState.CLOSING) || (ready_state == ReadyState.CLOSED)){
//            return 1;
//        } else {
//            return 0;
//        }
        return connected;
    }


    //this to be moved into the ASPRepresentative class
    private void parseData(JSONObject data){
        try {
            String typeOf = data.getString(MessageTypes.MESSAGE_TYPE_LOCAL);
            if (typeOf.equals(MessageTypes.AUDIO_CHUNK_DECRYPTED)) {
                //sendString(data.getString(MessageTypes.AUDIO_DATA));
                sendJson(data);
            } else if (typeOf.equals(MessageTypes.VISUAL_SEARCH_QUERY)) {
                sendJson(data);
            } else if (typeOf.equals(MessageTypes.POV_IMAGE)) {
                sendJson(data);
            }
    } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public void sendJson(JSONObject data){
        String encodedData = data.toString();
        sendString(encodedData);
    }

    public void sendString(String data){
        if (connected == 2){
            send(data);
        } else {
            Log.d(TAG, "CANNOT SEND JSON, NOT CONNECTED");
        }
    }

}