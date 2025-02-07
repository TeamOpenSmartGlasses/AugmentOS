---
sidebar_position: 2
---

# How to make an AugmentOS app

## **Super-Easy Mode: Clone The Example App Repo**

If you just want to dive in:
1. Clone the [AugmentOS Example App repo](https://github.com/AugmentOS-Community/AugmentOS-Example-App).
2. [Install AugmentOSLib](#augmentoslib-installation)
3. Build and deploy the app to a device running AugmentOS_Core.

You're now running an AugmentOS TPA!

---

## **Easy Mode: Start from Scratch**

If you want to start from scratch:
1. Start a fresh Android Studio Project.
2. [Install AugmentOSLib](#augmentoslib-installation)
3. Add the following to your app's `AndroidManifest.xml` file:

```
<service android:name="com.yourpackage.YourAugmentosService"
    android:exported="true">
    <!-- Intent filter required to communicate with AugmentOS -->
    <intent-filter>
        <action android:name="AUGMENTOS_INTENT" />
    </intent-filter>
</service>
```

4. Create a `tpa_config.json` file in `app/src/main/res/raw/`:

```json
{
  "name": "Example App",
  "description": "Example App Description",
  "version": "1.0.0",
  "settings": [
    {
      "key": "enableLogging",
      "type": "toggle",
      "label": "Enable Logging",
      "defaultValue": true
    },
    {
      "key": "username",
      "type": "text",
      "label": "Username",
      "defaultValue": "JohnDoe"
    },
    {
      "key": "volumeLevel",
      "type": "slider",
      "label": "Volume Level",
      "min": 0,
      "max": 100,
      "defaultValue": 50
    }
  ]
}
```

5. Build and deploy the app to your AugmentOS Puck or other device running AugmentOS Core.

You're now running an AugmentOS TPA!

---

## **AugmentOSLib installation**

1. Clone the [AugmentOS repository](https://github.com/AugmentOS-Community/AugmentOS) next to your app's directory (default setup)

2. If you cloned the [AugmentOS repository](https://github.com/AugmentOS-Community/AugmentOS) elsewhere, update the path to AugmentOSLib in `settings.gradle`:
   ```
   project(':AugmentOSLib').projectDir = new File(rootProject.projectDir, '../AugmentOS/augmentos_android_library/AugmentOSLib')
   ```
