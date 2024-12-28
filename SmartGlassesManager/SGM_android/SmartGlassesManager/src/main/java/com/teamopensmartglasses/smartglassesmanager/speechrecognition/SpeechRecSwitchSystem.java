package com.teamopensmartglasses.smartglassesmanager.speechrecognition;

import android.content.Context;
import android.util.Log;

import com.teamopensmartglasses.augmentoslib.events.AudioChunkNewEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.PauseAsrEvent;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.azure.SpeechRecAzure;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.deepgram.SpeechRecDeepgram;
import com.teamopensmartglasses.smartglassesmanager.speechrecognition.google.SpeechRecGoogle;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;

//send audio to one of the built in ASR frameworks.
public class SpeechRecSwitchSystem {
    private final String TAG = "WearableAi_SpeechRecSwitchSystem";
    private ASR_FRAMEWORKS asrFramework;
    private SpeechRecFramework speechRecFramework;
    private SpeechRecGoogle speechRecGoogle;
    private Context mContext;
    public String currentLanguage;

    public SpeechRecSwitchSystem(Context mContext) {
        this.mContext = mContext;
    }

    public void startAsrFramework(ASR_FRAMEWORKS asrFramework) {
        startAsrFramework(asrFramework, "English");
    }

    public void startAsrFramework(ASR_FRAMEWORKS asrFramework, String language) {
        //kill old asr
        EventBus.getDefault().unregister(this);
        if (speechRecFramework != null){
            speechRecFramework.destroy();
        }

        //set language
        this.currentLanguage = language;

        //set new asr
        this.asrFramework = asrFramework;

        //create new asr
        if (this.asrFramework == ASR_FRAMEWORKS.GOOGLE_ASR_FRAMEWORK){
            speechRecFramework = new SpeechRecGoogle(mContext, language);
        } else if (this.asrFramework == ASR_FRAMEWORKS.DEEPGRAM_ASR_FRAMEWORK){
            speechRecFramework = new SpeechRecDeepgram(mContext, language);
        } else if (this.asrFramework == ASR_FRAMEWORKS.AZURE_ASR_FRAMEWORK){
            speechRecFramework = new SpeechRecAzure(mContext, language);
        } else {
            Log.e(TAG, "Falling back to Azure ASR Framework, as the selected ASR framework is not supported.");
            speechRecFramework = new SpeechRecAzure(mContext, language);
        }

        //start asr
        speechRecFramework.start();
        EventBus.getDefault().register(this);
    }

    public void startAsrFramework(ASR_FRAMEWORKS asrFramework, String transcribeLanguage, String sourceLanguage) {
        //kill old asr
        EventBus.getDefault().unregister(this);
        if (speechRecFramework != null){
            speechRecFramework.destroy();
        }

//        if (!(this.asrFramework == ASR_FRAMEWORKS.AZURE_ASR_FRAMEWORK)) {
//            Log.e(TAG, "startAsrFramework: This function is only for Azure ASR");
//            return;
//        }


        //set language
        this.currentLanguage = transcribeLanguage;

        //set new asr
        this.asrFramework = asrFramework;

        //create new asr
        speechRecFramework = new SpeechRecAzure(mContext, transcribeLanguage, sourceLanguage);

        //start asr
        speechRecFramework.start();
        EventBus.getDefault().register(this);
    }

    @Subscribe
    public void onAudioChunkNewEvent(AudioChunkNewEvent receivedEvent){
        //redirect audio to the currently in use ASR framework, if it's not paused
        if (!speechRecFramework.pauseAsrFlag) {
            speechRecFramework.ingestAudioChunk(receivedEvent.thisChunk);
        }
    }

    @Subscribe
    public void onPauseAsrEvent(PauseAsrEvent receivedEvent){
        //redirect audio to the currently in use ASR framework
        speechRecFramework.pauseAsr(receivedEvent.pauseAsr);
    }

    public void destroy(){
        if (speechRecFramework != null){
            speechRecFramework.destroy();
        }
        EventBus.getDefault().unregister(this);
    }
}

