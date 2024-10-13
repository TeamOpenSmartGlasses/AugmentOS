package com.teamopensmartglasses.augmentoslib;

import java.io.Serializable;
import java.util.ArrayList;

public class ThirdPartyApp implements Serializable {
    String appName;
    String appDescription;

    ThirdPartyApp(String appName, String appDescription){
        this.appName = appName;
        this.appDescription = appDescription;
    }
}
