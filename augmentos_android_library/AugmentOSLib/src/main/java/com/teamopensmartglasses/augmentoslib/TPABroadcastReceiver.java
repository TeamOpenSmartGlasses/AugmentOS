package com.teamopensmartglasses.augmentoslib;

import static com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants.EVENT_BUNDLE;
import static com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants.EVENT_ID;
import static com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants.AugmentOSPkgName;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.metrics.Event;
import android.util.Log;

import com.teamopensmartglasses.augmentoslib.events.CommandTriggeredEvent;
import com.teamopensmartglasses.augmentoslib.events.FocusChangedEvent;
import com.teamopensmartglasses.augmentoslib.events.FocusRequestEvent;
import com.teamopensmartglasses.augmentoslib.events.GlassesTapOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.KillTpaEvent;
import com.teamopensmartglasses.augmentoslib.events.SmartRingButtonOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.SpeechRecFinalOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.SpeechRecIntermediateOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.SpeechRecOutputEvent;

import org.greenrobot.eventbus.EventBus;

import java.io.Serializable;

public class TPABroadcastReceiver extends BroadcastReceiver {
    private String filterPkg;
    private Context context;
    public String TAG = "AugmentOSLib_TPABroadcastReceiver";

    public TPABroadcastReceiver(Context myContext) {
        this.context = myContext;
        this.filterPkg = AugmentOSGlobalConstants.TO_TPA_FILTER;
        IntentFilter intentFilter = new IntentFilter(this.filterPkg);
        this.context.registerReceiver(this, intentFilter);
    }

    public void onReceive(Context context, Intent intent) {
        String eventId = intent.getStringExtra(EVENT_ID);
        Serializable serializedEvent = intent.getSerializableExtra(EVENT_BUNDLE);

        //map from id to event
        switch (eventId) {
            case CommandTriggeredEvent.eventId:
                EventBus.getDefault().post((CommandTriggeredEvent) serializedEvent);
                break;
            case KillTpaEvent.eventId:
                EventBus.getDefault().post((KillTpaEvent) serializedEvent);
                break;
            case SpeechRecOutputEvent.eventId:
                EventBus.getDefault().post((SpeechRecOutputEvent) serializedEvent);
                break;
            case SpeechRecIntermediateOutputEvent.eventId:
                EventBus.getDefault().post((SpeechRecIntermediateOutputEvent) serializedEvent);
                break;
            case SpeechRecFinalOutputEvent.eventId:
                EventBus.getDefault().post((SpeechRecFinalOutputEvent) serializedEvent);
                break;
            case SmartRingButtonOutputEvent.eventId:
                EventBus.getDefault().post((SmartRingButtonOutputEvent) serializedEvent);
                break;
            case GlassesTapOutputEvent.eventId:
                EventBus.getDefault().post((GlassesTapOutputEvent) serializedEvent);
                break;
            case FocusChangedEvent.eventId:
                EventBus.getDefault().post((FocusChangedEvent) serializedEvent);
                break;
        }
    }

    public void destroy(){
        this.context.unregisterReceiver(this);
    }
}
