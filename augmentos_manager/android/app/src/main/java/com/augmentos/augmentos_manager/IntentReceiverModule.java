package com.augmentos.augmentos_manager;

import android.content.Intent;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;

public class IntentReceiverModule extends ReactContextBaseJavaModule {
    private static final String TAG = "IntentReceiverModule";
    private static ReactApplicationContext reactContext;

    public IntentReceiverModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "IntentReceiverModule";
    }

    /**
     * Process the intent and log its data
     * @param intent The intent to process
     */
    public static void handleIntent(Intent intent) {
        if (intent == null) {
            Log.d(TAG, "Intent is null");
            return;
        }

        try {
            // Get the action
            String action = intent.getAction();
            StringBuilder logMessage = new StringBuilder("Received intent with action: ");
            logMessage.append(action != null ? action : "null");
            
            // Get the data
            String dataString = intent.getDataString();
            if (dataString != null) {
                logMessage.append(", data: ").append(dataString);
            }
            
            // Get extras if any
            if (intent.getExtras() != null) {
                logMessage.append(", extras: {");
                boolean first = true;
                for (String key : intent.getExtras().keySet()) {
                    if (!first) {
                        logMessage.append(", ");
                    }
                    first = false;
                    
                    Object value = intent.getExtras().get(key);
                    logMessage.append(key).append("=");
                    if (value != null) {
                        logMessage.append(value.toString());
                    } else {
                        logMessage.append("null");
                    }
                }
                logMessage.append("}");
            }
            
            // Log the intent data
            Log.d(TAG, logMessage.toString());
        } catch (Exception e) {
            Log.e(TAG, "Error handling intent", e);
        }
    }
} 