package com.teamopensmartglasses.smartglassesmanager.smartglassescommunicators;

import android.graphics.Bitmap;

import com.teamopensmartglasses.augmentoslib.events.GlassesTapOutputEvent;
import com.teamopensmartglasses.smartglassesmanager.eventbusmessages.SmartGlassesConnectionEvent;

import org.greenrobot.eventbus.EventBus;

public abstract class SmartGlassesCommunicator {
    //basic glasses utils/settings
    public int mConnectState = 0;
    protected SmartGlassesModes currentMode;
    public abstract void connectToSmartGlasses();
    public abstract void blankScreen();
    public abstract void destroy();
    public final String commandNaturalLanguageString = "Command: ";
    public final String finishNaturalLanguageString = "'finish command' when done";

    //reference card
    public abstract void displayReferenceCardSimple(String title, String body);

    //display text wall
    public abstract void displayTextWall(String text);
    public abstract void displayDoubleTextWall(String textTop, String textBottom);

    public abstract void displayReferenceCardImage(String title, String body, String imgUrl);
    public abstract void displayBulletList(String title, String [] bullets);
    public abstract void displayRowsCard(String[] rowStrings);

    //voice command UI
    public abstract void showNaturalLanguageCommandScreen(String prompt, String naturalLanguageArgs);
    public abstract void updateNaturalLanguageCommandScreen(String naturalLanguageArgs);

    //scrolling text view
    public void startScrollingTextViewMode(String title){
        setMode(SmartGlassesModes.SCROLLING_TEXT_VIEW);
    }

    public abstract void scrollingTextViewIntermediateText(String text);
    public abstract void scrollingTextViewFinalText(String text);
    public abstract void stopScrollingTextViewMode();

    //prompt view card
    public abstract void displayPromptView(String title, String [] options);

    //display text line
    public abstract void displayTextLine(String text);

    public abstract void displayBitmap(Bitmap bmp);

    //display centered text
    public abstract void displayCenteredText(String text);

    public abstract void displayCustomContent(String json);

    //home screen
    public abstract void showHomeScreen();

    public abstract void setFontSize(SmartGlassesFontSize fontSize);

    //fonts
    public int LARGE_FONT;
    public int MEDIUM_FONT;
    public int SMALL_FONT;

    public SmartGlassesCommunicator(){
        setFontSizes();
    }

    //must be run and set font sizes
    protected abstract void setFontSizes();

    public int getConnectionState(){
        return mConnectState;
    }

    protected boolean isConnected(){
        return (mConnectState == 2);
    }

    public void connectionEvent(int connectState){
        mConnectState = connectState;
        EventBus.getDefault().post(new SmartGlassesConnectionEvent(mConnectState));
        if (isConnected()) {
            showHomeScreen();
        }
    }

    public void tapEvent(int num){
        EventBus.getDefault().post(new GlassesTapOutputEvent(num, false, System.currentTimeMillis()));
    }

    public void setMode(SmartGlassesModes mode){
        currentMode = mode;
    }
}
