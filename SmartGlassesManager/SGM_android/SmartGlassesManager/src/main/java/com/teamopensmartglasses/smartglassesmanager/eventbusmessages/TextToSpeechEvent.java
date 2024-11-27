package com.teamopensmartglasses.smartglassesmanager.eventbusmessages;

public class TextToSpeechEvent {
    public String text;
    public String language; //the name of the language, fully spelled out, ll lowercase

    public TextToSpeechEvent(String text, String language){
        this.text = text;
        this.language = language;
    }
}
