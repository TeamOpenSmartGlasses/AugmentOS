package com.caydenpierce.contextualsearchengine;

import android.util.Log;

import com.teamopensmartglasses.sgmlib.DataStreamType;
import com.teamopensmartglasses.sgmlib.FocusStates;
import com.teamopensmartglasses.sgmlib.SGMCommand;
import com.teamopensmartglasses.sgmlib.SGMLib;
import com.teamopensmartglasses.sgmlib.SmartGlassesAndroidService;

import org.greenrobot.eventbus.EventBus;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Iterator;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;

//based on SGM example apps: https://github.com/TeamOpenSmartGlasses
//especially https://github.com/TeamOpenSmartGlasses/SmartGlassesSearchEngine
public class ContextualSearchEngineService extends SmartGlassesAndroidService {
    public final String TAG = "CSE_ContextualSearchEngineService";
    static final String appName = "CSE";
    public FocusStates focusState;

    //our instance of the SGM library
    public SGMLib sgmLib;
    private RestComms restComms;

    //every n words or n seconds, send live transcript to backend
    private int nWordsThreshold = 6;
    private int nWordsSlideBack = 3;

    //handle holding a buffer of text and executing in the future
    public StringBuffer messageBuffer; //holds buffer of final transcripts
    public String lastIntermediateTranscript; //holds the last intermediate transcript
    public boolean bufferLive;
    private final ScheduledExecutorService executorService = Executors.newSingleThreadScheduledExecutor();
    private Future<?> transcriptFuture;

    TextToSpeechSystem tts;

    public ContextualSearchEngineService(){
        super(MainActivity.class,
                "contextual_search_engine_app",
                2457,
                appName,
                "Contextual search engine for smart glasses.", R.drawable.ic_launcher_foreground);

        bufferLive = false;
    }

    @Override
    public void onCreate() {
        super.onCreate();

        messageBuffer = new StringBuffer();

        /* Handle SGMLib specific things */

        //Create SGMLib instance with context: this
        sgmLib = new SGMLib(this);

        //Define command with a UUID
        UUID commandUUID = UUID.fromString("3c30190f-4cff-47a1-9642-b2323785ae40");

        //Define list of phrases to be used to trigger the command
        String[] triggerPhrases = new String[]{"contextual search"};

        //Create command object
        SGMCommand command = new SGMCommand(appName, commandUUID, triggerPhrases, "Contextual Search Engine", false, null, null);

        //Register the command
        sgmLib.registerCommand(command, this::askLLMCommandCallback);

        EventBus.getDefault().register(this);
        restComms = new RestComms(this);

        //start text to speech
        tts = new TextToSpeechSystem(this);

        Log.d(TAG, "CSE SERVICE STARTED");
    }

    public void speakTTS(String toSpeak){
        Log.d(TAG, "Speaking: " + toSpeak);
        tts.speak(toSpeak);
    }

    public void processTranscriptionCallback(String transcript, long timestamp, boolean isFinal){
        // We want to send our message in our message buffer when we stop speaking for like 9 seconds
        // If the transcript is finalized, then we add it to our buffer, and reset our timer

        //don't execute if we're not in focus
        if (!focusState.equals(FocusStates.IN_FOCUS)){
            return;
        }

        if(isFinal){
            handleNewTranscript(transcript);
//            sgmLib.pushScrollingText(transcript);
            checkIfSendBuffer();
        } else {
            lastIntermediateTranscript = transcript;
        }
    }

    public void checkIfSendBuffer() {
        //check if we should send message buffer to backend
        //first, split into words to get count
        String[] messageBufferWords = messageBuffer.toString().split(" ");
        String[] intermediateBufferWords = lastIntermediateTranscript.split(" ");
        Log.d(TAG, "" + messageBufferWords);
        Log.d(TAG, "" + intermediateBufferWords);

        if ((messageBufferWords.length + intermediateBufferWords.length) > nWordsThreshold) {
            Log.d(TAG, "message buffer passed word count threshold, sending");
            sendContextualSearchEngineQuery();
        }
    }

    public void askLLMCommandCallback(String args, long commandTriggeredTime) {
        Log.d(TAG,"Start CSE callback");

        bufferLive = true;

        //request to be in focus
        sgmLib.requestFocus(this::focusChangedCallback);

        //Subscribe to transcription stream
        sgmLib.subscribe(DataStreamType.TRANSCRIPTION_ENGLISH_STREAM, this::processTranscriptionCallback);

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

    public void sendCSEQueryRequest(String query){
        Log.d(TAG, "Running sendCSEQueryRequest with query: " + query);
        try{
            JSONObject jsonQuery = new JSONObject();
            jsonQuery.put("text", query);
            restComms.restRequest(RestComms.CSE_QUERY_ENDPOINT, jsonQuery, new VolleyCallback(){
                @Override
                public void onSuccess(JSONObject result){
                    Log.d(TAG, "GOT CSE Query REST RESULT:");
                    Log.d(TAG, result.toString());
                    try {
                        parseCSEQueryResult(result);
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

    public void parseCSEQueryResult(JSONObject response) throws JSONException {
        Log.d(TAG, "Got result from server: " + response.toString());

        try {
            JSONObject result = response.getJSONObject("result");
            Iterator<String> keys = result.keys();
            while(keys.hasNext()) {
                String key = keys.next();
                JSONObject value = result.getJSONObject(key);
                Log.d("JSON", "Key: " + key);// + ", Value: " + value);
                String summary = value.getString("summary");
                String toDisplay = key + ": " + summary.substring(0,Math.min(120, summary.length()));;

                //if we're in focus, display the result
                Log.d(TAG, "SHOWING: " + toDisplay);
                if (focusState.equals(FocusStates.IN_FOCUS)){
                    sgmLib.pushScrollingText(toDisplay);
                    Log.d(TAG, "SHOWN");
                }
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public void handleNewTranscript(String transcript){
        if (bufferLive) {
            messageBuffer.append(transcript.toLowerCase().trim());
            messageBuffer.append(" ");
            lastIntermediateTranscript = "";
        }
    }

    public void sendContextualSearchEngineQuery(){
        if (messageBuffer.length() != 0 || lastIntermediateTranscript.length() != 0) {
            sendCSEQueryRequest(messageBuffer.toString() + " " + lastIntermediateTranscript);
            String transcriptToSend = messageBuffer.toString() + " " + lastIntermediateTranscript;
            Log.d(TAG, "SENDING TO CSE BACKEND: " + transcriptToSend);
            messageBuffer = new StringBuffer();
            lastIntermediateTranscript = "";
        }
    }

//    public void userStopLLMQuery(){
//        transcriptFuture = executorService.schedule(() -> {
//            if (messageBuffer.length() != 0 || lastIntermediateTranscript.length() != 0) {
//                sendLLMQueryRequest(messageBuffer.toString() + " " + lastIntermediateTranscript);
//                messageBuffer = new StringBuffer();
//                lastIntermediateTranscript = "";
//                bufferLive = false;
//            }
//        }, 415, TimeUnit.MILLISECONDS);
//    }

    public void stopTTS(){
        if (tts != null && tts.isLoaded) {
            tts.stopSpeaking();
        }
    }

    public void focusChangedCallback(FocusStates focusState){
        Log.d(TAG, "Focus callback called with state: " + focusState);
        this.focusState = focusState;

        //StartScrollingText to show our translation
        if (focusState.equals(FocusStates.IN_FOCUS)) {
            sgmLib.startScrollingText("Contextual Search: ");
        }
    }
}