package com.teamopensmartglasses.convoscope.tpa;

import static com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants.EVENT_BUNDLE;
import static com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants.EVENT_ID;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.teamopensmartglasses.augmentoslib.AugmentOSCommand;
import com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants;
import com.teamopensmartglasses.augmentoslib.SmartGlassesAndroidService;
import com.teamopensmartglasses.augmentoslib.events.CommandTriggeredEvent;

import java.io.Serializable;

public class AugmentOSLibBroadcastSender {
    private String TAG = "WearableAi_AugmentOSLibBroadcastSEnder";
    private String intentPkg;
    Context context;

    public AugmentOSLibBroadcastSender(Context context) {
        this.context = context;
        this.intentPkg = AugmentOSGlobalConstants.TO_TPA_FILTER;
    }

    public void sendEventToTPAs(String eventId, Serializable eventBundle) {
        sendEventToTPAs(eventId, eventBundle, null);
    }
    public void sendEventToTPAs(String eventId, Serializable eventBundle, String tpaPackageName) {
        //If we're triggering a command, make sure the command's respective service is running
        if(eventId == CommandTriggeredEvent.eventId){
            AugmentOSCommand cmd = ((CommandTriggeredEvent)eventBundle).command;
            startSgmCommandService(cmd);
            //delay a short time so the service can start before we send it the data
            try {
                Thread.sleep(450);
            } catch (InterruptedException e){
                e.printStackTrace();
                Log.d(TAG, "Interrupted while waiting for TPA service to start.");
            }
        }

        //setup intent to send
        Intent intent = new Intent();
        intent.setAction(intentPkg);
        if (tpaPackageName != null) {
            intent.setPackage(tpaPackageName);
        }
        intent.setFlags(Intent.FLAG_INCLUDE_STOPPED_PACKAGES);

        //load in and send data
        intent.putExtra(EVENT_ID, eventId);
        intent.putExtra(EVENT_BUNDLE, eventBundle);
        context.sendBroadcast(intent);
    }

    //Starts a AugmentOSCommand's service (if not already running)
    public void startSgmCommandService(AugmentOSCommand augmentosCommand){
        //tpaPackageName = "com.google.mlkit.samples.nl.translate";
        //tpaServiceName = ".java.TranslationService";
        Log.d(TAG, "Starting command package: " + augmentosCommand.packageName);
        Log.d(TAG, "Starting command service: " + augmentosCommand.serviceName);

        if(augmentosCommand.getPackageName() == "" || augmentosCommand.getServiceName() == ""){
            return;
        }

        Intent i = new Intent();
        i.setAction(SmartGlassesAndroidService.INTENT_ACTION);
        i.putExtra(SmartGlassesAndroidService.TPA_ACTION, SmartGlassesAndroidService.ACTION_START_FOREGROUND_SERVICE);
        i.setComponent(new ComponentName(augmentosCommand.packageName, augmentosCommand.serviceName));
        ComponentName c = context.startForegroundService(i);
    }
}
