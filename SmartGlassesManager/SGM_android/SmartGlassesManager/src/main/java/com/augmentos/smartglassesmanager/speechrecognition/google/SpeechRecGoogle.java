package com.augmentos.smartglassesmanager.speechrecognition.google;

import static com.google.audio.asr.SpeechRecognitionModelOptions.SpecificModel.DICTATION_DEFAULT;
import static com.google.audio.asr.SpeechRecognitionModelOptions.SpecificModel.VIDEO;
import static com.google.audio.asr.TranscriptionResultFormatterOptions.TranscriptColoringStyle.NO_COLORING;

import android.content.Context;

import com.google.audio.CodecAndBitrate;
import com.google.audio.asr.CloudSpeechSessionParams;
import com.google.audio.asr.CloudSpeechStreamObserverParams;
import com.google.audio.asr.SpeechRecognitionModelOptions;
import com.google.audio.asr.TranscriptionResultFormatterOptions;
import com.augmentos.smartglassesmanager.SmartGlassesAndroidService;
import com.augmentos.augmentoslib.events.SpeechRecOutputEvent;
import com.augmentos.smartglassesmanager.speechrecognition.SpeechRecFramework;
import com.augmentos.smartglassesmanager.speechrecognition.google.asr.RepeatingRecognitionSession;
import com.augmentos.smartglassesmanager.speechrecognition.google.asr.SafeTranscriptionResultFormatter;
import com.augmentos.smartglassesmanager.speechrecognition.google.asr.TranscriptionResultUpdatePublisher;
import com.augmentos.smartglassesmanager.speechrecognition.google.asr.asrhelpers.NetworkConnectionChecker;
import com.augmentos.smartglassesmanager.speechrecognition.google.gcloudspeech.CloudSpeechSessionFactory;
import com.augmentos.smartglassesmanager.speechrecognition.vad.VadGateSpeechPolicy;

import org.greenrobot.eventbus.EventBus;

public class SpeechRecGoogle extends SpeechRecFramework {
    public String TAG = "WearableAi_SpeechRecGoogle";

    private Context mContext;

    public SpeechRecGoogle(Context mContext) {
        this.mContext = mContext;

        initLanguageLocaleDefault();

//        EventBus.getDefault().register(this);
    }
    public SpeechRecGoogle(Context mContext, String languageLocale) {
        this.mContext = mContext;

        initLanguageLocale(languageLocale);

//        EventBus.getDefault().register(this);
    }

//    @Subscribe
//    public void onGoogleAudioChunkNewEvent(GoogleAudioChunkNewEvent receivedEvent) {
//    }

    @Override
    public void ingestAudioChunk(byte[] audioChunk) {
        recognizer.processAudioBytes(audioChunk);
    }

    @Override
    public void start(){
        //start text to speech
        constructRepeatingRecognitionSession();
        recognizer.init(1024*3);
    }

    @Override
    public void destroy(){
        if (recognizer != null) {
            recognizer.unregisterCallback(transcriptUpdater);
            networkChecker.unregisterNetworkCallback();
            recognizer.stop();
        }
    }

    private int currentLanguageCodePosition;
    private String currentLanguageCode;

    // This class was intended to be used from a thread where timing is not critical (i.e. do not
    // call this in a system audio callback). Network calls will be made during all of the functions
    // that RepeatingRecognitionSession inherits from SampleProcessorInterface.
    private RepeatingRecognitionSession recognizer;
    private NetworkConnectionChecker networkChecker;

    private final TranscriptionResultUpdatePublisher transcriptUpdater =
            (formattedTranscript, updateType) -> {
                //post the event bus event
                if (updateType == TranscriptionResultUpdatePublisher.UpdateType.TRANSCRIPT_FINALIZED){
//                    Log.d(TAG, "GOT FINAL TRANSCRIPT: " + formattedTranscript.toString());
                    EventBus.getDefault().post(new SpeechRecOutputEvent(formattedTranscript.toString(), currentLanguageCode, System.currentTimeMillis(), true));
                } else {
                    EventBus.getDefault().post(new SpeechRecOutputEvent(formattedTranscript.toString(), currentLanguageCode, System.currentTimeMillis(), false));
                }
            };

    private void initLanguageLocaleDefault() {
        // The default locale is en-US.
        currentLanguageCode = "en-US";
    }

    private void initLanguageLocale(String localeString) {
        if (localeString.equals("English")) {
            currentLanguageCode = "en-US";
        } else if (localeString.equals("Russian")) {
            currentLanguageCode = "ru-RU";
        } else if (localeString.equals("Japanese")) {
            currentLanguageCode = "ja-JP";
        } else if (localeString.contains("Chinese")) {
            currentLanguageCode = "zh";
        } else if (localeString.equals("Spanish")) {
            currentLanguageCode = "es-MX";
        } else if (localeString.equals("Hebrew")) {
            currentLanguageCode = "iw-IL";
        } else if (localeString.equals("Dutch")) {
            currentLanguageCode = "nl-NL";
        } else if(localeString.equals("French")){
            currentLanguageCode = "fr-FR";
        }else if (localeString.equals("German")) {
            currentLanguageCode = "de-DE";
        } else if (localeString.equals("Arabic")) {
            currentLanguageCode = "ar-AR";
        } else if (localeString.equals("Korean")) {
            currentLanguageCode = "ko-KR";
        } else if (localeString.equals("Italian")) {
            currentLanguageCode = "it-IT";
        } else if (localeString.equals("Turkish")) {
            currentLanguageCode = "tr-TR";
        } else if (localeString.equals("Portuguese")) {
            currentLanguageCode = "pt-PT";
        } else {
            currentLanguageCode = "en-US";
        }
    }

    private void constructRepeatingRecognitionSession() {
        SpeechRecognitionModelOptions options =
                SpeechRecognitionModelOptions.newBuilder()
                        .setLocale(currentLanguageCode)
                        // As of 7/18/19, Cloud Speech's video model supports en-US only.
                        .setModel(currentLanguageCode.equals("en-US") ? VIDEO : DICTATION_DEFAULT) //this is overwritten to use 'latest_long' in cloud/CloudSpeechSession.java
                        .build();
        CloudSpeechSessionParams cloudParams =
                CloudSpeechSessionParams.newBuilder()
                        .setObserverParams(
                                CloudSpeechStreamObserverParams.newBuilder().setRejectUnstableHypotheses(false))
                        .setFilterProfanity(false)
                        .setEncoderParams(
                                CloudSpeechSessionParams.EncoderParams.newBuilder()
                                        .setEnableEncoder(true)
                                        .setAllowVbr(true)
                                        .setCodec(CodecAndBitrate.OGG_OPUS_BITRATE_32KBPS))
                        .build();
        networkChecker = new NetworkConnectionChecker(mContext);
        networkChecker.registerNetworkCallback();

        // There are lots of options for formatting the text. These can be useful for debugging
        // and visualization, but it increases the effort of reading the transcripts.
        TranscriptionResultFormatterOptions formatterOptions =
                TranscriptionResultFormatterOptions.newBuilder()
                        .setTranscriptColoringStyle(NO_COLORING)
                        .build();
        RepeatingRecognitionSession.Builder recognizerBuilder =
                RepeatingRecognitionSession.newBuilder()
                        .setSpeechSessionFactory(new CloudSpeechSessionFactory(cloudParams, SmartGlassesAndroidService.getApiKey(mContext)))
                        .setSampleRateHz(16000)
                        .setTranscriptionResultFormatter(new SafeTranscriptionResultFormatter(formatterOptions))
                        .setSpeechRecognitionModelOptions(options)
                        .setSpeechDetectionPolicy(new VadGateSpeechPolicy(mContext))
                        .setNetworkConnectionChecker(networkChecker);
        recognizer = recognizerBuilder.build();
        recognizer.registerCallback(transcriptUpdater, TranscriptionResultUpdatePublisher.ResultSource.MOST_RECENT_SEGMENT);
    }
}
