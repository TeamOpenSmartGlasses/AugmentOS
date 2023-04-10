package com.teambandwidth.mxt2;

import android.util.Log;

import com.teamopensmartglasses.sgmlib.DataStreamType;
import com.teamopensmartglasses.sgmlib.SGMCommand;
import com.teamopensmartglasses.sgmlib.SGMLib;
import com.teamopensmartglasses.sgmlib.SmartGlassesAndroidService;

import org.greenrobot.eventbus.EventBus;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

//based on SGM example apps: https://github.com/TeamOpenSmartGlasses
//especially https://github.com/TeamOpenSmartGlasses/SmartGlassesSearchEngine
public class MXTService extends SmartGlassesAndroidService {
    public final String TAG = "MXT_MXTService";
    static final String appName = "MXT";

    //our instance of the SGM library
    public SGMLib sgmLib;

    private RestComms restComms;

    //handle holding a buffer of text and executing in the future
    public StringBuffer messageBuffer;
    private final ScheduledExecutorService executorService = Executors.newSingleThreadScheduledExecutor();
    private Future<?> transcriptFuture;

    public MXTService(){
        super(MainActivity.class,
                "mxt_app",
                1259,
                appName,
                "LLM Tools for Wearables", R.drawable.ic_launcher_foreground);
    }

    @Override
    public void onCreate() {
        super.onCreate();

        messageBuffer = new StringBuffer();

        /* Handle SGMLib specific things */

        //Create SGMLib instance with context: this
        sgmLib = new SGMLib(this);

        //Define command with a UUID
        UUID commandUUID = UUID.fromString("f7b3f27b-d518-4124-aa50-1610629cf101");

        //Define list of phrases to be used to trigger the command
        String[] triggerPhrases = new String[]{"ask LLM"};

        //Create command object
        SGMCommand command = new SGMCommand(appName, commandUUID, triggerPhrases, "Wearable LLM Tools", true, "Query", null);

        //Register the command
        sgmLib.registerCommand(command, this::askLLMCommandCallback);

        //Subscribe to transcription stream
        sgmLib.subscribe(DataStreamType.TRANSCRIPTION_ENGLISH_STREAM, this::processTranscriptionCallback);

        EventBus.getDefault().register(this);
        restComms = new RestComms(this);

        Log.d(TAG, "MXT SERVICE STARTED");
    }

    public void processTranscriptionCallback(String transcript, long timestamp, boolean isFinal){
        // We want to send our message in our message buffer when we stop speaking for like 9 seconds
        // If the transcript is finalized, then we add it to our buffer, and reset our timer
        if(isFinal){
            Log.d(TAG, "GOT FINAL TRANSCRIPT");
            handleNewTranscript(transcript);
        }
    }

    public void askLLMCommandCallback(String args, long commandTriggeredTime) {
        Log.d(TAG,"Ask LLM command callback called");
        Log.d(TAG, "CMDARGS: "+ args);
        Log.d(TAG, "TIME: " + commandTriggeredTime);
//        if(args == "" || args == null){
//            sgmLib.sendReferenceCard(appName, "No search query detected.\nTry again with a seach query.");
//            return;
//        }
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy called");
        EventBus.getDefault().unregister(this);
        sgmLib.deinit();
        super.onDestroy();
    }

    public void sendLLMQueryRequest(String query){
        Log.d(TAG, "Running sendLLMQueryRequest with query: " + query);
        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("query", query);
            restComms.restRequest(RestComms.LLM_QUERY_ENDPOINT, jsonQuery, new VolleyCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    Log.d(TAG, "GOT LLM Query REST RESULT:");
                    Log.d(TAG, result.toString());
                    try {
                        parseLLMQueryResult(result);
                    } catch (JSONException e) {
                        throw new RuntimeException(e);
                    }
                }
                @Override
                public void onFailure(){
                    Log.d(TAG, "SOME FAILURE HAPPENED");
//                    EventBus.getDefault().post(new SearchResultFailureEvent("No connection"));
                }

            });
        } catch (JSONException e){
            e.printStackTrace();
        }
    }

    public void parseLLMQueryResult(JSONObject response) throws JSONException {
        Log.d(TAG, "Got result from server: " + response.toString());
    }

    public void handleNewTranscript(String transcript){
        messageBuffer.append(transcript.toLowerCase().trim());
        messageBuffer.append(" ");

    }

    public void userStartLLMQuery(){
    }

    public void userStopLLMQuery(){
        transcriptFuture = executorService.schedule(() -> {
            if (messageBuffer.length() != 0) {
                sendLLMQueryRequest(messageBuffer.toString());
                messageBuffer = new StringBuffer();
            }
        }, 1100, TimeUnit.MILLISECONDS);
    }
}