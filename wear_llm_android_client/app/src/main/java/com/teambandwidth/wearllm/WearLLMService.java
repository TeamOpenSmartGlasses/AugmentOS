package com.teambandwidth.wearllm;

import android.content.Intent;
import android.os.IBinder;
import android.util.Log;

import com.teambandwidth.wearllm.wearllmbackend.BackendServerComms;
import com.teambandwidth.wearllm.wearllmbackend.VolleyJsonCallback;
import com.teamopensmartglasses.sgmlib.DataStreamType;
import com.teamopensmartglasses.sgmlib.FocusStates;
import com.teamopensmartglasses.sgmlib.SGMCommand;
import com.teamopensmartglasses.sgmlib.SGMLib;
import com.teamopensmartglasses.sgmlib.SmartGlassesAndroidService;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.UUID;

public class WearLLMService extends SmartGlassesAndroidService {
    public final String TAG = "WearLLM_WearLLMService";

    private final IBinder binder = new LocalBinder();
    public static final String ACTION_START_FOREGROUND_SERVICE = "WEARLLM_ACTION_START_FOREGROUND_SERVICE";
    public static final String ACTION_STOP_FOREGROUND_SERVICE = "WEARLLM_ACTION_STOP_FOREGROUND_SERVICE";

    //our instance of the SGM library
    public SGMLib sgmLib;

    //WearLLM stuff
    private BackendServerComms backendServerComms;
    TextToSpeechSystem tts;
    ArrayList<String> responses;

    public WearLLMService() {
        super(MainActivity.class,
                "wear_llm_app",
                3288,
                "WearLLM",
                "Wearable intelligence upgrades. By Team Bandwidth.", R.drawable.ic_launcher_background);
    }

    @Override
    public void onCreate() {
        super.onCreate();

        //setup backend comms
        backendServerComms = new BackendServerComms(this);

        //make responses holder
        responses = new ArrayList<>();
        responses.add("Welcome to WearLLM - ask Jarvis questions, ask what you were talking about, request summary of <n> minutes.");

        //Create SGMLib instance with context: this
        sgmLib = new SGMLib(this);

        //Define command with a UUID
        UUID commandUUID = UUID.fromString("5b824bb6-d3b3-417d-8c74-3b103efb403f");
        SGMCommand command = new SGMCommand("WearLLM", commandUUID, new String[]{"WearLLM", "wearable intelligence"}, "AI wearable intelligence.");

        //Register the command
        sgmLib.registerCommand(command, this::wearLlmStartCommandCallback);

        //start text to speech
        tts = new TextToSpeechSystem(this);

        Log.d(TAG, "WearLLM SERVICE STARTED");
    }

    @Override
    public void onDestroy(){
        super.onDestroy();
    }

    public void wearLlmStartCommandCallback(String args, long commandTriggeredTime){
        Log.d("TAG","Translation callback called");

        //request to be the in focus app so we can continue to show transcripts
        sgmLib.requestFocus(this::focusChangedCallback);

        //StartScrollingText to show our translation
//        sgmLib.startScrollingText("Translation: ");

        //Subscribe to transcription stream
        sgmLib.subscribe(DataStreamType.TRANSCRIPTION_ENGLISH_STREAM, this::processTranscriptionCallback);
    }

    public void focusChangedCallback(FocusStates focusState){
        Log.d(TAG, "Focus callback called with state: " + focusState);
        this.focusState = focusState;

        //StartScrollingText to show our translation
        if (focusState.equals(FocusStates.IN_FOCUS)) {
            sgmLib.startScrollingText("Translation: ");
        }
    }

    public void processTranscriptionCallback(String transcript, long timestamp, boolean isFinal){
        Log.d(TAG, "PROCESS TRANSCRIPTION CALLBACK. IS IT FINAL? " + isFinal + " " + transcript);

        //don't execute if we're not in focus
        if (!focusState.equals(FocusStates.IN_FOCUS)){
            return;
        }

        if(isFinal){
            sendLLMQueryRequest(transcript);
        }
    }

    public void sendLLMQueryRequest(String query){
        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("text", query);
            jsonQuery.put("userId", "cayden");
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

    public void parseLLMQueryResult(JSONObject response) throws JSONException {
        Log.d(TAG, "Got result from server: " + response.toString());
        String message = response.getString("message");
        if (!message.equals("")) {
            responses.add(message);
            sendUiUpdateSingle(message);
            speakTTS(message);
        }
    }

    public void speakTTS(String toSpeak){
        tts.speak(toSpeak);
    }

    public void sendUiUpdateFull(){
        Intent intent = new Intent();
        intent.setAction(MainActivity.UI_UPDATE_FULL);
        intent.putStringArrayListExtra(MainActivity.WEARLLM_MESSAGE_STRING, responses);
        sendBroadcast(intent);
    }

    public void sendUiUpdateSingle(String message) {
        Intent intent = new Intent();
        intent.setAction(MainActivity.UI_UPDATE_SINGLE);
        intent.putExtra(MainActivity.WEARLLM_MESSAGE_STRING, message);
        sendBroadcast(intent);
    }
}