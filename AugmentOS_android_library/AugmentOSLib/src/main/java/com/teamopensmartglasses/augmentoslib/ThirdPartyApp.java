package com.teamopensmartglasses.augmentoslib;

import java.io.Serializable;
import java.util.ArrayList;

public class ThirdPartyApp implements Serializable {
    public String appName;
    public String appDescription;
    public String packageName;

    public String serviceName;

    public AugmentOSCommand[] commandList;

    ThirdPartyApp(String appName, String appDescription, String packageName, String serviceName, AugmentOSCommand[] commandList){
        this.appName = appName;
        this.appDescription = appDescription;
        this.packageName = packageName;
        this.serviceName = serviceName;
        this.commandList = commandList;
    }
}
