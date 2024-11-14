package com.augmentos_manager

import android.app.Application
import android.content.Context
import android.content.IntentFilter
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactContext
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.shell.MainReactPackage
import com.facebook.soloader.SoLoader
import com.augmentos_manager.IntentSenderPackage
import kjd.reactnative.bluetooth.RNBluetoothClassicPackage
import it.innove.BleManagerPackage
import com.swmansion.reanimated.ReanimatedPackage
import com.swmansion.rnscreens.RNScreensPackage
import com.th3rdwave.safeareacontext.SafeAreaContextPackage
import com.BV.LinearGradient.LinearGradientPackage
import com.swmansion.gesturehandler.RNGestureHandlerPackage
import com.augmentos_manager.NotificationReceiver

class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost = object : ReactNativeHost(this) {
        override fun getUseDeveloperSupport(): Boolean {
            return BuildConfig.DEBUG
        }

        override fun getPackages(): List<ReactPackage> {
            return listOf(
                MainReactPackage(),
                IntentSenderPackage(),
                RNBluetoothClassicPackage(),
                BleManagerPackage(),
                ReanimatedPackage(),
                RNScreensPackage(),
                SafeAreaContextPackage(),
                LinearGradientPackage(),
                RNGestureHandlerPackage()
            )
        }

        override fun getJSMainModuleName(): String {
            return "index"
        }
    }

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, /* native exopackage */ false)

        // Register a listener to set up notificationReceiver once React context is available
        reactNativeHost.reactInstanceManager.addReactInstanceEventListener(object : ReactInstanceEventListener {
            override fun onReactContextInitialized(reactContext: ReactContext) {
                val notificationReceiver = NotificationReceiver(reactContext)
                val filter = IntentFilter("NOTIFICATION_LISTENER")
                LocalBroadcastManager.getInstance(this@MainApplication).registerReceiver(notificationReceiver, filter)
            }
        })
    }
}
