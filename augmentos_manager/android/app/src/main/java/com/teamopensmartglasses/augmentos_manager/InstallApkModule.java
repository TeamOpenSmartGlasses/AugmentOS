package com.teamopensmartglasses.augmentos_manager;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.File;

public class InstallApkModule extends ReactContextBaseJavaModule {
    private static final String REACT_CLASS = "InstallApkModule";

    public InstallApkModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return REACT_CLASS; // This is the name used in JS: NativeModules.InstallApkModule
    }

    @ReactMethod
    public void installApk(String packageName, Promise promise) {
        try {
            // Log the package name being installed
            Log.d(REACT_CLASS, "Requested installation of package: " + packageName);

            // Define the APK file location
            File apkFile = new File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                    packageName + ".apk"
            );

            // Log the APK file path
            Log.d(REACT_CLASS, "APK file path: " + apkFile.getAbsolutePath());

            // Ensure the file exists and is not empty
            if (!apkFile.exists() || apkFile.length() == 0) {
                Log.e(REACT_CLASS, "APK file is missing or 0 bytes: " + apkFile.getAbsolutePath());
                promise.reject("APK_FILE_ERROR", "APK file is missing or 0 bytes.");
                return;
            }

            // Use FileProvider for Android 7.0+ and a direct URI for older versions
            Uri apkUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                apkUri = FileProvider.getUriForFile(
                        getReactApplicationContext(),
                        getReactApplicationContext().getPackageName() + ".provider",
                        apkFile
                );
            } else {
                apkUri = Uri.fromFile(apkFile);
            }

            // Log the URI generated
            Log.d(REACT_CLASS, "APK URI: " + apkUri.toString());

            // Create the intent to install the APK
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            // Log before starting the installation intent
            Log.d(REACT_CLASS, "Starting installation intent");

            // Start the installation process
            getReactApplicationContext().startActivity(intent);

            // Resolve the promise to indicate success
            promise.resolve("Installation started successfully");
        } catch (Exception e) {
            Log.e(REACT_CLASS, "Error installing APK: ", e);
            promise.reject("INSTALL_ERROR", e);
        }
    }
}