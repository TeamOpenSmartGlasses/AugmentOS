package com.teamopensmartglasses.augmentoslib;

import android.app.ActivityManager;
import android.content.Context;
import android.util.Log;

import java.io.Serializable;
import java.util.ArrayList;

public class ThirdPartyApp implements Serializable {
    public String appName;
    public String appDescription;
    public String packageName;

    public String serviceName;
    public ThirdPartyAppType appType;

    public AugmentOSCommand[] commandList;

    public ThirdPartyApp(String appName, String appDescription, String packageName, String serviceName, ThirdPartyAppType appType, AugmentOSCommand[] commandList){
        this.appName = appName;
        this.appDescription = appDescription;
        this.packageName = packageName;
        this.serviceName = serviceName;
        this.appType = appType;
        this.commandList = commandList;
    }
}
