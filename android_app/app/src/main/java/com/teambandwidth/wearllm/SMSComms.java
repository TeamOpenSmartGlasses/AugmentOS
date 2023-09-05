package com.teambandwidth.wearllm;

import android.provider.Telephony;
import android.telephony.SmsManager;
import android.util.Log;

import java.util.ArrayList;

public class SMSComms {

    private final String TAG = "DiscussPlusPlus_SMSComms";
    private static SmsManager sm;

    private static SMSComms myself;

    public SMSComms(){
        sm = SmsManager.getDefault();
    }

    public static SMSComms getInstance(){
        if (myself == null){
            myself = new SMSComms();
        }
        return myself;
    }

    // https://stackoverflow.com/questions/6361428/how-can-i-send-sms-messages-in-the-background-using-android
    public void sendSms(String phoneNumber, String message){

        //Put in Runnable to avoid being run by SGMLib (has no SMS perms)
        class SmsLinker implements Runnable {
            public void run() {
                //send a text message
                Log.d(TAG, "Sending SMS");
                Log.d(TAG, "-- number: " + phoneNumber);
                Log.d(TAG, "-- message: " + message);

                //below, we break up the message if it's greater than 160 chars
                if (message.length() < 160){
                    sm.sendTextMessage(phoneNumber, null, message, null, null);
                } else {
                    try {
                        ArrayList<String> mSMSMessage = sm.divideMessage(message);
//                for (int i = 0; i < mSMSMessage.size(); i++) {
//                    sentPendingIntents.add(i, sentPI);
//                    deliveredPendingIntents.add(i, deliveredPI);
//                }
                        sm.sendMultipartTextMessage(phoneNumber, null, mSMSMessage, null, null);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }}
        new Thread(new SmsLinker()).start();
    }
}
