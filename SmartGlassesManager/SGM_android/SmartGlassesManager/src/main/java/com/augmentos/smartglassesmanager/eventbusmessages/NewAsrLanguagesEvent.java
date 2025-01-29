package com.augmentos.smartglassesmanager.eventbusmessages;

import com.augmentos.smartglassesmanager.speechrecognition.AsrStreamKey;

import java.util.List;

public class NewAsrLanguagesEvent {
    public List<AsrStreamKey> languages;

    public NewAsrLanguagesEvent(List<AsrStreamKey> languages){
        this.languages = languages;
    }
}
