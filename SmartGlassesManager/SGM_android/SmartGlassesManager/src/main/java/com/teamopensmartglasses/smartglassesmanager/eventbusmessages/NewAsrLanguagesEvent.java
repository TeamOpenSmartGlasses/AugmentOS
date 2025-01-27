package com.teamopensmartglasses.smartglassesmanager.eventbusmessages;

import com.teamopensmartglasses.smartglassesmanager.speechrecognition.AsrStreamKey;

import java.util.List;

public class NewAsrLanguagesEvent {
    public List<AsrStreamKey> languages;

    public NewAsrLanguagesEvent(List<AsrStreamKey> languages){
        this.languages = languages;
    }
}
