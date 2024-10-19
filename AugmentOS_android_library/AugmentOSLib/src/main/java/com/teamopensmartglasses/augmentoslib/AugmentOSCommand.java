package com.teamopensmartglasses.augmentoslib;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.UUID;

public class AugmentOSCommand implements Serializable {
    private  final String TAG = "AugmentOSLib_AugmentOSCommand";

    private String mName; //name of the command
    private UUID mId; //unique identifier of the command
    private ArrayList<String> mPhrases; //list of phrases, queries, questions that trigger this command (artificial limit imposed)
    private String mDescription; //a natural language description of what the command does

    //args info
    public boolean argRequired;
    public String argPrompt;
    public ArrayList argOptions;

    public String packageName; //the name of the package that made and owns this command
    public String serviceName;

    public AugmentOSCommand(String name, UUID id, String[] phrases, String description){
        argRequired = false;
        setupBaseCommand(name, id, phrases, description);
    }

    public AugmentOSCommand(String name, UUID id, String[] phrases, String description, boolean argRequired, String argPrompt, ArrayList argOptions){
        setupBaseCommand(name, id, phrases, description);
        this.argRequired = argRequired;
        this.argPrompt = argPrompt;
        this.argOptions = argOptions;
    }

    private void setupBaseCommand(String name, UUID id, String[] phrases, String description){
        this.mName = name;
        this.mId = id;
        this.mPhrases = new ArrayList<>();
        this.mPhrases.addAll(Arrays.asList(phrases));
        this.mDescription = description;
    }

    public UUID getId(){
        return this.mId;
    }

    public String getDescription() {
        return mDescription;
    }

    public String getName() {
        return mName;
    }

    public ArrayList<String> getPhrases() {
        return mPhrases;
    }

    public String getPackageName(){
        return packageName;
    }

    public String getServiceName(){
        return serviceName;
    }
}

