package com.teamopensmartglasses.augmentos_manager;

import android.util.Log;

import com.teamopensmartglasses.augmentoslib.SmartGlassesAndroidService;
import com.teamopensmartglasses.augmentoslib.DataStreamType;
import com.teamopensmartglasses.augmentoslib.FocusStates;
import com.teamopensmartglasses.augmentoslib.AugmentOSLib;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import java.util.UUID;

public class ManagerCoreCommsService extends SmartGlassesAndroidService {
    public final String TAG = "ManagerCoreCommsService";

    public AugmentOSLib augmentOSLib;

    public ManagerCoreCommsService() {
        super();
    }

    @Override
    public void onCreate() {
        super.onCreate();
        augmentOSLib = new AugmentOSLib(this);

        augmentOSLib.subscribeCoreToManagerMessages(this::processCoreMessage);

        // Set the service instance for the module
        ManagerCoreCommsServiceModule.setManagerServiceInstance(this);

        sendCommandToCore("{ 'command': 'request_status' }");
    }


    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy: Called");
        augmentOSLib.deinit();
        ManagerCoreCommsServiceModule.setManagerServiceInstance(null);
        super.onDestroy();
    }

    public void processCoreMessage(String jsonString){
        Log.d(TAG, "processCoreMessage: " + jsonString);
        if (ManagerCoreCommsServiceModule.getInstance() != null) {
            ManagerCoreCommsServiceModule.getInstance().emitMessageToJS("CoreMessageIntentEvent", jsonString);
        } else {
            Log.w(TAG, "No active ManagerCoreCommsServiceModule instance to emit message.");
        }
    }

    public void sendCommandToCore(String jsonString) {
        Log.d(TAG, "sendCommandToCore: " + jsonString);
        augmentOSLib.sendDataFromManagerToCore(jsonString);
    }
}