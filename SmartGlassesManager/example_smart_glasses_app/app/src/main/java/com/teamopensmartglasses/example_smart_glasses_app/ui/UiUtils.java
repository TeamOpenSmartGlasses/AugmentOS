package com.teamopensmartglasses.example_smart_glasses_app.ui;

import android.app.Activity;

import androidx.appcompat.widget.Toolbar;

import com.teamopensmartglasses.example_smart_glasses_app.MainActivity;
import com.teamopensmartglasses.example_smart_glasses_app.R;

public class UiUtils {

    //set app bar title
    public static void setupTitle(Activity activity, String title) {
        Toolbar toolbar = (Toolbar) activity.findViewById(R.id.main_toolbar);
        ((MainActivity) activity).setSupportActionBar(toolbar);
        ((MainActivity) activity).getSupportActionBar().setTitle(title);
    }
}
