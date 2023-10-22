package com.teamopensmartglasses.convoscope;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import com.teamopensmartglasses.convoscope.events.SharingContactChangedEvent;
import com.teamopensmartglasses.convoscope.convoscopebackend.BackendServerComms;
import com.teamopensmartglasses.convoscope.convoscopebackend.VolleyJsonCallback;
import com.teamopensmartglasses.convoscope.events.UserIdChangedEvent;
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

    //our instance of the SGM library
    public SGMLib sgmLib;

    //Convoscope stuff
    private BackendServerComms backendServerComms;
    ArrayList<String> responses;
    ArrayList<String> responsesToShare;
    private Handler handler = new Handler(Looper.getMainLooper());
    private Runnable runnableCode;
    static String userId;
    static final String deviceId = "android";
    static final String [] features = {"contextual_search_engine", "proactive_agent_insights"};

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
        responses.add("Welcome to Convoscope.");

        //Create SGMLib instance with context: this
        sgmLib = new SGMLib(this);

        //Define command with a UUID
        UUID commandUUID = UUID.fromString("5b824bb6-d3b3-417d-8c74-3b103efb403f");
        SGMCommand command = new SGMCommand("Convoscope", commandUUID, new String[]{"convoscope", "wearable intelligence"}, "AI wearable intelligence.");

        //Register the command
        Log.d(TAG, "Registering Convoscope command with SGMLib");
        sgmLib.registerCommand(command, this::convoscopeStartCommandCallback);

        //setup backend comms
        backendServerComms = new BackendServerComms(this);

        Log.d(TAG, "Convoscope SERVICE STARTED");

        EventBus.getDefault().register(this);

        userId = getUserId();

        setUpCsePolling();

        smsComms = new SMSComms();

        runConvoscope();
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

    public void runConvoscope(){
        //request to be the in focus app so we can continue to show transcripts
//        sgmLib.requestFocus(this::focusChangedCallback);
        if (focusState == FocusStates.OUT_FOCUS){
            sgmLib.requestFocus(this::focusChangedCallback);
        }

        //Subscribe to transcription stream
        sgmLib.subscribe(DataStreamType.TRANSCRIPTION_ENGLISH_STREAM, this::processTranscriptionCallback);
        sgmLib.subscribe(DataStreamType.SMART_RING_BUTTON, this::processButtonCallback);
        sgmLib.subscribe(DataStreamType.GLASSES_SIDE_TAP, this::processGlassesTapCallback);
    }

    public void convoscopeStartCommandCallback(String args, long commandTriggeredTime){
        Log.d("TAG","Convoscope start callback called");
        runConvoscope();
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
        if (phoneNum == "") return;

        if (responses.size() > 1) {
            //Send latest CSE result via sms;
            String messageToSend = responsesToShare.get(responsesToShare.size() - 1);

            smsComms.sendSms(phoneNum, messageToSend);

            sgmLib.sendReferenceCard("Convoscope", "Sending result(s) via SMS to " + phoneNumName);
        }
    }

    private Handler debounceHandler = new Handler(Looper.getMainLooper());
    private Runnable debounceRunnable;

//    private void debounceAndSendTranscript(String transcript, boolean isFinal){
//        debounceHandler.removeCallbacks(debounceRunnable);
//        if (isFinal){
//            sendLLMQueryRequest(transcript, isFinal);
//        } else {
//            debounceRunnable = () -> sendLLMQueryRequest(transcript, isFinal);
//            debounceHandler.postDelayed(debounceRunnable, 900);
//        }
//    }



    public void processTranscriptionCallback(String transcript, long timestamp, boolean isFinal){
        Log.d(TAG, "PROCESS TRANSCRIPTION CALLBACK. IS IT FINAL? " + isFinal + " " + transcript);

        if (isFinal)
            sendFinalTranscriptToActivity(transcript);

        //debounce and then send to backend
        debounceAndSendTranscript(transcript, isFinal);
    }

    private long lastSentTime = 0;
    private final long DEBOUNCE_DELAY = 250; // in milliseconds
    private void debounceAndSendTranscript(String transcript, boolean isFinal) {
        debounceHandler.removeCallbacks(debounceRunnable);
        long currentTime = System.currentTimeMillis();
        if (isFinal) {
            sendLLMQueryRequest(transcript, isFinal);
        } else { //if intermediate
            if (currentTime - lastSentTime >= DEBOUNCE_DELAY) {
                sendLLMQueryRequest(transcript, isFinal);
                lastSentTime = currentTime;
            } else {
                debounceRunnable = () -> {
                    sendLLMQueryRequest(transcript, isFinal);
                    lastSentTime = System.currentTimeMillis();
                };
                debounceHandler.postDelayed(debounceRunnable, DEBOUNCE_DELAY);
            }
        }
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
                        //Log.d(TAG, "CALLING on Success");
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
            JSONArray featuresArray = new JSONArray(features);
            jsonQuery.put("userId", userId);
            jsonQuery.put("deviceId", deviceId);
            jsonQuery.put("features", featuresArray);
            System.out.println(jsonQuery);
            backendServerComms.restRequest(BackendServerComms.CSE_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        //Log.d(TAG, "CALLING on Success");
                        //Log.d(TAG, "Result: " + result.toString());
                        
                        parseConvoscopeResults(result);
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
//        Log.d(TAG, "Got result from server: " + response.toString());
        String message = response.getString("message");
        //DEV
        return;
//        if (!message.equals("")) {
//            responses.add(message);
//            sendUiUpdateSingle(message);
//            speakTTS(message);
//        }
    }

    public void parseConvoscopeResults(JSONObject response) throws JSONException {
//        Log.d(TAG, "GOT CSE RESULT: " + response.toString());
        String imgKey = "image_url";
        String mapImgKey = "map_image_path";
        JSONArray cseResults = response.getJSONArray("result");
        JSONArray proactiveAgentResults = response.getJSONArray("results_proactive_agent_insights");

        if (cseResults.length() > 0){
            Log.d(TAG, "GOT CSE RESULTS: " + response.toString());
        }

        //all the stuff from the results that we want to display
        ArrayList<String> resultsToDisplayList = new ArrayList<>();

        //go through CSE results and add to resultsToDisplayList
        String sharableResponse = "";
        for (int i = 0; i < cseResults.length(); i++){
            try {
                JSONObject obj = cseResults.getJSONObject(i);
                String name = obj.getString("name");
                String body = obj.getString("summary");
                String combined = name + ": " + body;
                Log.d(TAG, name);
                Log.d(TAG, "--- " + body);
                responses.add(combined);
                sendUiUpdateSingle(combined);
                speakTTS(combined);

                resultsToDisplayList.add(combined.substring(0,Math.min(72, combined.length())).trim().replaceAll("\\s+", " "));

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
                if(i == cseResults.length() - 1){
                    sharableResponse += "Sent from Convoscope";
                }


            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        //go through proactive agent results and add to resultsToDisplayList
        for (int i = 0; i < proactiveAgentResults.length(); i++){
            try {
                JSONObject obj = proactiveAgentResults.getJSONObject(i);
                String name = obj.getString("agent_name") + " says";
                String body = obj.getString("agent_insight");
                String combined = name + ": " + body;
                Log.d(TAG, name);
                Log.d(TAG, "--- " + body);
                responses.add(combined);
                sendUiUpdateSingle(combined);
                //speakTTS(combined);

                resultsToDisplayList.add(combined.substring(0,Math.min(72, combined.length())).trim().replaceAll("\\s+", " "));
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        if (resultsToDisplayList.size() == 0){
            return;
        }

        //add a response to share to the shareable response list
        responsesToShare.add(sharableResponse);

        //parse results to display and show on glasses
        String[] resultsToDisplayListArr = resultsToDisplayList.toArray(new String[resultsToDisplayList.size()]);
        sgmLib.sendBulletPointList("Convoscope", resultsToDisplayListArr);
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

    @Subscribe
    public void onUserIdChangedEvent(UserIdChangedEvent receivedEvent){
        Log.d(TAG, "GOT NEW USERID: " + receivedEvent.userId);
        setUserId(receivedEvent.userId);
    }

    public void setUserId(String newUserId){
        SharedPreferences sharedPreferences = getSharedPreferences(appName, MODE_PRIVATE);
        SharedPreferences.Editor editor = sharedPreferences.edit();
        editor.putString("userId", newUserId);
        editor.apply();

        userId = newUserId;
    }

    public String getUserId(){
        SharedPreferences sharedPreferences = getSharedPreferences(appName, MODE_PRIVATE);
        String value = sharedPreferences.getString("userId", "noUserIdFound");

        if (value == "noUserIdFound"){
            String randomUserId = "Convoscope_" + UUID.randomUUID().toString().replaceAll("_", "").substring(0, 5);
            setUserId(randomUserId);
            return randomUserId;
        }

        return value;
    }
}
