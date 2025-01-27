package com.augmentos.augmentoslib;

import static android.content.Context.RECEIVER_EXPORTED;
import static com.augmentos.augmentoslib.AugmentOSGlobalConstants.EVENT_BUNDLE;
import static com.augmentos.augmentoslib.AugmentOSGlobalConstants.EVENT_ID;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;

import com.augmentos.augmentoslib.events.CommandTriggeredEvent;
import com.augmentos.augmentoslib.events.CoreToManagerOutputEvent;
import com.augmentos.augmentoslib.events.FocusChangedEvent;
import com.augmentos.augmentoslib.events.GlassesPovImageEvent;
import com.augmentos.augmentoslib.events.GlassesTapOutputEvent;
import com.augmentos.augmentoslib.events.KillTpaEvent;
import com.augmentos.augmentoslib.events.NotificationEvent;
import com.augmentos.augmentoslib.events.SmartRingButtonOutputEvent;
import com.augmentos.augmentoslib.events.SpeechRecOutputEvent;
import com.augmentos.augmentoslib.events.TranslateOutputEvent;

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
            case TranslateOutputEvent.eventId:
                EventBus.getDefault().post((TranslateOutputEvent) serializedEvent);
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
            case NotificationEvent.eventId:
                EventBus.getDefault().post((NotificationEvent) serializedEvent);
                break;
        }
    }

    public void destroy(){
        this.context.unregisterReceiver(this);
    }
}
