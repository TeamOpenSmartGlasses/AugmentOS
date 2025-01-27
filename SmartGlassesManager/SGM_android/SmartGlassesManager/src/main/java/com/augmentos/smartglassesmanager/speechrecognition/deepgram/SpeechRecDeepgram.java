package com.augmentos.smartglassesmanager.speechrecognition.deepgram;

import android.content.Context;
import android.util.Log;

import com.augmentos.augmentoslib.events.SpeechRecOutputEvent;
import com.augmentos.smartglassesmanager.speechrecognition.SpeechRecFramework;

import org.greenrobot.eventbus.EventBus;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;

public class SpeechRecDeepgram extends SpeechRecFramework {
//    private static final String BASE_URL = "wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&diarize=false&interim_results=true&smart_format=true&utterance_end_ms=1200&punctuate=true"; //&filler_words=true";
    private static final String BASE_URL = "wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&diarize=false&interim_results=true"; //&filler_words=true";
    private static final String API_KEY = "3d445184e814ba545ad508c24f08b0f5e2645c09";
    private WebSocket webSocket;
    public String TAG = "WearableAi_SpeechRecDeepgram";

    private Context mContext;
    private String currentLanguageCode;

    public SpeechRecDeepgram(Context context, String languageLocale) {
        this.mContext = context;
        initLanguageLocale(languageLocale);
    }

    @Override
    public void start() {
        Log.d(TAG, "starting Deepgram");
        initializeWebSocket();
    }

    @Override
    public void destroy() {
        Log.d(TAG, "destroying Deepgram");
        if (webSocket != null) {
            webSocket.close(1000, "Closing Connection");
        }
    }

    @Override
    public void ingestAudioChunk(byte[] audioChunk) {
        if (webSocket != null) {
            webSocket.send(ByteString.of(audioChunk));
        }
    }

    private void initializeWebSocket() {
        Log.d(TAG, "init socket Deepgram");
        OkHttpClient client = new OkHttpClient();
        String url = BASE_URL + "&language=" + currentLanguageCode;
        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", "Token " + API_KEY)
                .build();

        webSocket = client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket webSocket, Response response) {
                Log.d(TAG, "opened Deepgram");
            }

            @Override
            public void onMessage(WebSocket webSocket, String text) {
                parseDeepgramMessage(text);
            }

            @Override
            public void onClosing(WebSocket webSocket, int code, String reason) {
                webSocket.close(1000, null);
                Log.d(TAG, "got closing Deepgram");
            }

            @Override
            public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                Log.d(TAG, "failure in Deepgram");
            }
        });

        client.dispatcher().executorService().shutdown();
    }

    public void parseDeepgramMessage(String jsonString) {
        try {
            JSONObject obj = new JSONObject(jsonString);

            String type = obj.getString("type");
            JSONArray channelIndex = obj.getJSONArray("channel_index");
            double duration = obj.getDouble("duration");
            double start = obj.getDouble("start");
            boolean isFinal = obj.getBoolean("is_final");
            boolean speechFinal = obj.getBoolean("speech_final");

            JSONObject channel = obj.getJSONObject("channel");
            JSONArray alternatives = channel.getJSONArray("alternatives");
            JSONObject firstAlternative = alternatives.getJSONObject(0);
            String transcript = firstAlternative.getString("transcript");
            double confidence = firstAlternative.getDouble("confidence");

            JSONObject metadata = obj.getJSONObject("metadata");
            String requestId = metadata.getString("request_id");
            JSONObject modelInfo = metadata.getJSONObject("model_info");
            String modelName = modelInfo.getString("name");
            String modelVersion = modelInfo.getString("version");
            String modelArch = modelInfo.getString("arch");
            String modelUuid = metadata.getString("model_uuid");

            boolean fromFinalize = obj.getBoolean("from_finalize");

            if (!transcript.equals("") && !transcript.equals(" ") && transcript != null) {
                EventBus.getDefault().post(new SpeechRecOutputEvent(transcript, "en", (long) start, isFinal));
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    private void initLanguageLocaleDefault() {
        currentLanguageCode = "en-US";
    }

    private void initLanguageLocale(String localeString) {
        switch (localeString) {
            case "Bulgarian":
                currentLanguageCode = "bg";
                break;
            case "Catalan":
                currentLanguageCode = "ca";
                break;
            case "Chinese (Pinyin)":
            case "Chinese (Hanzi)":
            case "Chinese (Simplified)":
            case "Mandarin Simplified":
                currentLanguageCode = "zh";
                break;
            case "Czech":
                currentLanguageCode = "cs";
                break;
            case "Danish":
                currentLanguageCode = "da";
                break;
            case "Dutch":
                currentLanguageCode = "nl";
                break;
            case "English":
                currentLanguageCode = "en";
                break;
            case "Estonian":
                currentLanguageCode = "et";
                break;
            case "Finnish":
                currentLanguageCode = "fi";
                break;
            case "French":
                currentLanguageCode = "fr";
                break;
            case "German":
                currentLanguageCode = "de";
                break;
            case "Greek":
                currentLanguageCode = "el";
                break;
            case "Hindi":
                currentLanguageCode = "hi";
                break;
            case "Hungarian":
                currentLanguageCode = "hu";
                break;
            case "Indonesian":
                currentLanguageCode = "id";
                break;
            case "Italian":
                currentLanguageCode = "it";
                break;
            case "Japanese":
                currentLanguageCode = "ja";
                break;
            case "Korean":
                currentLanguageCode = "ko";
                break;
            case "Latvian":
                currentLanguageCode = "lv";
                break;
            case "Lithuanian":
                currentLanguageCode = "lt";
                break;
            case "Malay":
                currentLanguageCode = "ms";
                break;
            case "Norwegian":
                currentLanguageCode = "no";
                break;
            case "Polish":
                currentLanguageCode = "pl";
                break;
            case "Portuguese":
                currentLanguageCode = "pt";
                break;
            case "Romanian":
                currentLanguageCode = "ro";
                break;
            case "Russian":
                currentLanguageCode = "ru";
                break;
            case "Slovak":
                currentLanguageCode = "sk";
                break;
            case "Spanish":
                currentLanguageCode = "es";
                break;
            case "Swedish":
                currentLanguageCode = "sv";
                break;
            case "Thai":
                currentLanguageCode = "th";
                break;
            case "Turkish":
                currentLanguageCode = "tr";
                break;
            case "Ukrainian":
                currentLanguageCode = "uk";
                break;
            case "Vietnamese":
                currentLanguageCode = "vi";
                break;
            default:
                currentLanguageCode = "en";
                break;
        }
    }
}
