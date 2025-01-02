package com.teamopensmartglasses.smartglassesmanager.smartglassescommunicators;

import android.content.Context;
import android.graphics.Bitmap;
import android.util.Log;

import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.FoundGlassesBluetoothDeviceEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.TextToSpeechEvent;
import com.teamopensmartglasses.smartglassesmanager.supportedglasses.SmartGlassesDevice;

import java.util.ArrayList;
import java.util.List;

import org.greenrobot.eventbus.EventBus;

public class AudioWearableSGC extends SmartGlassesCommunicator {
    private static final String TAG = "WearableAi_AndroidWearableSGC";

    private static boolean killme;

    Context context;
    SmartGlassesDevice smartGlassesDevice;

    public AudioWearableSGC(Context context, SmartGlassesDevice smartGlassesDevice){
        super();

        //state information
        killme = false;
        mConnectState = 0;
        this.smartGlassesDevice = smartGlassesDevice;
    }

    public void setFontSizes(){
    }

    public void connectToSmartGlasses(){
        connectionEvent(2);
    }

    public void blankScreen(){
    }

    public void displayRowsCard(String[] rowStrings){

    }

    public void destroy(){
        killme = true;
    }

    public void displayReferenceCardSimple(String title, String body, int lingerTimeMs){
        Log.d(TAG, "TTS reference card");
        EventBus.getDefault().post(new TextToSpeechEvent(title + ", " + body, "english"));
    }

    public void displayReferenceCardImage(String title, String body, String imgUrl){
        Log.d(TAG, "TTS reference card");
        EventBus.getDefault().post(new TextToSpeechEvent(title + ", " + body, "english"));
    }

    public void displayBulletList(String title, String [] bullets){
        displayBulletList(title, bullets, 0);
    }

    public void displayBulletList(String title, String [] bullets, int lingerTime){

    }

    public void displayTextWall(String text){}
    public void displayDoubleTextWall(String textTop, String textBottom){}

    public void stopScrollingTextViewMode() {
    }

    public void startScrollingTextViewMode(String title){
    }

    public void scrollingTextViewIntermediateText(String text){
    }

    public void scrollingTextViewFinalText(String text){
    }

    public void showHomeScreen(){
    }

    public void displayPromptView(String prompt, String [] options){
    }

    public void displayTextLine(String text){
        Log.d(TAG, "displayTextLine: " + text);
        EventBus.getDefault().post(new TextToSpeechEvent(text, "english"));
    }

    @Override
    public void displayBitmap(Bitmap bmp) {

    }

    public void displayCenteredText(String text){
        //TODO: Find a way to add (optional) pauses between lines?
        displayTextLine(text);
    }

    @Override
    public void displayCustomContent(String json) {
        displayTextLine(json);
    }

    @Override
    public void findCompatibleDeviceNames() {
        EventBus.getDefault().post(new FoundGlassesBluetoothDeviceEvent(smartGlassesDevice.deviceModelName, "NOTREQUIREDSKIP"));
    }

    public void showNaturalLanguageCommandScreen(String prompt, String naturalLanguageArgs){
    }

    public void updateNaturalLanguageCommandScreen(String naturalLanguageArgs){
    }

    public void setFontSize(SmartGlassesFontSize fontSize){}
}