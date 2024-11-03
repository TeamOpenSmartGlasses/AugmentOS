package com.augmentos_manager // Ensure this matches your actual package name

import android.app.Application
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.shell.MainReactPackage
import com.facebook.soloader.SoLoader
import com.augmentos_manager.IntentSenderPackage // Import your custom package
import kjd.reactnative.bluetooth.RNBluetoothClassicPackage // Bluetooth package
import it.innove.BleManagerPackage // BLE Manager package
import com.swmansion.reanimated.ReanimatedPackage // Reanimated package
import com.swmansion.rnscreens.RNScreensPackage // Screens package
import com.th3rdwave.safeareacontext.SafeAreaContextPackage // SafeArea package
import com.BV.LinearGradient.LinearGradientPackage // Add this import for LinearGradient
import com.swmansion.gesturehandler.RNGestureHandlerPackage // Add GestureHandler import

class MainApplication : Application(), ReactApplication {

    // Define reactNativeHost as a property and override it properly
    override val reactNativeHost: ReactNativeHost = object : ReactNativeHost(this) {
        override fun getUseDeveloperSupport(): Boolean {
            return BuildConfig.DEBUG
        }

        override fun getPackages(): List<ReactPackage> {
            return listOf(
                MainReactPackage(), // Main React package
                IntentSenderPackage(), // Custom native module package
                RNBluetoothClassicPackage(), // Bluetooth Classic package
                BleManagerPackage(), // BLE Manager package
                ReanimatedPackage(), // Reanimated package for animations
                RNScreensPackage(), // Screens package for navigation
                SafeAreaContextPackage(), // SafeArea context package
                LinearGradientPackage(), // LinearGradient package
                RNGestureHandlerPackage() // Add GestureHandler package here
            )
        }

        override fun getJSMainModuleName(): String {
            return "index"
        }
    }

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, /* native exopackage */ false)
    }
}
