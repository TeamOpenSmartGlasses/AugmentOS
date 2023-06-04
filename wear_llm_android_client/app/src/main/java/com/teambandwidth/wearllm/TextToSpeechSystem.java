package com.teambandwidth.wearllm;

//based on https://github.com/emexlabs/WearableIntelligenceSystem/blob/master/android_smart_phone/main/app/src/main/java/com/wearableintelligencesystem/androidsmartphone/texttospeech/TextToSpeechSystem.java

import android.content.Context;
import android.os.Handler;
import android.speech.tts.TextToSpeech;
import android.util.Log;

import java.util.Locale;

public class TextToSpeechSystem {
    private String TAG = "WearLLM_TextToSpeechSystem";
    private Context mContext;

    public boolean isLoaded = false;
    private TextToSpeech ttsModel;
    public Locale language = Locale.ENGLISH;
    final Handler main_handler;

    public TextToSpeechSystem(Context context){
        this.mContext = context;
        this.language = Locale.ENGLISH;
        this.setup(language);
        main_handler = new Handler();
    }

    public void setup(Locale language){
        ttsModel = new TextToSpeech(mContext, status -> {
            if (status != -1) {
                ttsModel.setLanguage(language);
                Log.d("TextToSpeech","TTL Model initialized");
                this.isLoaded = true;
                Log.d(TAG, ttsModel.getVoices().toString());
                Log.d(TAG, ttsModel.getDefaultEngine());
            } else {
                Log.d(TAG, "TTS failed with code: " + status);
            }
        });
    }

    public void speak(String text){
        if(this.isLoaded){
            ttsModel.speak(text, TextToSpeech.QUEUE_FLUSH, null ,null);
        }
    }

    public void stopSpeaking(){
        if (this.isLoaded){
            ttsModel.stop();
        }
    }

    public void destroy(){
        ttsModel.shutdown();
        Log.d("TextToSpeech","TTS destroyed");
    }
}