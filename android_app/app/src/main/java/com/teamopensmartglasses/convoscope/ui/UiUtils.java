package com.teamopensmartglasses.convoscope.ui;

import android.app.Activity;

import com.teamopensmartglasses.convoscope.MainActivity;
import com.teamopensmartglasses.convoscope.R;

public class UiUtils {

    //set app bar title
    public static void setupTitle(Activity activity, String title) {
        //Toolbar toolbar = (Toolbar) activity.findViewById(R.id.main_toolbar);
        //((MainActivity) activity).setSupportActionBar(toolbar);
        ((MainActivity) activity).getSupportActionBar().setTitle(title);
    }
}
