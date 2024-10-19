package com.augmentos_manager // Ensure this matches your actual package name

import android.app.Application
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.shell.MainReactPackage // Make sure this is correctly imported
import com.facebook.soloader.SoLoader
import com.augmentos_manager.IntentSenderPackage // Import your custom package
import kjd.reactnative.bluetooth.RNBluetoothClassicPackage // Correct import
import it.innove.BleManagerPackage; // Import this

class MainApplication : Application(), ReactApplication {

    // Define reactNativeHost as a property and override it properly
    override val reactNativeHost: ReactNativeHost = object : ReactNativeHost(this) {
        override fun getUseDeveloperSupport(): Boolean {
            return BuildConfig.DEBUG
        }

        override fun getPackages(): List<ReactPackage> {
            return listOf(
                MainReactPackage(), // This is where MainReactPackage is used
                IntentSenderPackage(), // Add your custom native module package here
                RNBluetoothClassicPackage(), // Add this package
                BleManagerPackage()
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
