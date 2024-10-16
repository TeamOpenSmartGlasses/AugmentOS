// android/app/src/main/java/com/augmentos_manager/IntentSenderModule.kt

package com.augmentos_manager // Replace with your actual package name

import android.content.Intent
import android.content.ComponentName
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject

class IntentSenderModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "IntentSenderModule"
        private const val TARGET_PACKAGE = "com.teamopensmartglasses.augmentosmain"
        private const val TARGET_CLASS = "com.teamopensmartglasses.augmentosmain.MainActivity" // Replace with actual class if different
        private const val ACTION_SEND_JSON = "com.augmentos_manager.ACTION_SEND_JSON" // Define a custom action
    }

    override fun getName(): String {
        return "IntentSender"
    }

    @ReactMethod
    fun sendIntent(jsonPayload: String) {
        try {
            val jsonObject = JSONObject(jsonPayload)
            val intent = Intent().apply {
                component = ComponentName(TARGET_PACKAGE, TARGET_CLASS)
                action = ACTION_SEND_JSON
                putExtra("payload", jsonObject.toString())
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            Log.d(TAG, "Intent sent successfully.")
        } catch (e: Exception) {
            Log.e(TAG, "Error sending intent: ${e.message}")
        }
    }
}
