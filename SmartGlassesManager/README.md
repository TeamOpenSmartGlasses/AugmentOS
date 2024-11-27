# SmartGlassesManager

***Version 1.0 coming early 2024**

<p align="center">
    <b>The easiest way to write a smart glasses app. Write 1 app that runs on any pair of smart glasses..</b>
</p>

<p align="center">
    <img src="./res/SGM_app_icon_google_play.png" width="25%">
</p>

## Why Use The Smart Glasses Manager?

### Developers
Building apps that run on a smart phone and stream data to smart glasses is hard, but it’s how today’s lightweight smart glasses work. We handle the connection, UI, data streaming, and transcription, allowing you to rapidly develop smart glasses applications that run on any pair of smart glasses.

### Industry
Your smart glasses won’t see massive consumer adoption if third party developers can’t make awesome apps for your hardware. The SmartGlassesManager is a middleware which already supports many apps and makes it easy for developers to build more. That means, if you add support to your hardware for a single application – the SmartGlassesManager – your glasses will instantly support a plethora of consumer-facing applications.

<p align="center">
    <img src="./res/SmartGlassesManager_Screenshots_20230405.png" width="80%" margin-left="auto" margin-right="auto">
</p>

## Features

1. Connect smart phone to smart glasses, auto-reconnect
    - Wifi, Bluetooth, Android, MCU glasses all supported
2. Receive audio + sensors from glasses
3. Transcribe audio
4. Abstracted interface to show info on the glasses

## Fork of the Wearable Intelligence System

This repo is a fork of the [Wearable Intelligence System](https://github.com/emexlabs/WearableIntelligenceSystem). The Wearable Intelligence System was started at [Emex Labs](https://emexwearables.com) by [Cayden Pierce](https://caydenpierce.com/). This repo has a lot of the history cleaned to make it easier to manage, see the WIS repo for full history.

## Install / Use

You will need two pieces of hardware to run the system:  

1. ASP - Android Smart Phone running Android 12+
2. A pair of smart glasses:
    - Vuzix Z100 / Ultralite OEM Reference Platform
    - Vuzix Shield
    - Activelook Engo 1 or Activelook Engo 2
    - Inmo Air 1 or Inmo Air 2
    - Vuzix Blade 2
    - TCL RayNeo X2

### Install

1. On your Android smart phone, flash the ASP app from Android Studio, the releases page, or from Google Play.
    - Play Store: Coming soon
    - [Github latest release](https://github.com/TeamOpenSmartGlasses/SmartGlassesManager/releases)
2. If using Android Smart Glasses, then on your smart glasses, download or flash the ASG client app:
    - [Github latest release](https://github.com/TeamOpenSmartGlasses/SmartGlassesManager/releases)
3. 
    * Launch the "Smart Glasses Manager" app on your smart phone
    * Accept permissions.
    * If using Android Smart Glasses -> Tap "Start Wifi Hotspot", turn on (configure password if necessary) your wifi hotspot, then go "Back" to return
        - Connect smart glasses WiFi to the smart phone WiFi hotspot
        - Enable mobile data (or wifi sharing) on Android smart phone
        - Start ASG application on smart glasses
        - The phone connection icon will be green if the glasses are connected to your phone. If you speak, you'll see a live transcript on the smart glasses screen.
    * If using Bluetooth Smart Glasses -> Turn on Bluetooth on phone.
3. Tap "Connect Smart Glasses" and choose your glasses.
4. Setup complete.

### Normal Use
    
Here's how to launch the system after you've already done the initial setup above:  

1. Launch "Smart Glasses Manager" app on smart phone
2. Enable mobile hotspot on smart phone with the "Start WiFi Hotspot" button
3. Connect Android smart glasses to Android smart phone WiFi hotspot.
4. Launch "WIS" app on smart glasses.
5. Verify system is running by the "Smart Glasses Conection Indicator" icon turning white on the smart glasses HUD.
    
## Documentation / Developers

(WIP)
Here are the docs: https://github.com/TeamOpenSmartGlasses/SmartGlassesManager/wiki
   
## Authors

The system is fully open source and built by [TeamOpenSmartGlasses](https://teamopensmartglasses.com). We're a team building open source smart glasses technology to enhance user's intelligence in daily life. Join us: https://discord.gg/5ukNvkEAqT

The TeamOpenSmartGlasses members who are contributing to this project include:

- [Cayden Pierce](https://caydenpierce.com)
- [Alex Israelov](http://www.alexisraelov.com/)

We are building a community that is building cognitive augmentation technologies together. 
