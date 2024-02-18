package com.teamopensmartglasses.convoscope;

import static com.teamopensmartglasses.convoscope.Constants.BUTTON_EVENT_ENDPOINT;
import static com.teamopensmartglasses.convoscope.Constants.CSE_ENDPOINT;
import static com.teamopensmartglasses.convoscope.Constants.GEOLOCATION_STREAM_ENDPOINT;
import static com.teamopensmartglasses.convoscope.Constants.LLM_QUERY_ENDPOINT;
import static com.teamopensmartglasses.convoscope.Constants.SET_USER_SETTINGS_ENDPOINT;
import static com.teamopensmartglasses.convoscope.Constants.cseResultKey;
import static com.teamopensmartglasses.convoscope.Constants.entityDefinitionsKey;
import static com.teamopensmartglasses.convoscope.Constants.explicitAgentQueriesKey;
import static com.teamopensmartglasses.convoscope.Constants.explicitAgentResultsKey;
import static com.teamopensmartglasses.convoscope.Constants.glassesCardTitle;
import static com.teamopensmartglasses.convoscope.Constants.languageLearningKey;
import static com.teamopensmartglasses.convoscope.Constants.proactiveAgentResultsKey;
import static com.teamopensmartglasses.convoscope.Constants.wakeWordTimeKey;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.preference.PreferenceManager;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GetTokenResult;
import com.teamopensmartglasses.convoscope.convoscopebackend.BackendServerComms;
import com.teamopensmartglasses.convoscope.convoscopebackend.VolleyJsonCallback;
import com.teamopensmartglasses.convoscope.events.GoogleAuthFailedEvent;
import com.teamopensmartglasses.convoscope.events.GoogleAuthSucceedEvent;
import com.teamopensmartglasses.convoscope.ui.ConvoscopeUi;
import com.teamopensmartglasses.smartglassesmanager.SmartGlassesAndroidService;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.GlassesTapOutputEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.SmartRingButtonOutputEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.SpeechRecOutputEvent;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Objects;

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
    private final Handler csePollLoopHandler = new Handler(Looper.getMainLooper());
    private Runnable cseRunnableCode;
    private final Handler displayPollLoopHandler = new Handler(Looper.getMainLooper());
    private Runnable displayRunnableCode;
    private final LocationSystem locationSystem = new LocationSystem();
    static final String deviceId = "android";
    public String [] features = {"proactive_agent_insights", "explicit_agent_insights", "intelligent_entity_definitions"};//default setup
    public String proactiveAgents = "proactive_agent_insights";
    public String explicitAgent = "explicit_agent_insights";
    public String definerAgent = "intelligent_entity_definitions";
    public String languageLearningAgent = "language_learning";

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

    //clear screen to start
    public boolean clearedScreenYet = false;

    // Double clicking constants
    private final long doublePressTimeConst = 420;
    private final long doubleTapTimeConst = 600;

    public ConvoscopeService() {
        super(ConvoscopeUi.class,
                "convoscope_app",
                3588,
                "Convoscope",
                "Wearable intelligence upgrades. By TeamOpenSmartGlasses.", R.drawable.ic_launcher_foreground);
    }

    @Override
    public void onCreate() {
        super.onCreate();

        //setup event bus subscribers
        this.setupEventBusSubscribers();

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

        //setup mode
        changeMode(getCurrentMode(this));

        this.aioConnectSmartGlasses();
    }

    public void sendSettings(JSONObject settingsObj){
        try{
            Log.d(TAG, "AUTH from Settings: " + authToken);
            settingsObj.put("Authorization", authToken);
            settingsObj.put("timestamp", System.currentTimeMillis() / 1000);
            backendServerComms.restRequest(SET_USER_SETTINGS_ENDPOINT, settingsObj, new VolleyJsonCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    try {
                        Log.d(TAG, "GOT Settings update result: " + result.toString());
                        String query_answer = result.getString("message");
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(int code){
                    Log.d(TAG, "SOME FAILURE HAPPENED (sendSettings)");

                }

            });
        } catch (JSONException e){
            e.printStackTrace();
        }
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
//        Log.d(TAG, "PROCESS TRANSCRIPTION CALLBACK. IS IT FINAL? " + isFinal + " " + text);

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
        if (Objects.equals(authToken, "")){
            EventBus.getDefault().post(new GoogleAuthFailedEvent());
        }

        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("text", query);
            jsonQuery.put("transcribe_language", getChosenTranscribeLanguage(this));
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
            Log.d(TAG, "hitting UI poll with these features: " + featuresArray);
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

    public void requestLocation(){
        try{
            // Get location data as JSONObject
            JSONObject locationData = locationSystem.getUserLocation();
            double latitude = locationData.getDouble("lat");
            double longitude = locationData.getDouble("lng");

            JSONObject jsonQuery = new JSONObject();
            // Assuming 'features' is a List<String> or similar that needs to be converted to JSONArray
            JSONArray featuresArray = new JSONArray(features);

            Log.d(TAG, "hitting UI poll with these features: " + featuresArray);
            jsonQuery.put("Authorization", authToken);
            jsonQuery.put("deviceId", deviceId);
            jsonQuery.put("features", featuresArray);
            jsonQuery.put("lat", latitude);
            jsonQuery.put("lng", longitude);

            backendServerComms.restRequest(GEOLOCATION_STREAM_ENDPOINT, jsonQuery, new VolleyJsonCallback(){
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
                    Log.d(TAG, "SOME FAILURE HAPPENED (requestLocation)");
                    if (code == 401){
                        EventBus.getDefault().post(new GoogleAuthFailedEvent());
                    }
                }
            });
        } catch (JSONException | IOException e){
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

    public String[] calculateLLStringFormatted(JSONArray jsonArray){
        //clear canvas if needed
        if (!clearedScreenYet){
            sendHomeScreen();
            clearedScreenYet = true;
        }

        // Assuming jsonArray is your existing JSONArray object
        int max_rows_allowed = 4;

        String[] inWords = new String[jsonArray.length()];
        String[] inWordsTranslations = new String[jsonArray.length()];
        String[] llResults = new String[max_rows_allowed];
        String enSpace = "\u2002"; // Using en space for padding

        int minSpaces = 2;
        for (int i = 0; i < jsonArray.length() && i < max_rows_allowed; i++) {
            try {
                JSONObject obj = jsonArray.getJSONObject(i);
                inWords[i] = obj.getString("in_word");
                inWordsTranslations[i] = obj.getString("in_word_translation");
                int max_len = Math.max(inWords[i].length(), inWordsTranslations[i].length());
//                llResults[i] = inWords[i] + enSpace.repeat(Math.max(0, max_len - inWords[i].length()) + minSpaces) + "⟶" + enSpace.repeat(Math.max(0, max_len - inWordsTranslations[i].length()) + minSpaces) + inWordsTranslations[i];
                llResults[i] = inWords[i] + enSpace.repeat(minSpaces) + "⟶" + enSpace.repeat(minSpaces) + inWordsTranslations[i];
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

        return llResults;

//        String enSpace = "\u2002"; // Using en space for padding
//        String llResult = "";
//        for (int i = 0; i < inWords.length; i++) {
//            String inWord = inWords[i];
//            String translation = inWordsTranslations[i];
//            llResult += inWord + enSpace.repeat(3) + "->"+ enSpace.repeat(3) + translation + "\n\n";
//        }

//        StringBuilder topLine = new StringBuilder();
//        StringBuilder bottomLine = new StringBuilder();
//
//        // Calculate initial padding for the first word based on the bottom line's first word
//        int initialPaddingLength = (inWordsTranslations[0].length() - inWords[0].length()) / 2;
//        if (initialPaddingLength > 0) {
//            topLine.append(String.valueOf(enSpace).repeat(initialPaddingLength));
//        } else {
//            initialPaddingLength = 0; // Ensure it's not negative for subsequent calculations
//        }
//
//        for (int i = 0; i < inWords.length; i++) {
//            String inWord = inWords[i];
//            String translation = inWordsTranslations[i];
//
//            topLine.append(inWord);
//            bottomLine.append(translation);
//
//            if (i < inWords.length - 1) {
//                // Calculate the minimum necessary space to add based on the length of the next words in both lines
//                int nextTopWordLength = inWords[i + 1].length();
//                int nextBottomWordLength = inWordsTranslations[i + 1].length();
//                int currentTopWordLength = inWord.length();
//                int currentBottomWordLength = translation.length();
//
//                // Calculate additional space needed for alignment
//                int additionalSpaceTop = nextTopWordLength - currentTopWordLength;
//                int additionalSpaceBottom = nextBottomWordLength - currentBottomWordLength;
//
//                // Ensure there's a minimum spacing for readability, reduce this as needed
//                int minSpace = 2; // Reduced minimum space for closer alignment
//                int spacesToAddTop = Math.max(additionalSpaceTop, minSpace);
//                int spacesToAddBottom = Math.max(additionalSpaceBottom, minSpace);
//
//                // Append the calculated spaces to each line
//                topLine.append(String.valueOf(enSpace).repeat(spacesToAddTop));
//                bottomLine.append(String.valueOf(enSpace).repeat(spacesToAddBottom));
//            }
//        }
//
//
//        // Adjust for the initial padding by ensuring the bottom line starts directly under the top line's first word
//        if (initialPaddingLength > 0) {
//            String initialPaddingForBottom = String.valueOf(enSpace).repeat(initialPaddingLength);
//            bottomLine = new StringBuilder(initialPaddingForBottom).append(bottomLine.toString());
//        }

//        String llResult = topLine.toString() + "\n" + bottomLine.toString();
    }

    public void parseConvoscopeResults(JSONObject response) throws JSONException {
//        Log.d(TAG, "GOT CSE RESULT: " + response.toString());
        String imgKey = "image_url";
        String mapImgKey = "map_image_path";

        //explicity queries
        JSONArray explicitAgentQueries = response.has(explicitAgentQueriesKey) ? response.getJSONArray(explicitAgentQueriesKey) : new JSONArray();

        JSONArray explicitAgentResults = response.has(explicitAgentResultsKey) ? response.getJSONArray(explicitAgentResultsKey) : new JSONArray();

        //custom data
        JSONArray cseResults = response.has(cseResultKey) ? response.getJSONArray(cseResultKey) : new JSONArray();

        //proactive agents
        JSONArray proactiveAgentResults = response.has(proactiveAgentResultsKey) ? response.getJSONArray(proactiveAgentResultsKey) : new JSONArray();
        JSONArray entityDefinitions = response.has(entityDefinitionsKey) ? response.getJSONArray(entityDefinitionsKey) : new JSONArray();

        //language learning
        JSONArray languageLearningResults = response.has(languageLearningKey) ? response.getJSONArray(languageLearningKey) : new JSONArray();

        String llResult = "";
        String[] llResults;

        for (int i = 0; i < languageLearningResults.length(); i++) {
            Log.d(TAG, "LANGUAGE LEARNING RESULTS:" + languageLearningResults.get(i));
        }
        if (languageLearningResults.length() != 0) {
            llResults = calculateLLStringFormatted(languageLearningResults);
            sendRowsCard(llResults);
            sendUiUpdateSingle(String.join("\n", Arrays.copyOfRange(llResults, 0, languageLearningResults.length())));
        }


        // Just append the entityDefinitions to the cseResults as they have similar schema
        for (int i = 0; i < entityDefinitions.length(); i++) {
            cseResults.put(entityDefinitions.get(i));
        }

        long wakeWordTime = response.has(wakeWordTimeKey) ? response.getLong(wakeWordTimeKey) : -1;

        if (cseResults.length() > 0){
            Log.d(TAG, "GOT CSE RESULTS: " + response.toString());
        }

        if (wakeWordTime != -1 && wakeWordTime != previousWakeWordTime){
            previousWakeWordTime = wakeWordTime;
            String body = "Listening... ";
            queueOutput(body);
        }

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
                queueOutput(combined);

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
//                sharableResponse += combined;
//                if(obj.has("url")){
//                    sharableResponse += "\n" + obj.get("url");
//                }
//                sharableResponse += "\n\n";
//                if(i == cseResults.length() - 1){
//                    sharableResponse += "Sent from Convoscope";
//                }


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
                queueOutput(combined);
            } catch (JSONException e){
                e.printStackTrace();
            }
        }

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

//    @Subscribe
//    public void onContactChangedEvent(SharingContactChangedEvent receivedEvent){
//        Log.d(TAG, "GOT NEW PHONE NUMBER: " + receivedEvent.phoneNumber);
//        String newNum = receivedEvent.phoneNumber;
//        phoneNumName = receivedEvent.name;
//        phoneNum = newNum.replaceAll("[^0-9]", "");
//    }

    public void setAuthToken(){
        Log.d(TAG, "GETTING AUTH TOKEN");
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user != null) {
            user.getIdToken(true)
                .addOnCompleteListener(new OnCompleteListener<GetTokenResult>() {
                    public void onComplete(@NonNull Task<GetTokenResult> task) {
                        if (task.isSuccessful()) {
                            String idToken = task.getResult().getToken();
                            Log.d(TAG, "GOT dat Auth Token: " + idToken);
                            authToken = idToken;
                            EventBus.getDefault().post(new GoogleAuthSucceedEvent());
                            PreferenceManager.getDefaultSharedPreferences(getApplicationContext())
                                    .edit()
                                    .putString("auth_token", authToken)
                                    .apply();
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

    public static void saveChosenTargetLanguage(Context context, String targetLanguageString) {
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putString(context.getResources().getString(R.string.SHARED_PREF_TARGET_LANGUAGE), targetLanguageString)
                .apply();
    }

    public static String getChosenTargetLanguage(Context context) {
        String targetLanguageString = PreferenceManager.getDefaultSharedPreferences(context).getString(context.getResources().getString(R.string.SHARED_PREF_TARGET_LANGUAGE), "");
        if (targetLanguageString.equals("")){
            saveChosenTargetLanguage(context, "Russian");
            targetLanguageString = "Russian";
        }
        return targetLanguageString;
    }

    public void changeMode(String currentModeString){
        if (currentModeString.equals("Proactive Agents")){
            features = new String[]{explicitAgent, proactiveAgents, definerAgent};
        } else if (currentModeString.equals("Language Learning")){
            features = new String[]{explicitAgent, languageLearningAgent};
        }
    }

    public void saveCurrentMode(Context context, String currentModeString) {
        //update the features for the new mode
        changeMode(currentModeString);

        //save the new mode
        PreferenceManager.getDefaultSharedPreferences(context)
                .edit()
                .putString(context.getResources().getString(R.string.SHARED_PREF_CURRENT_MODE), currentModeString)
                .apply();
    }

    public String getCurrentMode(Context context) {
        String currentModeString = PreferenceManager.getDefaultSharedPreferences(context).getString(context.getResources().getString(R.string.SHARED_PREF_CURRENT_MODE), "");
        if (currentModeString.equals("")){
            saveCurrentMode(context, "Proactive Agents");
            currentModeString = "Proactive Agents";
        }
        return currentModeString;
    }


    public void updateTargetLanguageOnBackend(Context context){
        String targetLanguage = getChosenTargetLanguage(context);
        try{
            JSONObject settingsObj = new JSONObject();
            settingsObj.put("target_language", targetLanguage);
            sendSettings(settingsObj);
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    @Subscribe
    public void onGoogleAuthSucceed(GoogleAuthSucceedEvent event){
        Log.d(TAG, "Running google auth succeed event response");
        //give the server our latest settings
        updateTargetLanguageOnBackend(this);
    }
}
