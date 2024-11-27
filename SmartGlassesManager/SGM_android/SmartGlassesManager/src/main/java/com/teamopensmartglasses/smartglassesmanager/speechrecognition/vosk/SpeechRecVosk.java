//package com.teamopensmartglasses.smartglassesmanager.speechrecognition.vosk;
//
////Vosk ASR
//
//import android.content.Context;
//import android.os.Handler;
//import android.util.Base64;
//import android.util.Log;
//
//import com.teamopensmartglasses.smartglassesmanager.comms.MessageTypes;
//import com.teamopensmartglasses.augmentoslib.events.SpeechRecOutputEvent;
//import com.teamopensmartglasses.smartglassesmanager.speechrecognition.SpeechRecFramework;
//
//import org.greenrobot.eventbus.EventBus;
//import org.json.JSONException;
//import org.json.JSONObject;
//import org.vosk.LibVosk;
//import org.vosk.LogLevel;
//import org.vosk.Model;
//import org.vosk.Recognizer;
//import org.vosk.android.RecognitionListener;
//import org.vosk.android.StorageService;
//
//import java.io.InputStream;
//import java.util.Dictionary;
//import java.util.Hashtable;
//import java.util.Locale;
//import java.util.concurrent.ArrayBlockingQueue;
//import java.util.concurrent.BlockingQueue;
//
//import io.reactivex.rxjava3.disposables.Disposable;
//import io.reactivex.rxjava3.subjects.PublishSubject;
//
//public class SpeechRecVosk extends SpeechRecFramework implements RecognitionListener {
//    public String TAG = "WearableAi_SpeechRecVosk";
//
//    private String languageModelPath;
//
//    private boolean isBaseLanguage = true;
//
//    private Context mContext;
//
//    //the current phrase we are receiving
//    private boolean newPhrase = true;
//
//    private Model model;
//    //private SpeechService speechService;
//    //private SpeechStreamService speechStreamService;
//    private SpeechStreamQueueServiceVosk speechStreamService;
////    private PhraseRepository mPhraseRepository = null;
//
//    private VoskAudioBytesStream voskAudioBytesStream;
//    //private PipedOutputStream audioAdderStreamVosk;
//    //private InputStream audioSenderStreamVosk;
//    private int audioSenderStreamVoskSize;
//    private BlockingQueue<byte []> audioSenderStreamVosk;
//    private Handler main_handler;
//
//    //receive/send data stream
//    PublishSubject<JSONObject> dataObservable;
//    Disposable dataSub;
//    //receive audio stream
//    PublishSubject<byte []> audioObservable;
//    Disposable audioSub;
//
//    //languages
//    String baseLanguage = "english";
//    public static Dictionary<String, NaturalLanguage> supportedLanguages = new Hashtable<String, NaturalLanguage>();
//
//    public SpeechRecVosk(Context context){
//        mContext = context;
//        this.isBaseLanguage = true;// isBaseLanguage;
//
//        //setup languages
//        supportedLanguages.put("english", new NaturalLanguage("english", "en", "model-en-us", Locale.ENGLISH)); //english
//        this.languageModelPath = supportedLanguages.get(baseLanguage).getModelLocation(); //languageModelPath;
////        supportedLanguages.put("french", new NaturalLanguage("french", "fr", "model-fr-small", Locale.FRENCH)); //french
//        //supportedLanguages.add(new NaturalLanguage("chinese", "zh", "model-cn-small", Locale.CHINESE)); //chinese
//        //supportedLanguages.add(new NaturalLanguage("italian", "it", "model-it-small", Locale.ITALIAN)); //italian
//        //supportedLanguages.add(new NaturalLanguage("japanese", "ja", "model-jp-small", Locale.JAPANESE)); //japanese
//
//        //to save trancript
////        this.mPhraseRepository = mPhraseRepository;
//
//        //receive/send data
////        this.dataObservable = dataObservable;
////        dataSub = this.dataObservable.subscribe(i -> handleDataStream(i));
////        setupEventBusSubscribers();
//
//        //receive audio
//        //this.audioObservable = audioObservable;
//        //audioSub = this.audioObservable.subscribe(i -> handleDataStream(i));
//
//        //setup the object which will pass audio bytes to vosk
////        audioSenderStreamVoskSize = (int) (16000 * 2 * 0.2);
//        audioSenderStreamVoskSize = (int) (16000 * 2 * 0.192);
////        audioSenderStreamVoskSize = (int) (16000 * 2 * 0.064);
//        audioSenderStreamVosk = new ArrayBlockingQueue(audioSenderStreamVoskSize);
//    }
//
//    @Override
//    public void start(){
//        //start vosk ASR
//        LibVosk.setLogLevel(LogLevel.INFO);
//        initModel();
//
//        //start recognizing audio after delay, must first wait for model to load
//        main_handler = new Handler();
//        final int delay = 500;
//        main_handler.postDelayed(new Runnable() {
//            public void run() {
//                if (model != null){
//                    recognizeSpeech();
//                } else {
//                    main_handler.postDelayed(this, delay);
//                }
//            }
//        }, delay);
//    }
//
//    private void setupEventBusSubscribers(){
//            EventBus.getDefault().register(this);
//    }
//
//        private void initModel() {
//        Log.d(TAG, "Initing ASR model...");
//        StorageService.unpack(mContext, languageModelPath, "model",
//                (model) -> {
//                    this.model = model;
//                },
//                (exception) -> setErrorState("Failed to unpack the model: " + exception.getMessage()));
//        Log.d(TAG, "ASR Model loaded.");
//    }
//
//    private void setErrorState(String message) {
//        Log.d(TAG, "VOSK error: " + message);
//    }
//
//    private void recognizeSpeech() {
//        if (speechStreamService != null) {
//            speechStreamService.stop();
//            speechStreamService = null;
//        } else {
//            Log.d(TAG, "VOSK MAKE RECOGNIZER");
//            Recognizer rec = new Recognizer(model, 16000.0f);
//            Log.d(TAG, "VOSK MAKE SPEECH SERVICE");
//            //speechService = new SpeechService(rec, 16000.0f);
//            //6416 is hard coded - same as chunk_len - size of buffer used on ASG
//            speechStreamService = new SpeechStreamQueueServiceVosk(rec, audioSenderStreamVosk, 16000.0f);
//            Log.d(TAG, "VOSK START LISTENING");
//            //speechService.startListening(rec);
//            speechStreamService.start(this);
//        }
//    }
//
//    private void pause(boolean checked) {
////        if (speechStreamService != null) {
////            speechStreamService.setPause(checked);
////        }
//    }
//
//    public void destroy() {
//        Log.d(TAG, "Destroying VOSK");
//        EventBus.getDefault().unregister(this);
//        if (speechStreamService != null) {
//            speechStreamService.stop();
//        }
//    }
//
//    //receive audio and send to vosk
//    private void handleDataStream(JSONObject data){
//        try {
//            String dataType = data.getString(MessageTypes.MESSAGE_TYPE_LOCAL);
//            if (dataType.equals(MessageTypes.AUDIO_CHUNK_DECRYPTED)){
//                String encodedPlainData = data.getString(MessageTypes.AUDIO_DATA);
//                byte [] decodedPlainData = Base64.decode(encodedPlainData, Base64.DEFAULT);
//                audioSenderStreamVosk.put(decodedPlainData);
//            }
//        } catch (InterruptedException | JSONException e) {
//            setErrorState(e.getMessage());
//        }
//    }
//
//    //make our own InputStream class we can fill with audio to pass to vosk
//    class VoskAudioBytesStream extends InputStream {
//        public byte [] data;
//
//        public int read() {
//            byte [] tmp = {0x01, 0x01};
//            return 0;
//        }
//
//        public void write(byte [] inputData){
//            data = inputData;
//        }
//    }
//
//    //vosk listener implementation
//    @Override
//    public void onResult(String hypothesis) {
//        //start recognizing audio after delay, must first wait for model to load
//        main_handler.post(new Runnable() {
//            public void run() {
//                handleResult(hypothesis);
//            }
//        });
//    }
//
//    public void handleResult(String hypothesis){
//        long transcriptTime = System.currentTimeMillis();
//        handleTranscript(hypothesis, MessageTypes.FINAL_TRANSCRIPT, transcriptTime);
//    }
//
//    public void handleTranscript(String hypothesis, String transcriptType, long transcriptTime){
//        //save transcript then send to other services in app
//        try {
//            //Below, we do a parsing of Vosk's silly string output
//            //https://github.com/alphacep/vosk-android-demo/issues/81
//            JSONObject voskResponse = new JSONObject(hypothesis);
//            String transcript;
//
//            //to send to other services
//            JSONObject transcriptObj = new JSONObject();
//            //different message types depending on whether or not this is the base language or a foreign language
//
//            if (transcriptType.equals(MessageTypes.FINAL_TRANSCRIPT)){
//                transcript = voskResponse.getString("text");
//                //set event bus type
//                if (isBaseLanguage) {
//                    transcriptObj.put(MessageTypes.MESSAGE_TYPE_LOCAL, transcriptType);
//                } else {
//                    transcriptObj.put(MessageTypes.MESSAGE_TYPE_LOCAL, MessageTypes.FINAL_TRANSCRIPT_FOREIGN);
//                }
//            } else if (transcriptType.equals(MessageTypes.INTERMEDIATE_TRANSCRIPT)) {
//                transcript = voskResponse.getString("partial");
//                if (isBaseLanguage) {
//                    transcriptObj.put(MessageTypes.MESSAGE_TYPE_LOCAL, transcriptType);
//                } else {
//                    transcriptObj.put(MessageTypes.MESSAGE_TYPE_LOCAL, MessageTypes.INTERMEDIATE_TRANSCRIPT_FOREIGN);
//                }
//            } else {
//                return;
//            }
//
//            //don't save null or empty transcripts
//            if (transcript == null || transcript.trim().isEmpty()){
//                return;
//            }
//
//            //don't save transcripts that always appear incorrect
//            String [] badHitWords = {"huh", "her", "hit", "cut", "this", "if", "but", "by", "hi", "ha", "a", "the", "det", "it", "you", "he"};
//            for (int i = 0; i < badHitWords.length; i++){
//                if (transcript.equals(badHitWords[i])){
//                    return;
//                }
//            }
//
//            if (isBaseLanguage) {
//                if (newPhrase) {
////                    currPhrase = PhraseCreator.init("transcript_ASG", mContext, mPhraseRepository);
//                    newPhrase = false;
//                }
//
//                //update the current phrase
////                PhraseCreator.create(currPhrase, transcript, mContext, mPhraseRepository);
//
//                //save transcript if final
//                if (transcriptType.equals(MessageTypes.FINAL_TRANSCRIPT)) {
//                    newPhrase = true;
//                }
////                transcriptObj.put(MessageTypes.TRANSCRIPT_ID, currPhrase.getId());
////                transcriptObj.put(MessageTypes.TIMESTAMP, transcriptTime);
//            }
////            transcriptObj.put(MessageTypes.TRANSCRIPT_TEXT, transcript);
////            Log.d(TAG, "VOSK SENDING: ");
////            Log.d(TAG, transcriptObj.toString());
////            dataObservable.onNext(transcriptObj);
//
////            EventBus.getDefault().post(new SendableIntentEvent(transcriptObj));
//
//            //post the event bus event
//            if (transcriptType.equals(MessageTypes.FINAL_TRANSCRIPT)) {
//                EventBus.getDefault().post(new SpeechRecOutputEvent(transcript, transcriptTime, true));
//            } else {
//                EventBus.getDefault().post(new SpeechRecOutputEvent(transcript, transcriptTime, false));
//            }
//        } catch (JSONException e){
//            e.printStackTrace();
//        }
//    }
//
//    @Override
//    public void onFinalResult(String hypothesis) {
//        if (speechStreamService != null) {
//            speechStreamService = null;
//        }
//    }
//
//    @Override
//    public void onPartialResult(String hypothesis) {
//        long transcriptTime = System.currentTimeMillis();
//        handleTranscript(hypothesis, MessageTypes.INTERMEDIATE_TRANSCRIPT, transcriptTime);
//    }
//
//    @Override
//    public void onError(Exception e) {
//        setErrorState(e.getMessage());
//    }
//
//    @Override
//    public void onTimeout() {
//        Log.d(TAG, "VOSK: timeout");
//    }
//
////    @Subscribe
////    public void onVoskAudioChunkNewEvent(VoskAudioChunkNewEvent receivedEvent){
////        try {
////            audioSenderStreamVosk.put(receivedEvent.thisChunk);
////        } catch (InterruptedException e) {
////            e.printStackTrace();
////        }
////    }
//
//    @Override
//    public void ingestAudioChunk(byte[] audioChunk) {
////        Log.d(TAG, "Got chunk Vosk");
//        try {
//            audioSenderStreamVosk.put(audioChunk);
//        } catch (InterruptedException e) {
//            e.printStackTrace();
//        }
//    }
//}
