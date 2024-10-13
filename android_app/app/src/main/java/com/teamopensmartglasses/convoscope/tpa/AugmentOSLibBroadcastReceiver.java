package com.teamopensmartglasses.convoscope.tpa;

import static com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants.EVENT_ID;
import static com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants.APP_PKG_NAME;
import static com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants.EVENT_BUNDLE;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.util.Log;

import com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants;
import com.teamopensmartglasses.augmentoslib.events.BulletPointListViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.FinalScrollingTextRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.FocusRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ReferenceCardImageViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ReferenceCardSimpleViewRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.RegisterCommandRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ScrollingTextViewStartRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.ScrollingTextViewStopRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.SubscribeDataStreamRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.TextLineViewRequestEvent;
import com.teamopensmartglasses.convoscope.tpa.eventbusmessages.TPARequestEvent;

import org.greenrobot.eventbus.EventBus;

import java.io.Serializable;

public class AugmentOSLibBroadcastReceiver extends BroadcastReceiver {
    private String filterPkg;
    private Context context;
    public String TAG = "WearableAi_AugmentOSLibBroadcastReceiver";

    public AugmentOSLibBroadcastReceiver() {

    }

    public AugmentOSLibBroadcastReceiver(Context context) {
        this.context = context;
        this.filterPkg = AugmentOSGlobalConstants.FROM_TPA_FILTER;
        IntentFilter intentFilter = new IntentFilter(this.filterPkg);
        context.registerReceiver(this, intentFilter);
    }

    public void onReceive(Context context, Intent intent) {
        String eventId = intent.getStringExtra(EVENT_ID);
        String sendingPackage = intent.getStringExtra(APP_PKG_NAME);
        Serializable serializedEvent = intent.getSerializableExtra(EVENT_BUNDLE);
        Log.d(TAG, "GOT EVENT ID: " + eventId);

        //map from id to event
        switch (eventId) {
            //if it's a request to run something on glasses or anything else having to do with commands, pipe this through the command system
            case ReferenceCardSimpleViewRequestEvent.eventId:
            case ReferenceCardImageViewRequestEvent.eventId:
            case BulletPointListViewRequestEvent.eventId:
            case ScrollingTextViewStartRequestEvent.eventId:
            case ScrollingTextViewStopRequestEvent.eventId:
            case FinalScrollingTextRequestEvent.eventId:
            case RegisterCommandRequestEvent.eventId:
            case TextLineViewRequestEvent.eventId:
            case FocusRequestEvent.eventId:
                Log.d(TAG, "Piping command event to CommandSystem for verification before broadcast.");
                EventBus.getDefault().post(new TPARequestEvent(eventId, serializedEvent, sendingPackage));
                break;
            case SubscribeDataStreamRequestEvent.eventId:
                Log.d(TAG, "Resending subscribe to data stream request event");
                EventBus.getDefault().post((SubscribeDataStreamRequestEvent) serializedEvent);
                break;
        }
    }

    public void unregister(){
       context.unregisterReceiver(this);
    }
}
