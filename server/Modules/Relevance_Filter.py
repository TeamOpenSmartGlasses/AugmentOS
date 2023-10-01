from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
import torch

# from server.Prompts.relevance_filter_prompt import relevance_filter_prompt

relevance_filter_prompt = (
    lambda context, entity: f"""
I require your expertise for a task. To assist you, I'll present a scenario containing custom definitions, your main objective, the structure of the input, and the final task.

<Scenario start>
[Definitions]
- "Entity Relevance": Determining if a particular entity needs further clarification or definition in the context of a conversation.
- "Convoscope": a tool that listens to a user's live conversation and aids the user by deciding if real-time "Entity Definitions" are required.

[Your Objective]
You are part of "Convoscope". Your primary role is to decide if an entity from the live transcription stream of an ongoing conversation requires definition.

[Examples of "Entity Relevance"]
These examples will guide you in determining when an entity is pertinent or not in the given context:

1) User Conversation: "I've started practicing mindfulness through Vipassana."
   "Entity": Vipassana
   "Relevance": YES

2) User Conversation: "I love the new movie by Christopher Nolan."
   "Entity": Christopher Nolan
   "Relevance": NO

3) User Conversation: "Quantum computing might revolutionize the tech world."
   "Entity": Quantum computing
   "Relevance": YES

4) User Conversation: "I enjoy the fresh breeze during my morning walks."
   "Entity": Morning walks
   "Relevance": NO

5) User Conversation: "The new dessert shop downtown offers the best tiramisu."
   "Entity": Tiramisu
   "Relevance": YES

6) User Conversation: "I usually take the subway to work."
   "Entity": Subway
   "Relevance": NO

<Task start>
Given the context and entity, your task is to determine whether the entity is relevant in that context and requires a definition.

Output:
- If the entity doesn't require a definition in the context, simply output "NO".
- If the entity requires a definition, output "YES".
<Task end>

<Context>{context}<Context>
<Entity>{entity}<Entity>

Considering the context and entity, does the entity require a definition? If yes, state "YES". If no, state "NO".
<Task end>
<Scenario end>
"""
)


class Relevance_Filter:
    def __init__(self, database_handler):
        self.databaseHandler = database_handler
        self.banned_terms = ["LOL", "AI", "Caden Pierce", "Alex Israel"]

        self.tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")
        self.model = DistilBertForSequenceClassification.from_pretrained(
            "distilbert-base-uncased"
        )

    def should_display_result_based_on_context(self, userId, cse_outputs, context):
        valid_outputs = []

        terms_defined_in_last_n_seconds = self.databaseHandler.get_defined_terms_from_last_n_seconds_for_user_device(
            userId, n=90
        )

        # Collect all banned terms from the last N seconds and the predefined banned terms
        banned_terms_combined = [
            term["name"] for term in terms_defined_in_last_n_seconds
        ] + self.banned_terms

        # Filter the cse_outputs based on the combined banned terms
        cse_outputs_filtered = [
            cse_output
            for cse_output in cse_outputs
            if cse_output not in banned_terms_combined
        ]

        for cse_output_filtered in cse_outputs_filtered:
            if not self.consult_LLM(cse_output_filtered, context):
                print(f"BLOCKING TERM '{cse_output_filtered['name']}': NOT RELEVANT")
                continue

            valid_outputs.append(cse_output_filtered)

        return valid_outputs

    def consult_LLM(self, entity, context):

        # Combine context and result for input
        input_text = relevance_filter_prompt(context, entity)
        inputs = self.tokenizer(
            input_text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=512,
        )

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            predictions = torch.argmax(logits, dim=1)

        if predictions[0].item() == "NO":
            entity = None

        return entity
