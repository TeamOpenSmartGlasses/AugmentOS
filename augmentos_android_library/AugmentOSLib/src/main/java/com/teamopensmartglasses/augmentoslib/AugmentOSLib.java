package com.teamopensmartglasses.augmentoslib;

import static com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants.AugmentOSManagerPackageName;

import android.content.Context;
import android.graphics.Bitmap;
import android.util.Log;

import com.teamopensmartglasses.augmentoslib.events.BulletPointListViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.CenteredTextViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.CommandTriggeredEvent;
import com.teamopensmartglasses.augmentoslib.events.CoreToManagerOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.DisplayCustomContentRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.DoubleTextWallViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.FinalScrollingTextRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.FocusChangedEvent;
import com.teamopensmartglasses.augmentoslib.events.GlassesPovImageEvent;
import com.teamopensmartglasses.augmentoslib.events.GlassesTapOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.HomeScreenEvent;
import com.teamopensmartglasses.augmentoslib.events.ManagerToCoreRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ReferenceCardImageViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ReferenceCardSimpleViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.RegisterCommandRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.RegisterTpaRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.RowsCardViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ScrollingTextViewStartRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ScrollingTextViewStopRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.SendBitmapViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.SmartRingButtonOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.SpeechRecOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.StartAsrStreamRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.StopAsrStreamRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.SubscribeDataStreamRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.TextLineViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.TextWallViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.TranslateOutputEvent;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;

import java.util.HashMap;

public class AugmentOSLib {
    public String TAG = "AugmentOSLib_AugmentOSLib";

    private TPABroadcastReceiver augmentosReceiver;
    private TPABroadcastSender augmentosSender;
    private Context mContext;
    private AugmentOSCallbackMapper augmentosCallbackMapper;
    private FocusCallback focusCallback;

    public HashMap<DataStreamType, SubscriptionCallback> subscribedDataStreams;

    private SmartGlassesAndroidService smartGlassesAndroidService;

    public AugmentOSLib(Context context){
        this.mContext = context;
        augmentosCallbackMapper = new AugmentOSCallbackMapper();
        augmentosReceiver = new TPABroadcastReceiver(context);
        augmentosSender = new TPABroadcastSender(context);
        subscribedDataStreams = new HashMap<DataStreamType, SubscriptionCallback>();

        //register subscribers on EventBus
        EventBus.getDefault().register(this);
    }

    //register a new command
    public void registerCommand(AugmentOSCommand augmentosCommand, AugmentOSCallback callback){
        // augmentosCommand.packageName = mContext.getPackageName();
        augmentosCommand.serviceName = mContext.getClass().getName();

        augmentosCallbackMapper.putCommandWithCallback(augmentosCommand, callback);
        EventBus.getDefault().post(new RegisterCommandRequestEvent(augmentosCommand));
    }

    //register our app with the AugmentOS
//    public void registerApp(String appName, String appDescription) {
//        registerApp(appName, appDescription, new AugmentOSCommand[]{});
//    }
//
//    public void registerApp(String appName, String appDescription, AugmentOSCommand[] commandList) {
//        String packageName = mContext.getPackageName();
//        String serviceName = mContext.getClass().getName();
//        ThirdPartyApp tpa = new ThirdPartyApp(appName, appDescription, packageName, serviceName, commandList);
//        EventBus.getDefault().post(new RegisterTpaRequestEvent(tpa));
//
//        for (AugmentOSCommand command : commandList) {
//
//        }
//    }

    public void subscribeCoreToManagerMessages(CoreToManagerCallback callback){
        if (!mContext.getPackageName().equals(AugmentOSManagerPackageName)) {
            Log.d(TAG, "Attempted to subscribe to CoreToManagerMessages from a non-manager package");
            return;
        };

        subscribedDataStreams.put(DataStreamType.CORE_SYSTEM_MESSAGE, callback);
    }

    public void subscribe(StartAsrStreamRequestEvent startAsrStreamRequestEvent){
        EventBus.getDefault().post((StartAsrStreamRequestEvent) startAsrStreamRequestEvent);
    }

    public void subscribe(StopAsrStreamRequestEvent stopAsrStreamRequestEvent){
        EventBus.getDefault().post((StopAsrStreamRequestEvent) stopAsrStreamRequestEvent);
    }

    public void subscribe(DataStreamType dataStreamType, TranscriptCallback callback){
        subscribedDataStreams.put(dataStreamType, callback);

        //trigger event to change language if needed
        EventBus.getDefault().post(new SubscribeDataStreamRequestEvent(dataStreamType));
    }

    public void subscribe(DataStreamType dataStreamType, TranslateCallback callback){
        subscribedDataStreams.put(dataStreamType, callback);

        //trigger event to change language if needed
        EventBus.getDefault().post(new SubscribeDataStreamRequestEvent(dataStreamType));
    }

    public void subscribe(DataStreamType dataStreamType, ButtonCallback callback){
        subscribedDataStreams.put(dataStreamType, callback);
    }

    public void subscribe(DataStreamType dataStreamType, TapCallback callback){
        subscribedDataStreams.put(dataStreamType, callback);
    }

    public void subscribe(DataStreamType dataStreamType, GlassesPovImageCallback callback){
        subscribedDataStreams.put(dataStreamType, callback);
    }

//    //TPA request to be the app in focus - AugmentOS has to grant this request
//    public void requestFocus(FocusCallback callback){
//        focusCallback = callback;
//        EventBus.getDefault().post(new FocusRequestEvent(true));
//    }


    public void sendCustomContent(String json) {
        EventBus.getDefault().post(new DisplayCustomContentRequestEvent(json));
    }

    //show a reference card on the smart glasses with title and body text
    public void sendReferenceCard(String title, String body) {
        EventBus.getDefault().post(new ReferenceCardSimpleViewRequestEvent(title, body));
    }

    //show a bullet point list card on the smart glasses with title and bullet points
    public void sendBulletPointList(String title, String [] bullets) {
        EventBus.getDefault().post(new BulletPointListViewRequestEvent(title, bullets));
    }

    public void sendReferenceCard(String title, String body, String imgUrl) {
        EventBus.getDefault().post(new ReferenceCardImageViewRequestEvent(title, body, imgUrl));
    }

    public void startScrollingText(String title){
        EventBus.getDefault().post(new ScrollingTextViewStartRequestEvent(title));
    }

    public void pushScrollingText(String text){
        EventBus.getDefault().post(new FinalScrollingTextRequestEvent(text));
    }

    public void stopScrollingText(){
        EventBus.getDefault().post(new ScrollingTextViewStopRequestEvent());
    }

    public void sendTextLine(String text) {
        EventBus.getDefault().post(new TextLineViewRequestEvent(text));
    }

    public void sendCenteredText(String text){
        EventBus.getDefault().post(new CenteredTextViewRequestEvent(text));
    }

    public void sendTextWall(String text){
        EventBus.getDefault().post(new TextWallViewRequestEvent(text));
    }

    public void sendDoubleTextWall(String textTop, String textBottom){
        EventBus.getDefault().post(new DoubleTextWallViewRequestEvent(textTop, textBottom));
    }

    public void sendRowsCard(String[] rowStrings){
        EventBus.getDefault().post(new RowsCardViewRequestEvent(rowStrings));
    }

    public void sendBitmap(Bitmap bmp){
        EventBus.getDefault().post(new SendBitmapViewRequestEvent(bmp));
    }

    public void sendHomeScreen(){
        EventBus.getDefault().post(new HomeScreenEvent());
    }

    public void getSelectedLiveCaptionsTranslation(){
        EventBus.getDefault().post(new HomeScreenEvent());
    }

    public void getChosenTranscribeLanguage(){
        EventBus.getDefault().post(new HomeScreenEvent());
    }

    public void sendDataFromManagerToCore(String jsonData) {
        EventBus.getDefault().post(new ManagerToCoreRequestEvent(jsonData));
    }

    @Subscribe
    public void onCommandTriggeredEvent(CommandTriggeredEvent receivedEvent){
        AugmentOSCommand command = receivedEvent.command;
        // String args = receivedEvent.args;
        // long commandTriggeredTime = receivedEvent.commandTriggeredTime;
        Log.d(TAG, " " + command.getId());
        Log.d(TAG, " " + command.getDescription());
        receivedEvent.command.callback.runCommand(receivedEvent.args, receivedEvent.commandTriggeredTime);
//        //call the callback
//        AugmentOSCallback callback = augmentosCallbackMapper.getCommandCallback(command);
//        if (callback != null){
//            callback.runCommand(args, commandTriggeredTime);
//        }
        Log.d(TAG, "Callback called");
    }

    @Subscribe
    public void onTranscript(SpeechRecOutputEvent event) {
        String text = event.text;
        String languageCode = event.languageCode;
        long time = event.timestamp;
//        ((TranscriptCallback)subscribedDataStreams.get(subscribedDataStreams.get)).call(text, languageCode, time, event.isFinal);
        if (subscribedDataStreams.containsKey(DataStreamType.TRANSCRIPTION_ENGLISH_STREAM) && (languageCode.equals("en-US"))) {
            ((TranscriptCallback)subscribedDataStreams.get(DataStreamType.TRANSCRIPTION_ENGLISH_STREAM)).call(text, languageCode, time, event.isFinal);
        }
        if (subscribedDataStreams.containsKey(DataStreamType.TRANSCRIPTION_CHINESE_STREAM) && (languageCode.equals("zh"))) {
            ((TranscriptCallback)subscribedDataStreams.get(DataStreamType.TRANSCRIPTION_CHINESE_STREAM)).call(text, languageCode, time, event.isFinal);
        }
    }

    @Subscribe
    public void onTranslateTranscript(TranslateOutputEvent event) {
        String text = event.text;
        String languageCode = event.languageCode;
        long time = event.timestamp;

        if (subscribedDataStreams.containsKey(DataStreamType.TRANSLATION_ENGLISH_STREAM) && (languageCode.equals("zh"))) {
            ((TranslateCallback)subscribedDataStreams.get(DataStreamType.TRANSLATION_ENGLISH_STREAM)).call(text, languageCode, time, event.isFinal, true);
        }
    }

    @Subscribe
    public void onSmartRingButtonEvent(SmartRingButtonOutputEvent event) {
        int buttonId = event.buttonId;
        long time = event.timestamp;
        if (subscribedDataStreams.containsKey(DataStreamType.SMART_RING_BUTTON)) {
            ((ButtonCallback)subscribedDataStreams.get(DataStreamType.SMART_RING_BUTTON)).call(buttonId, time, event.isDown);
        }
    }

    @Subscribe
    public void onGlassesTapSideEvent(GlassesTapOutputEvent event) {
        int numTaps = event.numTaps;
        boolean sideOfGlasses = event.sideOfGlasses;
        long time = event.timestamp;
        if (subscribedDataStreams.containsKey(DataStreamType.GLASSES_SIDE_TAP)) {
            ((TapCallback)subscribedDataStreams.get(DataStreamType.GLASSES_SIDE_TAP)).call(numTaps, sideOfGlasses, time);
        }
    }

    @Subscribe
    public void onFocusChange(FocusChangedEvent event) {
        if (focusCallback != null){
            focusCallback.runFocusChange(event.focusState);
        }
    }

    @Subscribe
    public void onCoreToManagerEvent(CoreToManagerOutputEvent event) {
        if (subscribedDataStreams.containsKey(DataStreamType.CORE_SYSTEM_MESSAGE)) {
            ((CoreToManagerCallback)subscribedDataStreams.get(DataStreamType.CORE_SYSTEM_MESSAGE)).call(event.jsonData);
        }
    }


    @Subscribe
    public void onGlassesPovImageEvent(GlassesPovImageEvent event) {
        if (subscribedDataStreams.containsKey(DataStreamType.GLASSES_POV_IMAGE)) {
            ((GlassesPovImageCallback)subscribedDataStreams.get(DataStreamType.GLASSES_POV_IMAGE)).call(event.encodedImgString);
        }
    }

    public void deinit(){
        EventBus.getDefault().unregister(this);
        if (augmentosReceiver != null) {
            augmentosReceiver.destroy();
        }
        if (augmentosSender != null) {
            augmentosSender.destroy();
        }
    }

    public static String initLanguageLocale(String localeString) {
        switch (localeString) {
            case "Afrikaans (South Africa)":
                return "af-ZA";
            case "Amharic (Ethiopia)":
                return "am-ET";
            case "Arabic (United Arab Emirates)":
                return "ar-AE";
            case "Arabic (Bahrain)":
                return "ar-BH";
            case "Arabic (Algeria)":
                return "ar-DZ";
            case "Arabic (Egypt)":
                return "ar-EG";
            case "Arabic (Israel)":
                return "ar-IL";
            case "Arabic (Iraq)":
                return "ar-IQ";
            case "Arabic (Jordan)":
                return "ar-JO";
            case "Arabic (Kuwait)":
                return "ar-KW";
            case "Arabic (Lebanon)":
                return "ar-LB";
            case "Arabic (Libya)":
                return "ar-LY";
            case "Arabic (Morocco)":
                return "ar-MA";
            case "Arabic (Oman)":
                return "ar-OM";
            case "Arabic (Palestinian Authority)":
                return "ar-PS";
            case "Arabic (Qatar)":
                return "ar-QA";
            case "Arabic (Saudi Arabia)":
                return "ar-SA";
            case "Arabic (Syria)":
                return "ar-SY";
            case "Arabic (Tunisia)":
                return "ar-TN";
            case "Arabic (Yemen)":
                return "ar-YE";
            case "Azerbaijani (Latin, Azerbaijan)":
                return "az-AZ";
            case "Bulgarian (Bulgaria)":
                return "bg-BG";
            case "Bengali (India)":
                return "bn-IN";
            case "Bosnian (Bosnia and Herzegovina)":
                return "bs-BA";
            case "Catalan":
                return "ca-ES";
            case "Czech (Czechia)":
                return "cs-CZ";
            case "Welsh (United Kingdom)":
                return "cy-GB";
            case "Danish (Denmark)":
                return "da-DK";
            case "German (Austria)":
                return "de-AT";
            case "German (Switzerland)":
                return "de-CH";
            case "German":
            case "German (Germany)":
                return "de-DE";
            case "Greek (Greece)":
                return "el-GR";
            case "English (Australia)":
                return "en-AU";
            case "English (Canada)":
                return "en-CA";
            case "English (United Kingdom)":
                return "en-GB";
            case "English (Ghana)":
                return "en-GH";
            case "English (Hong Kong SAR)":
                return "en-HK";
            case "English (Ireland)":
                return "en-IE";
            case "English (India)":
                return "en-IN";
            case "English (Kenya)":
                return "en-KE";
            case "English (Nigeria)":
                return "en-NG";
            case "English (New Zealand)":
                return "en-NZ";
            case "English (Philippines)":
                return "en-PH";
            case "English (Singapore)":
                return "en-SG";
            case "English (Tanzania)":
                return "en-TZ";
            case "English":
            case "English (United States)":
                return "en-US";
            case "English (South Africa)":
                return "en-ZA";
            case "Spanish (Argentina)":
                return "es-AR";
            case "Spanish (Bolivia)":
                return "es-BO";
            case "Spanish (Chile)":
                return "es-CL";
            case "Spanish (Colombia)":
                return "es-CO";
            case "Spanish (Costa Rica)":
                return "es-CR";
            case "Spanish (Cuba)":
                return "es-CU";
            case "Spanish (Dominican Republic)":
                return "es-DO";
            case "Spanish (Ecuador)":
                return "es-EC";
            case "Spanish (Spain)":
                return "es-ES";
            case "Spanish (Equatorial Guinea)":
                return "es-GQ";
            case "Spanish (Guatemala)":
                return "es-GT";
            case "Spanish (Honduras)":
                return "es-HN";
            case "Spanish":
            case "Spanish (Mexico)":
                return "es-MX";
            case "Spanish (Nicaragua)":
                return "es-NI";
            case "Spanish (Panama)":
                return "es-PA";
            case "Spanish (Peru)":
                return "es-PE";
            case "Spanish (Puerto Rico)":
                return "es-PR";
            case "Spanish (Paraguay)":
                return "es-PY";
            case "Spanish (El Salvador)":
                return "es-SV";
            case "Spanish (United States)":
                return "es-US";
            case "Spanish (Uruguay)":
                return "es-UY";
            case "Spanish (Venezuela)":
                return "es-VE";
            case "Estonian (Estonia)":
                return "et-EE";
            case "Basque":
                return "eu-ES";
            case "Persian (Iran)":
                return "fa-IR";
            case "Finnish (Finland)":
                return "fi-FI";
            case "Filipino (Philippines)":
                return "fil-PH";
            case "French (Belgium)":
                return "fr-BE";
            case "French (Canada)":
                return "fr-CA";
            case "French (Switzerland)":
                return "fr-CH";
            case "French":
            case "French (France)":
                return "fr-FR";
            case "Irish (Ireland)":
                return "ga-IE";
            case "Galician":
                return "gl-ES";
            case "Gujarati (India)":
                return "gu-IN";
            case "Hebrew":
            case "Hebrew (Israel)":
                return "he-IL";
            case "Hindi (India)":
                return "hi-IN";
            case "Croatian (Croatia)":
                return "hr-HR";
            case "Hungarian (Hungary)":
                return "hu-HU";
            case "Armenian (Armenia)":
                return "hy-AM";
            case "Indonesian (Indonesia)":
                return "id-ID";
            case "Icelandic (Iceland)":
                return "is-IS";
            case "Italian (Switzerland)":
                return "it-CH";
            case "Italian":
            case "Italian (Italy)":
                return "it-IT";
            case "Japanese":
            case "Japanese (Japan)":
                return "ja-JP";
            case "Javanese (Latin, Indonesia)":
                return "jv-ID";
            case "Georgian (Georgia)":
                return "ka-GE";
            case "Kazakh (Kazakhstan)":
                return "kk-KZ";
            case "Khmer (Cambodia)":
                return "km-KH";
            case "Kannada (India)":
                return "kn-IN";
            case "Korean":
            case "Korean (Korea)":
                return "ko-KR";
            case "Lao (Laos)":
                return "lo-LA";
            case "Lithuanian (Lithuania)":
                return "lt-LT";
            case "Latvian (Latvia)":
                return "lv-LV";
            case "Macedonian (North Macedonia)":
                return "mk-MK";
            case "Malayalam (India)":
                return "ml-IN";
            case "Mongolian (Mongolia)":
                return "mn-MN";
            case "Marathi (India)":
                return "mr-IN";
            case "Malay (Malaysia)":
                return "ms-MY";
            case "Maltese (Malta)":
                return "mt-MT";
            case "Burmese (Myanmar)":
                return "my-MM";
            case "Norwegian Bokmål (Norway)":
                return "nb-NO";
            case "Nepali (Nepal)":
                return "ne-NP";
            case "Dutch":
            case "Dutch (Belgium)":
                return "nl-BE";
            case "Dutch (Netherlands)":
                return "nl-NL";
            case "Punjabi (India)":
                return "pa-IN";
            case "Polish (Poland)":
                return "pl-PL";
            case "Pashto (Afghanistan)":
                return "ps-AF";
            case "Portuguese":
            case "Portuguese (Brazil)":
                return "pt-BR";
            case "Portuguese (Portugal)":
                return "pt-PT";
            case "Romanian (Romania)":
                return "ro-RO";
            case "Russian":
            case "Russian (Russia)":
                return "ru-RU";
            case "Sinhala (Sri Lanka)":
                return "si-LK";
            case "Slovak (Slovakia)":
                return "sk-SK";
            case "Slovenian (Slovenia)":
                return "sl-SI";
            case "Somali (Somalia)":
                return "so-SO";
            case "Albanian (Albania)":
                return "sq-AL";
            case "Serbian (Cyrillic, Serbia)":
                return "sr-RS";
            case "Swedish (Sweden)":
                return "sv-SE";
            case "Swahili (Kenya)":
                return "sw-KE";
            case "Swahili (Tanzania)":
                return "sw-TZ";
            case "Tamil (India)":
                return "ta-IN";
            case "Telugu (India)":
                return "te-IN";
            case "Thai (Thailand)":
                return "th-TH";
            case "Turkish":
            case "Turkish (Türkiye)":
                return "tr-TR";
            case "Ukrainian (Ukraine)":
                return "uk-UA";
            case "Urdu (India)":
                return "ur-IN";
            case "Uzbek (Latin, Uzbekistan)":
                return "uz-UZ";
            case "Vietnamese (Vietnam)":
                return "vi-VN";
            case "Chinese (Wu, Simplified)":
                return "wuu-CN";
            case "Chinese (Cantonese, Simplified)":
                return "yue-CN";
            case "Chinese":
            case "Chinese (Pinyin)":
            case "Chinese (Hanzi)":
            case "Chinese (Mandarin, Simplified)":
                return "zh-CN";
            case "Chinese (Jilu Mandarin, Simplified)":
                return "zh-CN-shandong";
            case "Chinese (Southwestern Mandarin, Simplified)":
                return "zh-CN-sichuan";
            case "Chinese (Cantonese, Traditional)":
                return "zh-HK";
            case "Chinese (Taiwanese Mandarin, Traditional)":
                return "zh-TW";
            case "Zulu (South Africa)":
                return "zu-ZA";
            default:
                return "en-US";
        }
    }
}
