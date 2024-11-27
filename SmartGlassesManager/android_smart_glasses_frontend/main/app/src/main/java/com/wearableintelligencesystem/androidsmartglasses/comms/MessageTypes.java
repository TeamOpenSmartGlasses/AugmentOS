package com.wearableintelligencesystem.androidsmartglasses.comms;

public class MessageTypes {
    //top level
    public static final String MESSAGE_TYPE_LOCAL = "MESSAGE_TYPE_LOCAL";
    public static final String TIMESTAMP = "TIMESTAMP";

    //REFERENCE CARD VIEW
    public static final String REFERENCE_CARD_SIMPLE_VIEW = "REFERENCE_CARD_SIMPLE_VIEW";
    public static final String REFERENCE_CARD_TEXT_WALL_VIEW = "REFERENCE_CARD_TEXT_WALL_VIEW";
    public static final String REFERENCE_CARD_SIMPLE_VIEW_TITLE = "REFERENCE_CARD_SIMPLE_VIEW_TITLE";
    public static final String REFERENCE_CARD_SIMPLE_VIEW_BODY = "REFERENCE_CARD_SIMPLE_VIEW_BODY";

    public static final String REFERENCE_CARD_IMAGE_VIEW = "REFERENCE_CARD_IMAGE_VIEW";
    public static final String REFERENCE_CARD_IMAGE_VIEW_TITLE = "REFERENCE_CARD_IMAGE_VIEW_TITLE";
    public static final String REFERENCE_CARD_IMAGE_VIEW_BODY = "REFERENCE_CARD_IMAGE_VIEW_BODY";
    public static final String REFERENCE_CARD_TEXT_WALL_TEXT = "REFERENCE_CARD_TEXT_WALL_TEXT";
    public static final String REFERENCE_CARD_IMAGE_VIEW_IMG_URL = "REFERENCE_CARD_IMAGE_VIEW_IMG_URL";

    //SCROLLING TEXT VIEW
    public static final String SCROLLING_TEXT_VIEW_START = "SCROLLING_TEXT_VIEW_START";
    public static final String SCROLLING_TEXT_VIEW_FINAL = "SCROLLING_TEXT_VIEW_FINAL";
    public static final String SCROLLING_TEXT_VIEW_INTERMEDIATE = "SCROLLING_TEXT_VIEW_INTERMEDIATE";
    public static final String SCROLLING_TEXT_VIEW_TEXT = "SCROLLING_TEXT_VIEW_TEXT";
    public static final String SCROLLING_TEXT_VIEW_STOP = "SCROLLING_TEXT_VIEW_STOP";

    //DATA TYPES
    public static final String POV_IMAGE = "POV_IMAGE";
    public static final String JPG_BYTES_BASE64 = "JPG_BYTES_BASE64";

    //specific message types (after MESSAGE_TYPE_*)
    //TRANSCRIPTS
    public static final String FINAL_TRANSCRIPT = "FINAL_TRANSCRIPT";
    public static final String INTERMEDIATE_TRANSCRIPT = "INTERMEDIATE_TRANSCRIPT";
    public static final String TRANSCRIPT_TEXT = "TRANSCRIPT_TEXT";
    public static final String TRANSCRIPT_ID = "TRANSCRIPT_ID";

    //VOICE COMMANDS
    public static final String VOICE_COMMAND_RESPONSE = "VOICE_COMMAND_RESPONSE";
    public static final String COMMAND_RESULT = "COMMAND_RESULT";
    public static final String COMMAND_NAME = "COMMAND_NAME";
    public static final String COMMAND_RESPONSE_DISPLAY_STRING = "COMMAND_RESPONSE_DISPLAY_STRING";
    //voice command event
    public static final String VOICE_COMMAND_STREAM_EVENT = "VOICE_COMMAND_STREAM_EVENT";
    public static final String VOICE_COMMAND_STREAM_EVENT_TYPE = "VOICE_COMMAND_STREAM_EVENT_TYPE";
    public static final String WAKE_WORD_EVENT_TYPE = "WAKE_WORD_EVENT_TYPE";
    public static final String COMMAND_EVENT_TYPE = "COMMAND_EVENT_TYPE";
    public static final String CANCEL_EVENT_TYPE = "CANCEL_EVENT_TYPE";
    public static final String RESOLVE_EVENT_TYPE = "RESOLVE_EVENT_TYPE";
    public static final String TEXT_RESPONSE_EVENT_TYPE = "TEXT_RESPONSE_EVENT_TYPE";
    public static final String COMMAND_ARGS_EVENT_TYPE = "COMMAND_ARGS_EVENT_TYPE";
    public static final String REQUIRED_ARG_EVENT_TYPE = "REQUIRED_ARG_EVENT_TYPE";
    public static final String ARG_NAME = "ARG_NAME";
    public static final String ARG_OPTIONS = "ARG_OPTIONS";
    public static final String INPUT_VOICE_STRING = "INPUT_VOICE_STRING";
    public static final String VOICE_ARG_EXPECT_TYPE = "VOICE_ARG_EXPECT_TYPE";
    public static final String VOICE_ARG_EXPECT_NATURAL_LANGUAGE = "VOICE_ARG_EXPECT_NATURAL_LANGUAGE";
    public static final String VOICE_COMMAND_LIST = "VOICE_COMMAND_LIST";
    public static final String INPUT_WAKE_WORD = "INPUT_WAKE_WORD";
    public static final String INPUT_VOICE_COMMAND_NAME = "INPUT_VOICE_COMMAND_NAME";

    //AUTOCITER/WEARABLE-REFERENCER
    public static final String AUTOCITER_START = "AUTOCITER_START";
    public static final String AUTOCITER_STOP = "AUTOCITER_STOP";
    public static final String AUTOCITER_PHONE_NUMBER = "AUTOCITER_PHONE_NUMBER";
    public static final String AUTOCITER_POTENTIAL_REFERENCES = "AUTOCITER_POTENTIAL_REFERENCES";
    public static final String AUTOCITER_REFERENCE_DATA = "AUTOCITER_REFERENCE_DATA";

    //request user UI to display a list of possible choices to dipslay
    public static final String REFERENCE_SELECT_REQUEST = "REFERENCE_SELECT_REQUEST";
    public static final String REFERENCES = "REFERENCES";

    //FACE/PERSON SIGHTING
    public static final String FACE_SIGHTING_EVENT = "FACE_SIGHTING_EVENT";
    public static final String FACE_NAME = "FACE_NAME";

    //SMS
    public static final String SMS_REQUEST_SEND = "SMS_REQUEST_SEND";
    public static final String SMS_MESSAGE_TEXT = "SMS_MESSAGE_TEXT";
    public static final String SMS_PHONE_NUMBER = "SMS_PHONE_NUMBER";

    //AUDIO
    //AUDIO
    public static final String AUDIO_CHUNK_ENCRYPTED = "AUDIO_CHUNK_ENCRYPTED";
    public static final String AUDIO_CHUNK_DECRYPTED = "AUDIO_CHUNK_DECRYPTED";
    public static final String AUDIO_DATA = "AUDIO_DATA";


    //COMMS
    public static final String PING = "PING";

    //UI
    public static final String UI_UPDATE_ACTION = "UI_UPDATE_ACTION";
    public static final String PHONE_CONNECTION_STATUS = "PHONE_CONNECTION_STATUS";

//    //command responses to show
//    public final static String NATURAL_LANGUAGE_QUERY = "NATURAL_LANGUAGE_QUERY";
//    public final static String TEXT_RESPONSE = "NATURAL_LANGUAGE_QUERY";
//    public final static String TEXT_QUERY = "TEXT_QUERY";
//    public final static String VISUAL_SEARCH_RESULT = "VISUAL_SEARCH_RESULT";
//    public final static String VISUAL_SEARCH_QUERY = "VISUAL_SEARCH_QUERY";
//    public final static String VISUAL_SEARCH_IMAGE= "VISUAL_SEARCH_IMAGE";
//    public final static String VISUAL_SEARCH_DATA = "VISUAL_SEARCH_DATA";
//    public final static String SEARCH_ENGINE_RESULT = "SEARCH_ENGINE_RESULT";
//    public final static String SEARCH_ENGINE_RESULT_DATA = "SEARCH_ENGINE_RESULT_DATA";
//    public final static String TRANSLATION_RESULT = "TRANSLATION_RESULT";
//    public final static String AFFECTIVE_SUMMARY_RESULT = "AFFECTIVE_SUMMARY_RESULT";
//    public final static String COMMAND_SWITCH_MODE = "COMMAND_SWITCH_MODE";

    //command responses to show
    //Natural language
    public final static String NATURAL_LANGUAGE_QUERY = "NATURAL_LANGUAGE_QUERY";
    public final static String TEXT_QUERY = "TEXT_QUERY";
    //visual search
    public final static String VISUAL_SEARCH_RESULT = "VISUAL_SEARCH_RESULT"; //this is the ASG facing term
    public final static String VISUAL_SEARCH_IMAGE= "VISUAL_SEARCH_IMAGE";
    public final static String VISUAL_SEARCH_QUERY = "VISUAL_SEARCH_QUERY"; //this is the glbox facing term
    public final static String VISUAL_SEARCH_DATA = "VISUAL_SEARCH_DATA"; //this is the payload
    //search engine
    public final static String SEARCH_ENGINE_QUERY = "SEARCH_ENGINE_QUERY";
    public final static String SEARCH_ENGINE_RESULT = "SEARCH_ENGINE_RESULT";
    public final static String SEARCH_ENGINE_RESULT_DATA = "SEARCH_ENGINE_RESULT_DATA";

    //I/O
    public final static String SG_TOUCHPAD_EVENT = "SG_TOUCHPAD_EVENT";
    public final static String SG_TOUCHPAD_KEYCODE = "SG_TOUCHPAD_KEYCODE";

    //translation
    public final static String TRANSLATE_TEXT_QUERY = "TRANSLATE_TEXT_QUERY";
    public final static String TRANSLATE_TEXT_DATA = "TRANSLATE_TEXT_DATA";
    public final static String TRANSLATE_TEXT_RESULT = "TRANSLATE_TEXT_RESULT";
    public final static String TRANSLATE_TEXT_RESULT_DATA = "TRANSLATION_RESULT_DATA";

    //object translation
    public final static String OBJECT_TRANSLATION_RESULT = "OBJECT_TRANSLATION_RESULT";
    public final static String OBJECT_TRANSLATION_RESULT_DATA = "OBJECT_TRANSLATION_RESULT_DATA";

    public final static String AFFECTIVE_SUMMARY_RESULT = "AFFECTIVE_SUMMARY_RESULT";
    public final static String COMMAND_SWITCH_MODE = "COMMAND_SWITCH_MODE";

    //control the current mode of the ASG
    public final static String ACTION_SWITCH_MODES = "ACTION_SWITCH_MODES";
    public final static String NEW_MODE = "NEW_MODE";
    public final static String MODE_VISUAL_SEARCH = "MODE_VISUAL_SEARCH";
    public final static String MODE_LIVE_LIFE_CAPTIONS = "MODE_LIVE_LIFE_CAPTIONS";
    public final static String MODE_HOME = "MODE_HOME";
    public final static String MODE_CONVERSATION_MODE = "MODE_CONVERSATION_MODE";
    public final static String MODE_SOCIAL_MODE = "MODE_SOCIAL_MODE";
    public final static String MODE_REFERENCE_GRID = "MODE_REFERENCE_GRID";
    public final static String MODE_WEARABLE_FACE_RECOGNIZER = "MODE_WEARABLE_FACE_RECOGNIZER";
    public final static String MODE_LANGUAGE_TRANSLATE = "MODE_LANGUAGE_TRANSLATE";
    public final static String MODE_OBJECT_TRANSLATE = "MODE_OBJECT_TRANSLATE";
    public final static String MODE_TEXT_LIST = "MODE_TEXT_LIST";
    public final static String MODE_TEXT_BLOCK = "MODE_TEXT_BLOCK";
    public final static String MODE_BLANK = "MODE_BLANK";
    public final static String MODE_SEARCH_ENGINE_RESULT = "MODE_SEARCH_ENGINE_RESULT";

}


