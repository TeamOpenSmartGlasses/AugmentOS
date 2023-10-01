from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
import torch

from server.Prompts.relevance_filter_prompt import relevance_filter_prompt


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

        # Check for banned terms or recently defined terms
        for term in terms_defined_in_last_n_seconds:
            if term in self.banned_terms:
                return []
                pass

            for output in cse_outputs:
                if term["name"] == output["name"]:
                    print(f"BLOCKING TERM '{output['name']}': DEFINED TOO RECENTLY")
                    continue

                if not self.consult_LLM(context, [term["name"]]):
                    print(f"BLOCKING TERM '{output['name']}': NOT RELEVANT")

                valid_outputs.append(output)

        return valid_outputs

    def consult_LLM(self, context, results):
        filtered_results = []

        for result in results:
            # Combine context and result for input
            input_text = relevance_filter_prompt(context + " " + result)
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

            if predictions[0].item() == 1:
                filtered_results.append(result)

        return filtered_results
