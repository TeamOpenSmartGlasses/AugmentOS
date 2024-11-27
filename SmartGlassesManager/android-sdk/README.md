# ActiveLookSDK

## Requirements

In order to use the ActiveLook SDK for android, you should have Android Studio installed.

## License

```
Copyright 2021 Microoled
Licensed under the Apache License, Version 2.0 (the “License”);
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an “AS IS” BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## Quick start

You can start displaying custom data in your glasses in less than 10 minutes. Ready?

### Requirements

You will need the following:
- A pair of glasses
- AndroidStudio up
- An android device with BLE

### Step 1: Start a new Android project

Open AndroidStudio and create a new project.

### Step 2: Add the ActiveLook SDK dependency

The ActiveLook SDK is available on [jitpack](https://jitpack.io/#ActiveLook/android-sdk).
In order to use it, you need to add jitpack repository in your project dependency resolver.
You need to add the line `maven { url 'https://jitpack.io' }`.
Depending on your gradle version, you'll have to either modify the root `build.gradle`
or the `settings.gradle` file.

1. For the `build.gradle` file, you should add:
```
allprojects {
  repositories {
    ...
    maven { url 'https://jitpack.io' }
  }
}
```
2. For the `settings.gradle` file, you should add:
```
dependencyResolutionManagement {
  repositories {
    ...
    maven { url 'https://jitpack.io' }
  }
}
```

You can add the dependency in your application by modifying the application `build.gradle`
and add:
```
dependencies {
  implementation 'com.github.activelook:android-sdk:v4.4.3'
}
```

### Step 3: Set up your android device

On your android device, enable the
[developer mode](https://developer.android.com/studio/debug/dev-options)
and connect it to your computer via USB.
Your device will prompt you to accept debugging from Android Studio.
Accept it if you trust your computer and your device should appear in Android Studio
menu bar, next to the 'Play' button.

### Step 4: Update the application source code

You can modify the main activity of your application:

```java
// ... package statement and other imports
import com.activelook.activelooksdk.Sdk;
import com.activelook.activelooksdk.types.Rotation;
// ... class definition and other methods
    @Override
    protected void onCreate(Bundle savedInstanceState) {
      // ... method other statements
      runOnUiThread(() -> {
        Log.e("ANDROID", "Permissions");
        ActivityCompat.requestPermissions(MainActivity.this, new String[] {
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.INTERNET,
            Manifest.permission.WAKE_LOCK,
            Manifest.permission.BLUETOOTH,
            Manifest.permission.BLUETOOTH_ADMIN
        }, 0);
        Log.e("SDK", "Init");
        Sdk.init(
            MainActivity.this,
            "your-sdk-token-provided-by-microoled",
            gu -> Log.d("GLASSES_UPDATE", String.format("onUpdateStart               : %s", gu)),
            gu_f -> {
                  Log.d("GLASSES_UPDATE", String.format("onUpdateAvailableCallback   : %s", gu_f.first));
                  gu_f.second.run();
            },
            gu -> Log.d("GLASSES_UPDATE", String.format("onUpdateProgress            : %s", gu)),
            gu -> Log.d("GLASSES_UPDATE", String.format("onUpdateSuccess             : %s", gu)),
            gu -> Log.d("GLASSES_UPDATE", String.format("onUpdateError               : %s", gu))
        );
        Log.e("SDK", "Instance");
        Sdk sdk = Sdk.getInstance();
        Log.e("SDK", "Scan");
        sdk.startScan(discoveredGlasses -> {
            Log.e("DISCOVER", String.format("Glasses connecting: %s", discoveredGlasses.getAddress()));
            discoveredGlasses.connect(
                    glasses -> {
                        Log.e("CONNECT", "Glasses connecting");
                        glasses.txt(new Point(50, 50), Rotation.TOP_LR, (byte) 0x00, (byte) 0xFF, "Mon Super Test");
                        Log.e("CONNECT", "Glasses connected");
                    },
                    errorDiscoveredGlasses -> {
                        Log.e("ERROR", "Glasses could not be connected");
                    },
                    glasses -> {
                        Log.e("DISCONNECT", "Glasses have been disconnected");
                    }
            );
        });
      });
      // ... method other statements
    }
// ... other class methods
```

## Alternative getting started using demo app

You can check our demo application on https://github.com/ActiveLook/demo-app

---

## More in depth example

To run the example project, clone the repo, and import the project in Android Studio.

Note: BlueTooth will not work on the android simulator. A physical device should be used instead.

### Initialization

To start using the SDK, first import and initialize the sdk.
You will need a token provided by Microoled to authenticate with the update server.
Five callbacks `onUpdateStart`, `onUpdateAvailableCallback`, `onUpdateProgress`, `onUpdateSuccess`, `onUpdateError`
must be provided to handle glasses update events.
Read the javadoc for more inforamtions.
For example, in a main application class, you can initialize the SDK like this:

```java
package com.activelook.demo;

import android.app.Application;
import com.activelook.activelooksdk.Sdk;

public class DemoApp extends Application {

  private Sdk alsdk;

  @Override
  public void onCreate() {
    super.onCreate();
    this.alsdk = Sdk.init(
      this.getApplicationContext(),
      "MyPrivateToken",
      (update) -> Log.i("GLASSES_UPDATE", "Starting glasses update."),
      (update) -> { Log.i("GLASSES_UPDATE", "A glasses update is available."); return true; },
      (update) -> Log.i("GLASSES_UPDATE", "Progressing glasses update."),
      (update) -> Log.i("GLASSES_UPDATE", "Success glasses update."),
      (update) -> Log.i("GLASSES_UPDATE", "Error glasses update.")
    );
  }

  public Sdk getActiveLookSdk() {
    return this.alsdk;
  }

}
```

Then, use the shared singleton wherever needed. This can be called from anywhere within your application.

```java
import com.activelook.activelooksdk.Sdk;

...

Sdk alsdk = ((DemoApp) this.getApplication()).getActiveLookSdk();
```

### Scanning

To scan for available ActiveLook glasses, simply use the
`startScan(Consumer<DiscoveredGlasses> onDiscoverGlasses)` and
`stopScan()` methods.

When a device is discovered, the `onDiscoverGlasses` callback will be called.

You can handle these cases by providing an instance of `Consumer<DiscoveredGlasses>`.
Since this is a single method interface, you can also create it on the fly with a closure.
For example, you can run some process on the UI thread:

```java
this.alsdk.startScan(discoveredGlasses -> runOnUiThread(() -> {
  Log.d("SDK", discoveredGlasses.toString());
}));
```

### Connect to ActiveLook glasses

To connect to a pair of discovered glasses, use the `connect(Consumer<Glasses> onConnected, Consumer<DiscoveredGlasses> onConnectionFail, Consumer<Glasses> onDisconnected)` method on the `DiscoveredGlasses` object.

The connection process handle the glasses update.
The registered callbacks on the SDK initialization will be triggered if a compatible
update is available.
Once the update process has terminated, you connection process will continue.

If the connection is successful, the `onConnected.accept` method will be called and will return a `Glasses` object,
which can then be used to get information about the connected ActiveLook glasses or send commands.

If the connection fails, the `onConnectionFail.accept` method will be called instead.

Finally, if the connection to the glasses is lost at any point,
later, while the app is running, the `onDisconnected.accept` method will be called.

Since all those handler are single method interfaces, you can create them on the fly with closures:

```java
discoveredGlasses.connect(
  glasses -> { Log.d("SDK", "Connected: " + glasses.toString()); },
  discoveredGlasses -> { Log.d("SDK", "Connection fail: " + discoveredGlasses.toString()); },
  glasses -> { Log.d("SDK", "Disconnected: " + discoveredGlasses.toString()); }
);
```

If you need to share the `Glasses` object between several Activity,
and you find it hard or inconvenient to hold onto the `onDisconnected` callback,
you can reset it or provide a new one by using the
`setOnDisconnected(Consumer<Glasses> onDisconnected)` method on the `Glasses` object:

```java
glasses.setOnDisconnected(
  glasses -> { Log.d("SDK", "New disconnected handler: " + glasses.toString()); }
);
```

### Device information

To get information relative to discovered glasses as published over Bluetooth, you can access the following public properties:

```java
this.alsdk.startScan(discoveredGlasses -> {
  Log.d("discoveredGlasses", "Manufacturer:" + discoveredGlasses.getManufacturer());
  Log.d("discoveredGlasses", "Name:" + discoveredGlasses.getName());
  Log.d("discoveredGlasses", "Address:" + discoveredGlasses.getAddress());
});
```

Once connected, you can access more information about the device such as its firmware version, the model number etc... by using the `DeviceInformation getDeviceInformation()` method:

```java
DeviceInformation di = glasses.getDeviceInformation();
Log.d("Glasses", "ManufacturerName: " + di.getManufacturerName());
Log.d("Glasses", "ModelNumber: " + di.getModelNumber());
Log.d("Glasses", "SerialNumber: " + di.getSerialNumber());
Log.d("Glasses", "HardwareVersion: " + di.getHardwareVersion());
Log.d("Glasses", "FirmwareVersion: " + di.getFirmwareVersion());
Log.d("Glasses", "SoftwareVersion: " + di.getSoftwareVersion());
```

### Commands

All available commands are exposed as methods in the `Glasses` class.
Examples are available in the Example application.
Most commands require parameters to be sent.

```java
// Power on the glasses
glasses.power(true);

// Set the display luminance level
glasses.luma((byte) 15)

// Draw a circle at the center of the screen
glasses.circ((short) 152, (short) 128, (byte) 50)

// Enable gesture detection sensor
glasses.gesture(true)

// Some other example
glasses.power(false);
glasses.clear();
glasses.grey((byte) 0x03);
glasses.grey((byte) 0x07);
glasses.grey((byte) 0x0B);
glasses.grey((byte) 0x0F);
glasses.demo();
glasses.test(DemoPattern.CROSS);
glasses.test(DemoPattern.FILL);
```

When a response is expected from the glasses,
an handler must be provided as a instance or as a closure.
The callback will be called asynchronously.

```java
glasses.battery(r -> { Log.d("Battery", String.format("Battery level: %d", r)); });
```

### Notifications

It is possible to subscribe to three types of notifications that the glasses will send over Bluetooth:

- Battery level updates (periodically, every 30 seconds)
- Gesture detection sensor triggered
- Flow control events (when the state of the flow control changes)

```java
glasses.subscribeToBatteryLevelNotifications( //Consumer<Integer> onEvent
  r -> { Log.d("Notif", "Battery: " + r.toString()); }
);
glasses.subscribeToFlowControlNotifications( //Consumer<FlowControlStatus> onEvent
  r -> { Log.d("Notif", "Flow control: " + r.toString()); }
);
glasses.subscribeToSensorInterfaceNotifications( //Runnable onEvent
  r -> { Log.d("Notif", "Sensor: Gesture!"); }
);
```

### Disconnect

When done interacting with ActiveLook glasses, simply call the `disconnect()` method:

```java
glasses.disconnect()
```

### Sharing glasses across multiple activities

In order to use a `DiscoveredGlasses` or a `Glasses` created in one activty and consumed in another one, `Intent` must be use.
These classes implements the `Parcelable` interface to make it possible.
You can find an example in the sample application where the `Glasses` is shared between the scanning activity and the main activity.

```java
public class MainActivity extends AppCompatActivity {

  private Glasses connectedGlasses;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    ...
    if (savedInstanceState != null) {
      this.connectedGlasses = savedInstanceState.getParcelable("connectedGlasses");
    }
    ...
  }

  @Override
  protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
    this.connectedGlasses = data.getExtras().getParcelable("connectedGlasses");
  }

  @Override
  public void onSaveInstanceState(Bundle savedInstanceState) {
    if (this.connectedGlasses != null) {
      savedInstanceState.putParcelable("connectedGlasses", this.connectedGlasses);
    }
  }
  ...
}

public class ScanningActivity extends AppCompatActivity {
...
  device.connect(glasses -> {
    Intent returnIntent = new Intent();
    returnIntent.putExtra("connectedGlasses", glasses);
    ScanningActivity.this.setResult(Activity.RESULT_FIRST_USER, returnIntent);
    ScanningActivity.this.finish();
  }, null, null);
...
}
```

### About Android Wear

For now, it is unclear if Android Wear can be supported.
A study on the compatibility and limits needs to be done and
this sample code will be updated accordingly.


# About the project

Compiled and validated with Android studio 3.1.3 for Windows 64-bit
Using (automatically installed):
- Gradle 4.4
- Android SDK Platform 21
- Build Tools revision 27.0.3


This code is licensed under the MIT Licence. You may obtain a copy of the License at

https://opensource.org/licenses/MIT

MDMBLE application embeds a SQLite database to store internal settings
The unique MessageBLE(int id, String message, String alias) table stores the commands:
- id: incremental number
- message: command to be sent
- alias: text displayed on the interface

Caution: the database is cleared only when uninstalling the application.
