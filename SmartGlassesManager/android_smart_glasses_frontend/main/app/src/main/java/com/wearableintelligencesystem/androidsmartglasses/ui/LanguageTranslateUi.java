package com.wearableintelligencesystem.androidsmartglasses.ui;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.os.Message;
import android.text.Editable;
import android.text.Html;
import android.text.Spanned;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.text.method.ScrollingMovementMethod;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.navigation.NavController;

import com.wearableintelligencesystem.androidsmartglasses.R;
import com.wearableintelligencesystem.androidsmartglasses.ASPClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.archive.GlboxClientSocket;
import com.wearableintelligencesystem.androidsmartglasses.comms.MessageTypes;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

public class LanguageTranslateUi extends Fragment {
    private  final String TAG = "WearableAi_LanguageTranslateUIFragment";

    private final String fragmentLabel = "Language Translate";


    //translate ui
    ArrayList<Spanned> translateTextHolder = new ArrayList<>();
    int translateTextHolderSizeLimit = 10; // how many lines maximum in the text holder
    TextView translateText;

    //scroll logic
    boolean currentlyScrolling = false;

    //update transcript logic
    long lastIntermediateMillis = 0;
    long intermediateTranscriptPeriod = 40; //milliseconds

    public LanguageTranslateUi() {
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        return inflater.inflate(R.layout.translate_mode_view, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        //live life captions mode gui setup
        translateText = (TextView) getActivity().findViewById(R.id.translatetextview);
        translateText.setMovementMethod(new ScrollingMovementMethod());
        translateText.setText(getCurrentTranslateScrollText());

        translateText.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {

            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                scrollToBottom(translateText);
            }

            @Override
            public void afterTextChanged(Editable s) {

            }
        });
        translateText.setText(getCurrentTranslateScrollText());
        scrollToBottom(translateText);
    }

    @Override
    public void onResume(){
        super.onResume();
        getActivity().registerReceiver(llcReceiver, makeComputeUpdateIntentFilter());
    }

    @Override
    public void onPause(){
        super.onPause();
        getActivity().unregisterReceiver(llcReceiver);
    }

    private BroadcastReceiver llcReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            final String action = intent.getAction();
            if (MessageTypes.TRANSLATE_TEXT_RESULT.equals(action)) {
                try {
                    JSONObject data = new JSONObject(intent.getStringExtra(ASPClientSocket.RAW_MESSAGE_JSON_STRING));
                    String translatedTextString = data.getString(MessageTypes.TRANSLATE_TEXT_RESULT_DATA);
                    updateTranslatedText(translatedTextString);
                } catch (JSONException e){
                    e.printStackTrace();
                }
            }
        }
    };

    private static IntentFilter makeComputeUpdateIntentFilter() {
        final IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(MessageTypes.TRANSLATE_TEXT_RESULT);

        return intentFilter;
    }

    private void scrollToBottom(TextView tv) {
        if (!currentlyScrolling) {
            tv.post(new Runnable() {
                @Override
                public void run() {
                    currentlyScrolling = true;
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
                    currentlyScrolling = false;
                }
            });
        }
    }

    private Spanned getCurrentTranslateScrollText() {
        Spanned current_translate_scroll = Html.fromHtml("<div></div>");
        //limit textHolder to our maximum size
        while ((translateTextHolder.size() - translateTextHolderSizeLimit) > 0){
            translateTextHolder.remove(0);
        }
        for (int i = 0; i < translateTextHolder.size(); i++) {
            //current_transcript_scroll = current_transcript_scroll + textHolder.get(i) + "\n" + "\n";
            if (i == 0) {
                current_translate_scroll = translateTextHolder.get(i);
            } else {
                current_translate_scroll = (Spanned) TextUtils.concat(current_translate_scroll, translateTextHolder.get(i));
            }
        }
        return current_translate_scroll;
    }


    private void updateTranslatedText(String translationResultString){
        translateTextHolder.add(Html.fromHtml("<p>" + translationResultString + "</p>"));
        translateText.setText(getCurrentTranslateScrollText());
    }

}

