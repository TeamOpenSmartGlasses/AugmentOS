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

public class LiveLifeCaptionsUi extends Fragment {
    private  final String TAG = "WearableAi_LiveLifeCaptionsUIFragment";

    private final String fragmentLabel = "LiveLifeCaptions";

    private NavController navController;

    //live life captions ui
    ArrayList<Spanned> textHolder = new ArrayList<>();
    int textHolderSizeLimit = 20; // how many lines maximum in the text holder
    TextView liveLifeCaptionsText;

    boolean currentlyScrolling = false;

    long lastIntermediateMillis = 0;
    long intermediateTranscriptPeriod = 40; //milliseconds

    public LiveLifeCaptionsUi() {
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        return inflater.inflate(R.layout.live_life_caption_text, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        liveLifeCaptionsText = (TextView) view.findViewById(R.id.livelifecaptionstextview);
        liveLifeCaptionsText.setMovementMethod(new ScrollingMovementMethod());
        liveLifeCaptionsText.setText(getCurrentTranscriptScrollText());

        liveLifeCaptionsText.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {

            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                UiUtils.scrollToBottom(liveLifeCaptionsText);
            }

            @Override
            public void afterTextChanged(Editable s) {

            }
        });

        liveLifeCaptionsText.setText(getCurrentTranscriptScrollText());
        UiUtils.scrollToBottom(liveLifeCaptionsText);
        //navController = Navigation.findNavController(getActivity(), R.id.nav_host_fragment);
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
            Log.d(TAG, "LLC called");
            Log.d(TAG, intent.toString());
            String action = intent.getAction();
            if (action.equals(MessageTypes.SCROLLING_TEXT_VIEW_FINAL)) {
                try {
                    String transcript = intent.getStringExtra(MessageTypes.SCROLLING_TEXT_VIEW_TEXT);
//                    JSONObject transcript_object = new JSONObject(intent.getStringExtra(GlboxClientSocket.FINAL_REGULAR_TRANSCRIPT));
////                        JSONObject nlp = transcript_object.getJSONObject("nlp");
////                        JSONArray nouns = nlp.getJSONArray("nouns");
                    JSONArray nouns = new JSONArray(); //for now, since we haven't implemented NLP on ASP, we just make this empty
//                    String transcript = transcript_object.getString(MessageTypes.SCROLLING_TEXT_VIEW_TEXT);
                    if ((nouns.length() == 0)) {
                        textHolder.add(Html.fromHtml("<p>" + transcript.trim() + "</p>"));
                    } else {
                        //add text to a string and highlight properly the things we want to highlight (e.g. proper nouns)
                        String textBuilder = "<p>";
                        int prev_end = 0;
                        for (int i = 0; i < nouns.length(); i++) {
                            String noun = nouns.getJSONObject(i).getString("noun");
                            int start = nouns.getJSONObject(i).getInt("start");
                            int end = nouns.getJSONObject(i).getInt("end");

                            //dont' drop the words before the first noun
                            if (i == 0) {
                                textBuilder = textBuilder + transcript.substring(0, start);
                            } else { //add in the transcript between previous noun and this one
                                textBuilder = textBuilder + transcript.substring(prev_end, start);
                            }

                            //add in current colored noun
                            textBuilder = textBuilder + "<font color='#00FF00'><u>" + transcript.substring(start, end) + "</u></font>";

                            //add in end of transcript if we just added the last noun
                            if (i == (nouns.length() - 1)) {
                                textBuilder = textBuilder + transcript.substring(end);
                            }

                            //set this noun end to be the previous noun end for next loop
                            prev_end = end;
                        }
                        textBuilder = textBuilder + "</p>";
                        textHolder.add(Html.fromHtml(textBuilder));
                    }
                    liveLifeCaptionsText.setText(getCurrentTranscriptScrollText());
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            } else if (action.equals(MessageTypes.SCROLLING_TEXT_VIEW_INTERMEDIATE)) {
                        //only update this transcript if it's been n milliseconds since the last intermediate update
                        if ((System.currentTimeMillis() - lastIntermediateMillis) > intermediateTranscriptPeriod) {
                            lastIntermediateMillis = System.currentTimeMillis();
                            String intermediate_transcript = intent.getStringExtra(MessageTypes.SCROLLING_TEXT_VIEW_TEXT);
                            liveLifeCaptionsText.setText(TextUtils.concat(getCurrentTranscriptScrollText(), Html.fromHtml("<p>" + intermediate_transcript.trim() + "</p>")));
                        }
            } else if (intent.hasExtra(GlboxClientSocket.COMMAND_RESPONSE)) {
                        String command_response_text = intent.getStringExtra(GlboxClientSocket.COMMAND_RESPONSE);
                        //change newlines to <br/>
                        command_response_text = command_response_text.replaceAll("\n", "<br/>");
                        textHolder.add(Html.fromHtml("<p><font color='#00CC00'>" + command_response_text.trim() + "</font></p>"));
                        liveLifeCaptionsText.setText(getCurrentTranscriptScrollText());
            } else {
                Log.d(TAG, "GOT SOMETHING ELSE");
            }

        }
    };

    private static IntentFilter makeComputeUpdateIntentFilter() {
        final IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(ASPClientSocket.ACTION_RECEIVE_MESSAGE);
        intentFilter.addAction(GlboxClientSocket.ACTION_RECEIVE_TEXT);
        intentFilter.addAction(MessageTypes.REFERENCE_SELECT_REQUEST);
        intentFilter.addAction(MessageTypes.SCROLLING_TEXT_VIEW_FINAL);
        intentFilter.addAction(MessageTypes.SCROLLING_TEXT_VIEW_INTERMEDIATE);

        return intentFilter;
    }

    private Spanned getCurrentTranscriptScrollText() {
        Spanned current_transcript_scroll = Html.fromHtml("<div></div>");
        //limit textHolder to our maximum size
        while ((textHolder.size() - textHolderSizeLimit) > 0){
            textHolder.remove(0);
        }
        for (int i = 0; i < textHolder.size(); i++) {
            //current_transcript_scroll = current_transcript_scroll + textHolder.get(i) + "\n" + "\n";
            if (i == 0) {
                current_transcript_scroll = textHolder.get(i);
            } else {
                current_transcript_scroll = (Spanned) TextUtils.concat(current_transcript_scroll, textHolder.get(i));
            }
        }
        return current_transcript_scroll;
    }

}
