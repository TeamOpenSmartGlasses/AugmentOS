import json
import openai

# from server.Prompts.relevance_filter_prompt import relevance_filter_prompt

relevance_filter_prompt = (
    lambda context, entity: f"""
You are a subsystem of the conversational agent called "Convoscope". "Convoscope" listens to a user's live conversations and tries to help them achieve their goals by providing them with "Insights".

[Your Objective]
You are the "Definitions Relevance Filter" subsystem of "Convoscope". Other subsystems in "Convoscope" listen to the live conversation transcript and attempt to define any entity (person, place, thing, event, etc.) that is mentioned. Your primary role is to decide if these entity definitions are worth displaying to the user during their conversation. You will do so by receiving a list of entities, and providing an "Entity Score" between 1 and 10. A low score indicates the entity is not worth showing the user. A high score indicates that the entity should likely be shown to the user.

Entities should receive higher scores if:
- they are rare and it is thus likely that someone in the conversation doesn't know about that entity
- some information in the entity's definition will help make the conversation better
- it seems like the interlocutors wish to receive more information about that entity

Entities should receive lower scores if:
- they are common and it is thus likely that someone in the conversation already knows about that entity
- some information in the entity's definition will not improve the conversation

You will receive many false positives and thus most "Entity Scores" will be low. You should only provide a high score if you are confident that the entity is worth showing to the user.

[Definitions]
- "Insights": Intelligent analysis, ideas, arguments, questions to ask, and deeper insights that will help the user achieve their goals in a conversation. Insights will often lead the user to deeper understanding, broader perspective, new ideas, and better replies.
- "Entity Score": The score for the usefulness of an entity definition in the given context. A low score indicates the entity is not worth showing the user. A high score indicates that the entity should likely be shown to the user.
- "Context": The last few minutes of the conversation in a single string.

[Examples of "Entity Score"]
These examples will guide you in determining when an entity is pertinent or not in the given context:

[Input]
1. Context: the last few minutes of the conversation in a single string.
2. Entity definitions, a list of entity definitions like this:
{{ 
    "entity 1 name" : "entity 1 definition",
    "entity 2 name" : "entity 2 definition",
    ...
    "entity n name" : "entity n definition",
}}

[Output]
A list of "Entity Scores", formatted like this:
{{
    "entity 1 name" : <single integer "Entity Score">,
    "entity 2 name" : <single integer "Entity Score">,
    ...
    "entity n name" : <single integer "Entity Score">,
}}

<Context>{context}<Context>
<Entity>{entity}<Entity>

Only output the JSON entity score list, nothing else!
"""
)


class RelevanceFilter:
    def __init__(self, databaseHandler):
        self.databaseHandler = databaseHandler
        self.banned_terms = ["LOL", "AI", "Caden Pierce", "Alex Israel"]

    def should_display_result_based_on_context(self, userId, cse_outputs, context):
        valid_outputs = []
        
        terms_defined_in_last_n_seconds = self.databaseHandler.getDefinedTermsFromLastNSecondsForUserDevice(
            userId, n=90
        )

        # print(f"===========================CONTEXT: {context}==============================")
        # print(f"===========================TERMS DEFINED IN LAST N SECONDS: {terms_defined_in_last_n_seconds}==============================")
        # print(f"===========================CSE OUTPUTS: {cse_outputs}==============================")

        # Collect all banned terms from the last N seconds and the predefined banned terms
        terms_to_filter = [
            term["name"] for term in terms_defined_in_last_n_seconds
        ] + self.banned_terms

        # Filter the cse_outputs based on the combined banned terms
        cse_outputs_filtered = [
            cse_output
            for cse_output in cse_outputs
            if cse_output["name"] not in terms_to_filter
        ]


        # print(f"===========================ENTITIES: {cse_outputs_filtered}==============================")
        entities_filtered = self.llm_relevance_filter(cse_outputs_filtered, context)
        try:
            data_dict = json.loads(entities_filtered)
            print(f"===========================ENTITIES FILTERED: {str(data_dict)}==============================")
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
        else:
            print("Successfully parsed the JSON string.")
        # print(f"===========================ENTITIES FILTERED: {str(entities_filtered)}==============================")

        # valid_outputs.extend(entities_filtered)

        return entities_filtered

    def llm_relevance_filter(self, entities, context):

        llm_entities_input = dict()
        for entity in entities:
            llm_entities_input[entity["name"]] = entity["summary"]
 
        # Combine context and result for input
        input_text = relevance_filter_prompt(context, str(llm_entities_input))

        print(f"===========================LLM INPUT: {input_text}==============================")
        response = self.get_gpt_reponse(input_text)

        print(f"===========================LLM PREDICTION: {response}==============================")
        return response

    def get_gpt_reponse(self, prompt, model="gpt-3.5-turbo"):
        messages = [{"role": "user", "content": prompt}]
        response = openai.ChatCompletion.create(
            model=model,
            messages=messages,
            max_tokens=1000,
        )

        return response.choices[0].message["content"]


# if __name__ == "__main__":
#     relevance_filter = RelevanceFilter(None)
#     relevance_filter.llm_relevance_filter([{"name":"fdsfds", "summary":"fdsfds"}, {"name":"fdsfds", "summary":"fdsfds"}], "fdsf")
