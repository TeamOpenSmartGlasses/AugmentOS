package com.wearableintelligencesystem.androidsmartglasses.ui;

import android.widget.TextView;

public class UiUtils {
    public static void scrollToBottom(TextView tv) {
            tv.post(new Runnable() {
                @Override
                public void run() {
                    int lc = tv.getLineCount();
                    if (lc == 0) {
                        return;
                    }
                    tv.scrollTo(0, tv.getBottom());
                    int scrollAmount = tv.getLayout().getLineTop(lc) - tv.getHeight();
                    // if there is no need to scroll, scrollAmount will be <=0
                    if (scrollAmount > 0)
                        tv.scrollTo(0, scrollAmount);
                    else
                        tv.scrollTo(0, 0);
                }
            });
        }
}
