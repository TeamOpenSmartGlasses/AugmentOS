package com.teamopensmartglasses.convoscope;

import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import com.teamopensmartglasses.convoscope.events.SharingContactChangedEvent;
import com.teamopensmartglasses.convoscope.convoscopebackend.BackendServerComms;
import com.teamopensmartglasses.convoscope.convoscopebackend.VolleyJsonCallback;
import com.teamopensmartglasses.sgmlib.DataStreamType;
import com.teamopensmartglasses.sgmlib.FocusStates;
import com.teamopensmartglasses.sgmlib.SGMCommand;
import com.teamopensmartglasses.sgmlib.SGMLib;
import com.teamopensmartglasses.sgmlib.SmartGlassesAndroidService;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.UUID;

public class ConvoscopeService extends SmartGlassesAndroidService {
    public final String TAG = "Convoscope_ConvoscopeService";
    public final String appName = "Convoscope";

    private final IBinder binder = new LocalBinder();
    public static final String ACTION_START_FOREGROUND_SERVICE = "CONVOSCOPE_ACTION_START_FOREGROUND_SERVICE";
    public static final String ACTION_STOP_FOREGROUND_SERVICE = "CONVOSCOPE_ACTION_STOP_FOREGROUND_SERVICE";

    //our instance of the SGM library
    public SGMLib sgmLib;

    //Convoscope stuff
    private BackendServerComms backendServerComms;
    ArrayList<String> responses;
    ArrayList<String> responsesToShare;
    private Handler handler = new Handler(Looper.getMainLooper());
    private Runnable runnableCode;
    static final String userId = "Convoscope_" + UUID.randomUUID().toString().replaceAll("_", "").substring(0, 5);
    static final String deviceId = "android";
    static final String features = "contextual_search_engine";

    private SMSComms smsComms;
    static String phoneNumName = "Alex";
    static String phoneNum = "8477367492"; // Alex's phone number. Fun default.

    private long currTime = 0;
    private long lastPressed = 0;
    private long lastTapped = 0;

    // Double clicking constants
    private final long doublePressTimeConst = 420;
    private final long doubleTapTimeConst = 600;

    public ConvoscopeService() {
        super(MainActivity.class,
                "convoscope_app",
                3288,
                "Convoscope",
                "Wearable intelligence upgrades. By TeamOpenSmartGlasses.", R.drawable.ic_launcher_background);
    }

    @Override
    public void onCreate() {
        super.onCreate();

        //make responses holder
        responses = new ArrayList<>();
        responsesToShare = new ArrayList<>();
        responses.add("Welcome to Convoscope - ask Jarvis questions, ask what you were talking about, request summary of <n> minutes.");

        //Create SGMLib instance with context: this
        sgmLib = new SGMLib(this);

        //Define command with a UUID
        UUID commandUUID = UUID.fromString("5b824bb6-d3b3-417d-8c74-3b103efb403f");
        SGMCommand command = new SGMCommand("Convoscope", commandUUID, new String[]{"Convoscope", "wearable intelligence"}, "AI wearable intelligence.");

        //Register the command
        Log.d(TAG, "Registering Convoscope command with SGMLib");
        sgmLib.registerCommand(command, this::convoscopeStartCommandCallback);

        //setup backend comms
        backendServerComms = new BackendServerComms(this);

        Log.d(TAG, "Convoscope SERVICE STARTED");

        EventBus.getDefault().register(this);

        setUpCsePolling();

        smsComms = new SMSComms();
    }

    public void setUpCsePolling(){
        runnableCode = new Runnable() {
            @Override
            public void run() {
                requestContextualSearchEngine();
                handler.postDelayed(this, 1000);
            }
        };
        handler.post(runnableCode);
    }

    @Override
    public void onDestroy(){
        handler.removeCallbacks(runnableCode);
        EventBus.getDefault().unregister(this);
        sgmLib.deinit();
        super.onDestroy();
    }

    public void convoscopeStartCommandCallback(String args, long commandTriggeredTime){
        Log.d("TAG","Convoscope start callback called");

        //request to be the in focus app so we can continue to show transcripts
        sgmLib.requestFocus(this::focusChangedCallback);

        //Subscribe to transcription stream
        sgmLib.subscribe(DataStreamType.TRANSCRIPTION_ENGLISH_STREAM, this::processTranscriptionCallback);
        sgmLib.subscribe(DataStreamType.SMART_RING_BUTTON, this::processButtonCallback);
        sgmLib.subscribe(DataStreamType.GLASSES_SIDE_TAP, this::processGlassesTapCallback);
    }

    public void focusChangedCallback(FocusStates focusState){
        Log.d(TAG, "Focus callback called with state: " + focusState);
        this.focusState = focusState;
    }

    public void processGlassesTapCallback(int numTaps, boolean sideOfGlasses, long timestamp){
        Log.d(TAG, "GLASSES TAPPED X TIMES: " + numTaps + " SIDEOFGLASSES: " + sideOfGlasses);
        if (numTaps == 3)
            sendLatestCSEResultViaSms();
    }
    public void processButtonCallback(int buttonId, long timestamp, boolean isDown){
        if(!isDown || buttonId != 1) return;
        Log.d(TAG,"DETECTED BUTTON PRESS W BUTTON ID: " + buttonId);
        currTime = System.currentTimeMillis();

        //Detect double presses
        if(isDown && currTime - lastPressed < doublePressTimeConst) {
            Log.d(TAG, "CurrTime-lastPressed: "+ (currTime-lastPressed));
            sendLatestCSEResultViaSms();
        }

        if(isDown) {
            lastPressed = System.currentTimeMillis();
        }
    }

    public void sendLatestCSEResultViaSms(){
        if (responses.size() > 1) {
            //Send latest CSE result via sms;
            String messageToSend = responsesToShare.get(responsesToShare.size() - 1);

            smsComms.sendSms(phoneNum, messageToSend);

            sgmLib.sendReferenceCard("Convoscope", "Sending result(s) via SMS to " + phoneNumName);
        }
    }

    public void processTranscriptionCallback(String transcript, long timestamp, boolean isFinal){
        Log.d(TAG, "PROCESS TRANSCRIPTION CALLBACK. IS IT FINAL? " + isFinal + " " + transcript);

        if (isFinal)
            sendFinalTranscriptToActivity(transcript);

        sendLLMQueryRequest(transcript, isFinal);
    }

    public void sendLLMQueryRequest(String query, boolean isFinal){
        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("text", query);
            jsonQuery.put("userId", userId);
            jsonQuery.put("isFinal", isFinal);
            jsonQuery.put("timestamp", System.currentTimeMillis() / 1000);
            backendServerComms.restRequest(BackendServerComms.LLM_QUERY_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        Log.d(TAG, "CALLING on Success");
                        parseLLMQueryResult(result);
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(){
                    Log.d(TAG, "SOME FAILURE HAPPENED");
                }

            });
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public void requestContextualSearchEngine(){
        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("userId", userId);
            jsonQuery.put("deviceId", deviceId);
            jsonQuery.put("features", features);
            backendServerComms.restRequest(BackendServerComms.CSE_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        Log.d(TAG, "CALLING on Success");
                        Log.d(TAG, "Result: " + result.toString());
                        
                        parseCSEResults(result);
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(){
                    Log.d(TAG, "SOME FAILURE HAPPENED");
                }

            });
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public void parseLLMQueryResult(JSONObject response) throws JSONException {
        Log.d(TAG, "Got result from server: " + response.toString());
        String message = response.getString("message");
        if (!message.equals("")) {
            responses.add(message);
            sendUiUpdateSingle(message);
            speakTTS(message);
        }
    }

    public void parseCSEResults(JSONObject response) throws JSONException {
        Log.d(TAG, "GOT CSE RESULT: " + response.toString());
        String imgKey = "image_url";
        String mapImgKey = "map_image_path";
        JSONArray results = response.getJSONArray("result");

        ArrayList<String> cseResults = new ArrayList<>();
        String sharableResponse = "";
        for (int i = 0; i < results.length(); i++){
            try {
                JSONObject obj = results.getJSONObject(i);
                String name = obj.getString("name");
                String body = obj.getString("summary");
                String combined = name + ": " + body;
                Log.d(TAG, name);
                Log.d(TAG, "--- " + body);
                responses.add(combined);
                sendUiUpdateSingle(combined);
                speakTTS(combined);

                cseResults.add(combined.substring(0,Math.min(90, combined.length())).trim().replaceAll("\\s+", " "));

//                if(obj.has(mapImgKey)){
//                    String mapImgPath = obj.getString(mapImgKey);
//                    String mapImgUrl = backendServerComms.serverUrl + mapImgPath;
//                    sgmLib.sendReferenceCard(name, body, mapImgUrl);
//                }
//                else if(obj.has(imgKey)) {
//                    sgmLib.sendReferenceCard(name, body, obj.getString(imgKey));
//                }
//                else {
//                    sgmLib.sendReferenceCard(name, body);
//                }

                // For SMS
                sharableResponse += combined;
                if(obj.has("url")){
                    sharableResponse += "\n" + obj.get("url");
                }
                sharableResponse += "\n\n";
                if(i == results.length() - 1){
                    sharableResponse += "Sent from Convoscope";
                }


            } catch (JSONException e){
                e.printStackTrace();
            }
        }
        responsesToShare.add(sharableResponse);
        String[] cseResultsArr = cseResults.toArray(new String[cseResults.size()]);
        sgmLib.sendBulletPointList("Convoscope", cseResultsArr);
    }

    public void speakTTS(String toSpeak){
        sgmLib.sendTextLine(toSpeak);
    }

    public void sendUiUpdateFull(){
        Intent intent = new Intent();
        intent.setAction(MainActivity.UI_UPDATE_FULL);
        intent.putStringArrayListExtra(MainActivity.CONVOSCOPE_MESSAGE_STRING, responses);
        sendBroadcast(intent);
    }

    public void sendUiUpdateSingle(String message) {
        Intent intent = new Intent();
        intent.setAction(MainActivity.UI_UPDATE_SINGLE);
        intent.putExtra(MainActivity.CONVOSCOPE_MESSAGE_STRING, message);
        sendBroadcast(intent);
    }

    public void sendFinalTranscriptToActivity(String transcript){
        Intent intent = new Intent();
        intent.setAction(MainActivity.UI_UPDATE_FINAL_TRANSCRIPT);
        intent.putExtra(MainActivity.FINAL_TRANSCRIPT, transcript);
        sendBroadcast(intent);
    }

    public void buttonDownEvent(int buttonNumber, boolean downUp){ //downUp if true if down, false if up
        if (!downUp){
            return;
        }

        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("button_num", buttonNumber);
            jsonQuery.put("button_activity", downUp);
            jsonQuery.put("userId", userId);
            jsonQuery.put("timestamp", System.currentTimeMillis() / 1000);
            backendServerComms.restRequest(BackendServerComms.BUTTON_EVENT_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        Log.d(TAG, "GOT BUTTON RESULT: " + result.toString());
                        String query_answer = result.getString("message");
                        sendUiUpdateSingle(query_answer);
                        speakTTS(query_answer);
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(){
                    Log.d(TAG, "SOME FAILURE HAPPENED");
                }

            });
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    @Subscribe
    public void onContactChangedEvent(SharingContactChangedEvent receivedEvent){
        Log.d(TAG, "GOT NEW PHONE NUMBER: " + receivedEvent.phoneNumber);
        String newNum = receivedEvent.phoneNumber;
        phoneNumName = receivedEvent.name;
        phoneNum = newNum.replaceAll("[^0-9]", "");
    }
}