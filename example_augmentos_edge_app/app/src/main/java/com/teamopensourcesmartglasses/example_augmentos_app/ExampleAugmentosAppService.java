package com.teamopensourcesmartglasses.example_augmentos_app;

import android.util.Log;

import com.teamopensmartglasses.augmentoslib.AugmentOSCommand;
import com.teamopensmartglasses.augmentoslib.SmartGlassesAndroidService;
import com.teamopensmartglasses.augmentoslib.DataStreamType;
import com.teamopensmartglasses.augmentoslib.FocusStates;
import com.teamopensmartglasses.augmentoslib.AugmentOSLib;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import java.util.UUID;

public class ExampleAugmentosAppService extends SmartGlassesAndroidService {
    public final String TAG = "ExampleAugmentOSApp_ExampleService";
    static final String appName = "ExampleAugmentOSApp";

    //our instance of the AugmentOS library
    public AugmentOSLib augmentOSLib;

    public ExampleAugmentosAppService() {
        super();
    }

    @Override
    public void onCreate() {
        super.onCreate();

        // Create AugmentOSLib instance with context: this
        augmentOSLib = new AugmentOSLib(this);

        // Define command
//        UUID exampleAppCommandUUID = UUID.fromString("aef7e07f-5c36-42f2-a808-21074b32bb28");
//        String[] phrases = new String[]{"Fact Checker", "Fact check"};
//        String description = "Fact check your conversation with ChatGPT!";
//        AugmentOSCommand startExampleAugmentosAppCommand = new AugmentOSCommand(this::someExampleCallback, appName, exampleAppCommandUUID, phrases, description);

        augmentOSLib.registerApp("Example App", "Example app description");

        //Subscribe to transcription stream
        augmentOSLib.subscribe(DataStreamType.TRANSCRIPTION_ENGLISH_STREAM, this::processTranscriptionCallback);

        /* Handle ExampleAugmentosApp specific things */

        EventBus.getDefault().register(this);
    }


    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy: Called");
        EventBus.getDefault().unregister(this);
        augmentOSLib.deinit();
        super.onDestroy();
    }

    public void someExampleCallback(String args, long commandTriggeredTime) {
        Log.d(TAG, "someExampleCallback: someExampleCallback called");
        augmentOSLib.sendReferenceCard(appName, "someExampleCallback was called");
    }

    public void processTranscriptionCallback(String transcript, long timestamp, boolean isFinal) {
        Log.d(TAG, "Got a transcript: " + transcript);
        augmentOSLib.sendReferenceCard("Example TPA Live Captions", transcript);
    }

}
