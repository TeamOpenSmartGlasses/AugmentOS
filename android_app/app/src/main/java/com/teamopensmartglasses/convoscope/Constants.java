package com.teamopensmartglasses.convoscope;

public class Constants {
    public static String appName = "Convoscope";
    public static String glassesCardTitle = "";
    public static String cseResultKey = "result";
    public static String proactiveAgentResultsKey = "results_proactive_agent_insights";
    public static String explicitAgentQueriesKey = "explicit_insight_queries";
    public static String explicitAgentResultsKey = "explicit_insight_results";
    public static String wakeWordTimeKey = "wake_word_time";
    public static String entityDefinitionsKey = "entity_definitions";
    public static String languageLearningKey = "language_learning_results";

    //endpoints
    public static final String LLM_QUERY_ENDPOINT = "/chat";
    public static final String BUTTON_EVENT_ENDPOINT = "/button_event";
    public static final String CSE_ENDPOINT = "/ui_poll";
    public static final String SET_USER_SETTINGS_ENDPOINT = "/set_user_settings";
}


