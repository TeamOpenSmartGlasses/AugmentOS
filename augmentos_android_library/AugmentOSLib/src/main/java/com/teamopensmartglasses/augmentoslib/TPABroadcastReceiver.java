package com.teamopensmartglasses.augmentoslib;

import static android.content.Context.RECEIVER_EXPORTED;
import static com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants.EVENT_BUNDLE;
import static com.teamopensmartglasses.augmentoslib.AugmentOSGlobalConstants.EVENT_ID;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;

import com.teamopensmartglasses.augmentoslib.events.CommandTriggeredEvent;
import com.teamopensmartglasses.augmentoslib.events.CoreToManagerOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.FocusChangedEvent;
import com.teamopensmartglasses.augmentoslib.events.GlassesPovImageEvent;
import com.teamopensmartglasses.augmentoslib.events.GlassesTapOutputEvent;
import com.teamopensmartglasses.augmentoslib.events.KillTpaEvent;
import com.teamopensmartglasses.augmentoslib.events.SmartRingButtonOutputEvent;
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
        this.context.registerReceiver(this, intentFilter, RECEIVER_EXPORTED);
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
            case SmartRingButtonOutputEvent.eventId:
                EventBus.getDefault().post((SmartRingButtonOutputEvent) serializedEvent);
                break;
            case GlassesTapOutputEvent.eventId:
                EventBus.getDefault().post((GlassesTapOutputEvent) serializedEvent);
                break;
            case FocusChangedEvent.eventId:
                EventBus.getDefault().post((FocusChangedEvent) serializedEvent);
                break;
            case GlassesPovImageEvent.eventId:
                EventBus.getDefault().post((GlassesPovImageEvent) serializedEvent);
                break;
            case CoreToManagerOutputEvent.eventId:
                EventBus.getDefault().post((CoreToManagerOutputEvent) serializedEvent);
                break;
        }
    }

    public void destroy(){
        this.context.unregisterReceiver(this);
    }
}
