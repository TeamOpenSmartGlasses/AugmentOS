from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
import torch


class Relevance_Filter:
    def __init__(self, database_handler):
        self.databaseHandler = database_handler
        self.banned_terms = ["LOL", "AI", "Caden Pierce", "Alex Israel"]

        self.tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")
        self.model = DistilBertForSequenceClassification.from_pretrained(
            "distilbert-base-uncased"
        )

    def should_run_for_text(self, userId, text, context):
        should_run = True

        terms_defined_in_last_n_seconds = self.databaseHandler.get_defined_terms_from_last_n_seconds_for_user_device(
            userId, n=90
        )

        for term in terms_defined_in_last_n_seconds:
            if term in self.banned_terms:
                return False

            if term["name"] == text:
                print("BLOCKING TERM '{}': DEFINED TOO RECENTLY".format(text))
                should_run = False

        return should_run

    def consult_LLM(self, context, results):
        filtered_results = []

        for result in results:
            # Combine context and result for input
            input_text = context + " " + result
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

            # If model predicts "show" (assuming label 1 is "show")
            if predictions[0].item() == 1:
                filtered_results.append(result)

        return filtered_results
