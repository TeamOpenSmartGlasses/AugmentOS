package com.teamopensmartglasses.convoscope;

import static com.teamopensmartglasses.convoscope.Constants.*;

import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GetTokenResult;
import com.teamopensmartglasses.convoscope.events.GoogleAuthFailedEvent;
import com.teamopensmartglasses.convoscope.events.SharingContactChangedEvent;
import com.teamopensmartglasses.convoscope.convoscopebackend.BackendServerComms;
import com.teamopensmartglasses.convoscope.convoscopebackend.VolleyJsonCallback;
import com.teamopensmartglasses.convoscope.ui.ConvoscopeUi;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.SmartRingButtonOutputEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.SpeechRecOutputEvent;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

import com.teamopensmartglasses.smartglassesmanager.SmartGlassesAndroidService;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.GlassesTapOutputEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.SmartRingButtonOutputEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.SpeechRecOutputEvent;

public class ConvoscopeService extends SmartGlassesAndroidService {
    public final String TAG = "Convoscope_ConvoscopeService";

    private final IBinder binder = new LocalBinder();

    //our instance of the SGM library
    //public SGMLib sgmLib;

    //Convoscope stuff
    String authToken = "";
    private BackendServerComms backendServerComms;
    ArrayList<String> responses;
    ArrayList<String> responsesToShare;
    private Handler csePollLoopHandler = new Handler(Looper.getMainLooper());
    private Runnable cseRunnableCode;
    private Handler displayPollLoopHandler = new Handler(Looper.getMainLooper());
    private Runnable displayRunnableCode;
    static final String deviceId = "android";
    static final String [] features = {"proactive_agent_insights", "explicit_agent_insights", "intelligent_entity_definitions", "language_learning"};
//    private SMSComms smsComms;
    static String phoneNumName = "Alex";
    static String phoneNum = "8477367492"; // Alex's phone number. Fun default.
    long previousWakeWordTime = -1; // Initialize this at -1
    static int maxBullets = 2; // Maximum number of bullet points per display iteration
    long latestDisplayTime = 0; // Initialize this at 0
    long minimumDisplayRate = 0; // Initialize this at 0
    long minimumDisplayRatePerResult = 4000; // Rate-limit displaying new results to 4 seconds per result

    private long currTime = 0;
    private long lastPressed = 0;
    private long lastTapped = 0;

    // Double clicking constants
    private final long doublePressTimeConst = 420;
    private final long doubleTapTimeConst = 600;

    public ConvoscopeService() {
        super(ConvoscopeUi.class,
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

        //setup backend comms
        backendServerComms = new BackendServerComms(this);

        Log.d(TAG, "Convoscope service started");

        setAuthToken();
        setUpCsePolling();
        setUpDisplayQueuePolling();

//        smsComms = new SMSComms();

        this.aioConnectSmartGlasses();
    }

    public void setUpCsePolling(){
        cseRunnableCode = new Runnable() {
            @Override
            public void run() {
                if (authToken != "") {
                    requestUiPoll();
                }
                csePollLoopHandler.postDelayed(this, 1000);
            }
        };
        csePollLoopHandler.post(cseRunnableCode);
    }

    public void setUpDisplayQueuePolling(){
        displayRunnableCode = new Runnable() {
            @Override
            public void run() {
                maybeDisplayFromResultList();
                displayPollLoopHandler.postDelayed(this, 500);
            }
        };
        displayPollLoopHandler.post(displayRunnableCode);
    }

    @Override
    public void onDestroy(){
        csePollLoopHandler.removeCallbacks(cseRunnableCode);
        displayPollLoopHandler.removeCallbacks(displayRunnableCode);
        EventBus.getDefault().unregister(this);
        super.onDestroy();
    }

    public void convoscopeStartCommandCallback(String args, long commandTriggeredTime){
        Log.d("TAG","Convoscope start callback called");
        //runConvoscope();
    }
    @Subscribe
    public void onGlassesTapSideEvent(GlassesTapOutputEvent event) {
        int numTaps = event.numTaps;
        boolean sideOfGlasses = event.sideOfGlasses;
        long time = event.timestamp;

        Log.d(TAG, "GLASSES TAPPED X TIMES: " + numTaps + " SIDEOFGLASSES: " + sideOfGlasses);
        if (numTaps == 3) {
//            sendLatestCSEResultViaSms();
            Log.d(TAG, "GOT A TRIPLE TAP");
        }
    }


    @Subscribe
    public void onSmartRingButtonEvent(SmartRingButtonOutputEvent event) {
        int buttonId = event.buttonId;
        long time = event.timestamp;
        boolean isDown = event.isDown;

        if(!isDown || buttonId != 1) return;
        Log.d(TAG,"DETECTED BUTTON PRESS W BUTTON ID: " + buttonId);
        currTime = System.currentTimeMillis();

        //Detect double presses
        if(isDown && currTime - lastPressed < doublePressTimeConst) {
            Log.d(TAG, "Double tap - CurrTime-lastPressed: "+ (currTime-lastPressed));
//            sendLatestCSEResultViaSms();
        }

        if(isDown) {
            lastPressed = System.currentTimeMillis();
        }
    }

//    public void sendLatestCSEResultViaSms(){
//        if (phoneNum == "") return;
//
//        if (responses.size() > 1) {
//            //Send latest CSE result via sms;
//            String messageToSend = responsesToShare.get(responsesToShare.size() - 1);
//
//            smsComms.sendSms(phoneNum, messageToSend);
//
//            sendReferenceCard("Convoscope", "Sending result(s) via SMS to " + phoneNumName);
//        }
//    }

    private Handler debounceHandler = new Handler(Looper.getMainLooper());
    private Runnable debounceRunnable;

    @Subscribe
    public void onTranscript(SpeechRecOutputEvent event) {
        String text = event.text;
        long time = event.timestamp;
        boolean isFinal = event.isFinal;
        Log.d(TAG, "PROCESS TRANSCRIPTION CALLBACK. IS IT FINAL? " + isFinal + " " + text);

        if (isFinal)
            sendFinalTranscriptToActivity(text);

        //debounce and then send to backend
        debounceAndSendTranscript(text, isFinal);
    }

    private long lastSentTime = 0;
    private final long DEBOUNCE_DELAY = 250; // in milliseconds
    private void debounceAndSendTranscript(String transcript, boolean isFinal) {
        debounceHandler.removeCallbacks(debounceRunnable);
        long currentTime = System.currentTimeMillis();
        if (isFinal) {
            sendTranscriptRequest(transcript, isFinal);
        } else { //if intermediate
            if (currentTime - lastSentTime >= DEBOUNCE_DELAY) {
                sendTranscriptRequest(transcript, isFinal);
                lastSentTime = currentTime;
            } else {
                debounceRunnable = () -> {
                    sendTranscriptRequest(transcript, isFinal);
                    lastSentTime = System.currentTimeMillis();
                };
                debounceHandler.postDelayed(debounceRunnable, DEBOUNCE_DELAY);
            }
        }
    }

    public void sendTranscriptRequest(String query, boolean isFinal){
        if (authToken == ""){
            EventBus.getDefault().post(new GoogleAuthFailedEvent());
        }

        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("text", query);
            jsonQuery.put("Authorization", authToken);
            jsonQuery.put("isFinal", isFinal);
            jsonQuery.put("timestamp", System.currentTimeMillis() / 1000);
            backendServerComms.restRequest(LLM_QUERY_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        parseSendTranscriptResult(result);
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(int code){
                    Log.d(TAG, "SOME FAILURE HAPPENED (sendChatRequest)");
                }

            });
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public void requestUiPoll(){
        try{
            JSONObject jsonQuery = new JSONObject();
            JSONArray featuresArray = new JSONArray(features);
            jsonQuery.put("Authorization", authToken);
            jsonQuery.put("deviceId", deviceId);
            jsonQuery.put("features", featuresArray);
            backendServerComms.restRequest(CSE_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        parseConvoscopeResults(result);
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(int code){
                    Log.d(TAG, "SOME FAILURE HAPPENED (requestUiPoll)");
                    if (code == 401){
                        EventBus.getDefault().post(new GoogleAuthFailedEvent());
                    }
                }
            });
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public void parseSendTranscriptResult(JSONObject response) throws JSONException {
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

    public String calculateLLStringFormatted(JSONArray jsonArray){
        // Assuming jsonArray is your existing JSONArray object
        String[] inWords = new String[jsonArray.length()];
        String[] inWordsTranslations = new String[jsonArray.length()];

        for (int i = 0; i < jsonArray.length(); i++) {
            try {
                JSONObject obj = jsonArray.getJSONObject(i);
                inWords[i] = obj.getString("in_word");
                inWordsTranslations[i] = obj.getString("in_word_translation");
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        StringBuilder topLine = new StringBuilder();
        StringBuilder bottomLine = new StringBuilder();

        // Use en space instead of a regular space for padding
        String enSpace = "\u2002"; // for en space

        // Step 1: Calculate maximum width for each word pair and build the lines
        for (int i = 0; i < inWords.length; i++) {
            String inWord = inWords[i];
            String translation = inWordsTranslations[i];
            int maxWidth = Math.max(inWord.length(), translation.length());

            // Step 2: Calculate padding for "in_word"
            int padding = (maxWidth - inWord.length()) / 2;

            // Append spaces for padding before "in_word" to topLine
            for (int j = 0; j < padding; j++) {
                topLine.append(enSpace);
            }

            // Append "in_word" to topLine
            topLine.append(inWord);

            // Append additional spaces after "in_word" to ensure alignment, if necessary
            int totalSpaces = maxWidth - inWord.length();
            for (int j = padding + inWord.length(); j < totalSpaces; j++) {
                topLine.append(enSpace);
            }

            // Append "in_word_translation" directly to bottomLine
            bottomLine.append(translation);

            // If not the last word pair, append spaces to both lines to separate word pairs
            if (i < inWords.length - 1) {
                topLine.append(enSpace.repeat(4)); // Adjust the number of spaces as needed for aesthetics
                bottomLine.append(enSpace.repeat(4)); // Keep this the same as the top line for alignment
            }
        }

        // Step 4: Join the two lines
        String llResult = topLine.toString() + "\n" + bottomLine.toString();

        // Output the result
        Log.d(TAG, llResult);
        return llResult;
    }

    public void parseConvoscopeResults(JSONObject response) throws JSONException {
//        Log.d(TAG, "GOT CSE RESULT: " + response.toString());
        String imgKey = "image_url";
        String mapImgKey = "map_image_path";

//        JSONArray cseResults = response.has(cseResultKey) ? response.getJSONArray(cseResultKey) : new JSONArray();

//        JSONArray proactiveAgentResults = response.has(proactiveAgentResultsKey) ? response.getJSONArray(proactiveAgentResultsKey) : new JSONArray();

        JSONArray explicitAgentQueries = response.has(explicitAgentQueriesKey) ? response.getJSONArray(explicitAgentQueriesKey) : new JSONArray();

        JSONArray explicitAgentResults = response.has(explicitAgentResultsKey) ? response.getJSONArray(explicitAgentResultsKey) : new JSONArray();

//        JSONArray entityDefinitions = response.has(entityDefinitionsKey) ? response.getJSONArray(entityDefinitionsKey) : new JSONArray();

        JSONArray languageLearningResults = response.has(languageLearningKey) ? response.getJSONArray(languageLearningKey) : new JSONArray();

        String llResult = "";
//            String llResult = "|this is     |the result\n|siht si    |tresult eht";
        for (int i = 0; i < languageLearningResults.length(); i++) {
            Log.d(TAG, "LANGUAGE LEARNING RESULTS:" + languageLearningResults.get(i));
        }
        if (languageLearningResults.length() != 0) {
            llResult = calculateLLStringFormatted(languageLearningResults);
            queueOutput(llResult);
        }

//        // Just append the entityDefinitions to the cseResults as they have similar schema
//        for (int i = 0; i < entityDefinitions.length(); i++) {
//            cseResults.put(entityDefinitions.get(i));
//        }

        long wakeWordTime = response.has(wakeWordTimeKey) ? response.getLong(wakeWordTimeKey) : -1;

//        if (cseResults.length() > 0){
//            Log.d(TAG, "GOT CSE RESULTS: " + response.toString());
//        }

        if (wakeWordTime != -1 && wakeWordTime != previousWakeWordTime){
            previousWakeWordTime = wakeWordTime;
            String body = "Listening... ";
            queueOutput(body);
        }

        //go through CSE results and add to resultsToDisplayList
//        String sharableResponse = "";
//        for (int i = 0; i < cseResults.length(); i++){
//            try {
//                JSONObject obj = cseResults.getJSONObject(i);
//                String name = obj.getString("name");
//                String body = obj.getString("summary");
//                String combined = name + ": " + body;
//                Log.d(TAG, name);
//                Log.d(TAG, "--- " + body);
//                queueOutput(combined);
//
////                if(obj.has(mapImgKey)){
////                    String mapImgPath = obj.getString(mapImgKey);
////                    String mapImgUrl = backendServerComms.serverUrl + mapImgPath;
////                    sgmLib.sendReferenceCard(name, body, mapImgUrl);
////                }
////                else if(obj.has(imgKey)) {
////                    sgmLib.sendReferenceCard(name, body, obj.getString(imgKey));
////                }
////                else {
////                    sgmLib.sendReferenceCard(name, body);
////                }
//
//                // For SMS
////                sharableResponse += combined;
////                if(obj.has("url")){
////                    sharableResponse += "\n" + obj.get("url");
////                }
////                sharableResponse += "\n\n";
////                if(i == cseResults.length() - 1){
////                    sharableResponse += "Sent from Convoscope";
////                }
//
//
//            } catch (JSONException e){
//                e.printStackTrace();
//            }
//        }
//
//        //go through proactive agent results and add to resultsToDisplayList
//        for (int i = 0; i < proactiveAgentResults.length(); i++){
//            try {
//                JSONObject obj = proactiveAgentResults.getJSONObject(i);
//                String name = obj.getString("agent_name") + " says";
//                String body = obj.getString("agent_insight");
//                String combined = name + ": " + body;
//                Log.d(TAG, name);
//                Log.d(TAG, "--- " + body);
//                queueOutput(combined);
//            } catch (JSONException e){
//                e.printStackTrace();
//            }
//        }

        //go through explicit agent queries and add to resultsToDisplayList
        for (int i = 0; i < explicitAgentQueries.length(); i++){
            try {
                JSONObject obj = explicitAgentQueries.getJSONObject(i);
                String body = "Processing query: " + obj.getString("query");
                queueOutput(body);
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        //go through explicit agent results and add to resultsToDisplayList
        for (int i = 0; i < explicitAgentResults.length(); i++){
            try {
                JSONObject obj = explicitAgentResults.getJSONObject(i);
                String body = "Response: " + obj.getString("insight");
                queueOutput(body);
            } catch (JSONException e){
                e.printStackTrace();
            }
        }
    }

    //all the stuff from the results that we want to display
    ArrayList<String> resultsToDisplayList = new ArrayList<>();
    public void queueOutput(String item){
        responses.add(item);
        sendUiUpdateSingle(item);
        resultsToDisplayList.add(item.substring(0,Math.min(72, item.length())).trim());//.replaceAll("\\s+", " "));
    }

    public void maybeDisplayFromResultList(){
        if (resultsToDisplayList.size() == 0) return;
        if (System.currentTimeMillis() - latestDisplayTime < minimumDisplayRate) return;

        ArrayList<String> displayThese = new ArrayList<String>();
        for(int i = 0; i < resultsToDisplayList.size(); i++) {
            if (i >= maxBullets) break;
            displayThese.add(resultsToDisplayList.remove(0));
        }

        minimumDisplayRate = minimumDisplayRatePerResult * displayThese.size();
        latestDisplayTime = System.currentTimeMillis();

        if (displayThese.size() == 1) {
            sendReferenceCard(glassesCardTitle, displayThese.get(0));
        }
        else {
            String[] resultsToDisplayListArr = displayThese.toArray(new String[displayThese.size()]);
            sendBulletPointList(glassesCardTitle, resultsToDisplayListArr);
        }
    }

    public void speakTTS(String toSpeak){
        sendTextLine(toSpeak);
    }

    public void sendUiUpdateFull(){
        Intent intent = new Intent();
        intent.setAction(ConvoscopeUi.UI_UPDATE_FULL);
        intent.putStringArrayListExtra(ConvoscopeUi.CONVOSCOPE_MESSAGE_STRING, responses);
        sendBroadcast(intent);
    }

    public void sendUiUpdateSingle(String message) {
        Intent intent = new Intent();
        intent.setAction(ConvoscopeUi.UI_UPDATE_SINGLE);
        intent.putExtra(ConvoscopeUi.CONVOSCOPE_MESSAGE_STRING, message);
        sendBroadcast(intent);
    }

    public void sendFinalTranscriptToActivity(String transcript){
        Intent intent = new Intent();
        intent.setAction(ConvoscopeUi.UI_UPDATE_FINAL_TRANSCRIPT);
        intent.putExtra(ConvoscopeUi.FINAL_TRANSCRIPT, transcript);
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
            jsonQuery.put("Authorization", authToken);
            jsonQuery.put("timestamp", System.currentTimeMillis() / 1000);
            backendServerComms.restRequest(BUTTON_EVENT_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
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
                public void onFailure(int code){
                    Log.d(TAG, "SOME FAILURE HAPPENED (buttonDownEvent)");
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

    public void setAuthToken(){
        Log.d(TAG, "GETTING AUTH TOKEN");
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user != null) {
            user.getIdToken(true)
                .addOnCompleteListener(new OnCompleteListener<GetTokenResult>() {
                    public void onComplete(@NonNull Task<GetTokenResult> task) {
                        if (task.isSuccessful()) {
                            String idToken = task.getResult().getToken();
                            Log.d(TAG, "Auth Token: " + idToken);
                            authToken = idToken;
                        } else {
                            EventBus.getDefault().post(new GoogleAuthFailedEvent());
                        }
                    }
                });
        }
        else {
            // not logged in, must log in
            EventBus.getDefault().post(new GoogleAuthFailedEvent());
        }
    }
}
