package com.teamopensmartglasses.smartglassesmanager;

import android.content.Context;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import org.json.JSONObject;

import android.os.Handler;
import android.util.Log;

//custom, our code
import androidx.lifecycle.LifecycleOwner;

import com.teamopensmartglasses.augmentoslib.events.AudioChunkNewEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.DisableBleScoAudioEvent;
import com.teamopensmartglasses.augmentoslib.events.DisplayCustomContentRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.DoubleTextWallViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.HomeScreenEvent;
import com.teamopensmartglasses.augmentoslib.events.SendBitmapViewRequestEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.SetFontSizeEvent;
import com.teamopensmartglasses.augmentoslib.events.TextWallViewRequestEvent;
import com.teamopensmartglasses.smartglassesmanager.smartglassescommunicators.AudioWearableSGC;
import com.teamopensmartglasses.smartglassesmanager.smartglassescommunicators.EvenRealitiesG1SGC;
import com.teamopensmartglasses.smartglassesmanager.smartglassescommunicators.UltraliteSGC;
import com.teamopensmartglasses.augmentoslib.events.BulletPointListViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.CenteredTextViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.FinalScrollingTextRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.IntermediateScrollingTextRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ReferenceCardImageViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ReferenceCardSimpleViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.RowsCardViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.PromptViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ScrollingTextViewStartRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ScrollingTextViewStopRequestEvent;
import com.teamopensmartglasses.smartglassesmanager.hci.AudioChunkCallback;
import com.teamopensmartglasses.smartglassesmanager.hci.MicrophoneLocalAndBluetooth;
//import com.teamopensmartglasses.smartglassesmanager.smartglassescommunicators.ActiveLookSGC;
import com.teamopensmartglasses.smartglassesmanager.smartglassescommunicators.AndroidSGC;
import com.teamopensmartglasses.smartglassesmanager.smartglassescommunicators.SmartGlassesCommunicator;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.SmartGlassesDevice;
import com.teamopensmartglasses.augmentoslib.events.TextLineViewRequestEvent;

//rxjava
import java.nio.ByteBuffer;

import io.reactivex.rxjava3.subjects.PublishSubject;

class SmartGlassesRepresentative {
    private static final String TAG = "WearableAi_ASGRepresentative";

    //receive/send data stream
    PublishSubject<JSONObject> dataObservable;

    Context context;

    public SmartGlassesDevice smartGlassesDevice;
    SmartGlassesCommunicator smartGlassesCommunicator;
    MicrophoneLocalAndBluetooth bluetoothAudio;

    //timing settings
    long referenceCardDelayTime = 10000;

    LifecycleOwner lifecycleOwner;

    //handler to handle delayed UI events
    Handler uiHandler;
    Handler micHandler;

    SmartGlassesRepresentative(Context context, SmartGlassesDevice smartGlassesDevice, LifecycleOwner lifecycleOwner, PublishSubject<JSONObject> dataObservable){
        this.context = context;
        this.smartGlassesDevice = smartGlassesDevice;
        this.lifecycleOwner = lifecycleOwner;

        //receive/send data
        this.dataObservable = dataObservable;

        uiHandler = new Handler();
        micHandler = new Handler();

        //register event bus subscribers
        EventBus.getDefault().register(this);
    }

    public void connectToSmartGlasses(){
        switch (smartGlassesDevice.getGlassesOs()){
            case ANDROID_OS_GLASSES:
                smartGlassesCommunicator = new AndroidSGC(context, dataObservable);
                break;
//            case ACTIVELOOK_OS_GLASSES:
//                smartGlassesCommunicator = new ActiveLookSGC(context);
//                break;
            case AUDIO_WEARABLE_GLASSES:
                smartGlassesCommunicator = new AudioWearableSGC(context);
                break;
            case ULTRALITE_MCU_OS_GLASSES:
                smartGlassesCommunicator = new UltraliteSGC(context, lifecycleOwner);
                break;
            case EVEN_REALITIES_G1_MCU_OS_GLASSES:
                smartGlassesCommunicator = new EvenRealitiesG1SGC(context);
                break;
        }

        smartGlassesCommunicator.connectToSmartGlasses();

        //if the glasses don't support a microphone, this Representative handles local microphone
        if (smartGlassesDevice.useScoMic) {
            connectAndStreamLocalMicrophone(true);
        } else if (!smartGlassesDevice.getHasInMic() && !smartGlassesDevice.getHasOutMic()) {
            connectAndStreamLocalMicrophone(false);
        }
    }


    @Subscribe
    public void onDisableBleScoEvent(DisableBleScoAudioEvent receivedEvent) {
        Log.d(TAG, "onDisableBleScoEvent called");
        restartAudioWithNoBleSco();
    }

    public void restartAudioWithNoBleSco(){
        //kill current audio
        if (bluetoothAudio != null) {
            bluetoothAudio.destroy();
        }

        //start new audio, with no bluetooth
        connectAndStreamLocalMicrophone(false);
    }

    private void connectAndStreamLocalMicrophone(boolean useBluetoothSco){
        //follow this order for speed
        //start audio from bluetooth headset
        uiHandler.post(new Runnable() {
            @Override
            public void run() {
                bluetoothAudio = new MicrophoneLocalAndBluetooth(context, useBluetoothSco, new AudioChunkCallback(){
                    @Override
                    public void onSuccess(ByteBuffer chunk){
                        receiveChunk(chunk);
                    }
                });
            }
        });
    }

    private void receiveChunk(ByteBuffer chunk){
        byte[] audio_bytes = chunk.array();
        //throw off new audio chunk event
        EventBus.getDefault().post(new AudioChunkNewEvent(audio_bytes));
    }

    public void destroy(){
        Log.d(TAG, "SG rep destroying");

        EventBus.getDefault().unregister(this);

        if (bluetoothAudio != null) {
            bluetoothAudio.destroy();
        }

        if (smartGlassesCommunicator != null){
            smartGlassesCommunicator.destroy();
            smartGlassesCommunicator = null;
        }

        Log.d(TAG, "SG rep destroy complete");
    }

    //are our smart glasses currently connected?
    public int getConnectionState(){
        if (smartGlassesCommunicator == null){
            return 0;
        } else {
            return smartGlassesCommunicator.getConnectionState();
        }
    }

    public void showReferenceCard(String title, String body){
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.displayReferenceCardSimple(title, body, -1);
        }
    }

    public void showRowsCard(String[] rowStrings){
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.displayRowsCard(rowStrings);
        }
    }

    public void startScrollingTextViewModeTest(){
        //pass for now
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.startScrollingTextViewMode("ScrollingTextView");
            smartGlassesCommunicator.scrollingTextViewFinalText("test line 1");
            smartGlassesCommunicator.scrollingTextViewFinalText("line 2 testy boi");
            smartGlassesCommunicator.scrollingTextViewFinalText("how's this?");
            smartGlassesCommunicator.scrollingTextViewFinalText("this is a line of text that is going to be long enough to wrap around, it would be good to see if it doesn so, that would be super cool");
            smartGlassesCommunicator.scrollingTextViewFinalText("test line n");
            smartGlassesCommunicator.scrollingTextViewFinalText("line n + 1 testy boi");
            smartGlassesCommunicator.scrollingTextViewFinalText("seconnndd how's this?");
        }
    }

    private void homeUiAfterDelay(long delayTime){
        uiHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                homeScreen();
            }
        }, delayTime);
    }

    public void homeScreen(){
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.showHomeScreen();
        }
    }

    @Subscribe
    public void onHomeScreenEvent(HomeScreenEvent receivedEvent){
        homeScreen();
    }

    @Subscribe
    public void onTextWallViewEvent(TextWallViewRequestEvent receivedEvent){
        if (smartGlassesCommunicator != null) {
            Log.d(TAG, "SINGLE TEXT WALL BOOM");
            smartGlassesCommunicator.displayTextWall(receivedEvent.text);
        }
    }

    @Subscribe
    public void onDoubleTextWallViewEvent(DoubleTextWallViewRequestEvent receivedEvent){
        if (smartGlassesCommunicator != null) {
            Log.d(TAG, "DOUBLE TEXT WALL BOOM");
            smartGlassesCommunicator.displayDoubleTextWall(receivedEvent.textTop, receivedEvent.textBottom);
        }
    }

    @Subscribe
    public void onReferenceCardSimpleViewEvent(ReferenceCardSimpleViewRequestEvent receivedEvent){
        Log.d(TAG, "SHOWING REFERENCE CARD");
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.displayReferenceCardSimple(receivedEvent.title, receivedEvent.body, receivedEvent.lingerTimeMs);
//            homeUiAfterDelay(referenceCardDelayTime);
        }
    }


    @Subscribe
    public void onRowsCardViewEvent(RowsCardViewRequestEvent receivedEvent){
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.displayRowsCard(receivedEvent.rowStrings);
//            homeUiAfterDelay(referenceCardDelayTime);
        }
    }

    @Subscribe
    public void onBulletPointListViewEvent(BulletPointListViewRequestEvent receivedEvent){
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.displayBulletList(receivedEvent.title, receivedEvent.bullets);
//            homeUiAfterDelay(referenceCardDelayTime);
        }
    }

    @Subscribe
    public void onReferenceCardImageViewEvent(ReferenceCardImageViewRequestEvent receivedEvent){
        Log.d(TAG, "sending reference card image view event");
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.displayReferenceCardImage(receivedEvent.title, receivedEvent.body, receivedEvent.imgUrl);
//            homeUiAfterDelay(referenceCardDelayTime);
        }
    }

    @Subscribe
    public void onSendBitmapViewRequestEvent(SendBitmapViewRequestEvent receievedEvent){
        Log.d(TAG, "Sending a bitmap event");
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.displayBitmap(receievedEvent.bmp);
        }
    }

    @Subscribe
    public void onDisplayCustomContentRequestEvent(DisplayCustomContentRequestEvent receivedEvent){
        Log.d(TAG, "Got display custom content event: " + receivedEvent.json);
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.displayCustomContent(receivedEvent.json);
        }
    }

    @Subscribe
    public void onTextLineViewRequestEvent(TextLineViewRequestEvent receivedEvent){
        Log.d(TAG, "Got text line event: " + receivedEvent.text);
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.displayTextLine(receivedEvent.text);
        }
    }

    @Subscribe
    public void onDisplayCenteredTextRequestEvent(CenteredTextViewRequestEvent receivedEvent){
        if(smartGlassesCommunicator != null){
            smartGlassesCommunicator.displayCenteredText(receivedEvent.text);
        }
    }

    @Subscribe
    public void onStartScrollingTextViewEvent(ScrollingTextViewStartRequestEvent receivedEvent){
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.startScrollingTextViewMode(receivedEvent.title);
        }
    }

    @Subscribe
    public void onStopScrollingTextViewEvent(ScrollingTextViewStopRequestEvent receivedEvent){
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.stopScrollingTextViewMode();
        }
    }

    @Subscribe
    public void onFinalScrollingTextEvent(FinalScrollingTextRequestEvent receivedEvent) {
        Log.d(TAG, "onFinalScrollingTextEvent");
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.scrollingTextViewFinalText(receivedEvent.text);
        }
    }

    @Subscribe
    public void onIntermediateScrollingTextEvent(IntermediateScrollingTextRequestEvent receivedEvent) {
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.scrollingTextViewIntermediateText(receivedEvent.text);
        }
    }

    @Subscribe
    public void onPromptViewRequestEvent(PromptViewRequestEvent receivedEvent) {
        Log.d(TAG, "onPromptViewRequestEvent called");
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.displayPromptView(receivedEvent.prompt, receivedEvent.options);
        }
    }

    @Subscribe
    public void onSetFontSizeEvent(SetFontSizeEvent receivedEvent) {
        if (smartGlassesCommunicator != null) {
            smartGlassesCommunicator.setFontSize(receivedEvent.fontSize);
        }
    }

}
