package com.augmentos.augmentoslib;

import static com.augmentos.augmentoslib.AugmentOSGlobalConstants.AugmentOSManagerPackageName;

import android.content.Context;
import android.graphics.Bitmap;
import android.util.Log;

import com.augmentos.augmentoslib.events.BulletPointListViewRequestEvent;
import com.augmentos.augmentoslib.events.CenteredTextViewRequestEvent;
import com.augmentos.augmentoslib.events.CommandTriggeredEvent;
import com.augmentos.augmentoslib.events.CoreToManagerOutputEvent;
import com.augmentos.augmentoslib.events.DisplayCustomContentRequestEvent;
import com.augmentos.augmentoslib.events.DoubleTextWallViewRequestEvent;
import com.augmentos.augmentoslib.events.FinalScrollingTextRequestEvent;
import com.augmentos.augmentoslib.events.FocusChangedEvent;
import com.augmentos.augmentoslib.events.GlassesPovImageEvent;
import com.augmentos.augmentoslib.events.GlassesTapOutputEvent;
import com.augmentos.augmentoslib.events.HomeScreenEvent;
import com.augmentos.augmentoslib.events.ManagerToCoreRequestEvent;
import com.augmentos.augmentoslib.events.ReferenceCardImageViewRequestEvent;
import com.augmentos.augmentoslib.events.ReferenceCardSimpleViewRequestEvent;
import com.augmentos.augmentoslib.events.RegisterCommandRequestEvent;
import com.augmentos.augmentoslib.events.RowsCardViewRequestEvent;
import com.augmentos.augmentoslib.events.ScrollingTextViewStartRequestEvent;
import com.augmentos.augmentoslib.events.ScrollingTextViewStopRequestEvent;
import com.augmentos.augmentoslib.events.SendBitmapViewRequestEvent;
import com.augmentos.augmentoslib.events.SmartRingButtonOutputEvent;
import com.augmentos.augmentoslib.events.SpeechRecOutputEvent;
import com.augmentos.augmentoslib.events.StartAsrStreamRequestEvent;
import com.augmentos.augmentoslib.events.StopAsrStreamRequestEvent;
import com.augmentos.augmentoslib.events.SubscribeDataStreamRequestEvent;
import com.augmentos.augmentoslib.events.TextLineViewRequestEvent;
import com.augmentos.augmentoslib.events.TextWallViewRequestEvent;
import com.augmentos.augmentoslib.events.TranslateOutputEvent;

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

    public void requestTranscription(String language){
        String languageLocale = SpeechRecUtils.languageToLocale(language);
        subscribe(new StartAsrStreamRequestEvent(languageLocale));
    }

    public void requestTranslation(String fromLanguage, String toLanguage){
        String fromLanguageLocale = SpeechRecUtils.languageToLocale(fromLanguage);
        String toLanguageLocale = SpeechRecUtils.languageToLocale(toLanguage);
        subscribe(new StartAsrStreamRequestEvent(fromLanguageLocale, toLanguageLocale));
    }

    public void stopTranscription(String language){
        subscribe(new StopAsrStreamRequestEvent(language));
    }

    public void stopTranslation(String fromLanguage, String toLanguage){
        subscribe(new StopAsrStreamRequestEvent(fromLanguage, toLanguage));
    }

    public void subscribe(StartAsrStreamRequestEvent startAsrStreamRequestEvent) {
        EventBus.getDefault().post((StartAsrStreamRequestEvent) startAsrStreamRequestEvent);
    }

    public void subscribe(StopAsrStreamRequestEvent stopAsrStreamRequestEvent) {
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

    }

    @Subscribe
    public void onTranslateTranscript(TranslateOutputEvent event) {
        String text = event.text;
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
}
