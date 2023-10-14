class RelevanceFilter:
    def __init__(self, db_handler):
        self.db_handler = db_handler
        self.banned_terms = ["LOL", "AI", "Caden Pierce", "Alex Israel", "Professor", "God", "Jesus", "Google", "David Newman", "Patty"]

    def should_run_for_text(self, user_id, text):
        should_run = True

        terms_defined_in_last_nseconds = self.db_handler.get_defined_terms_from_last_nseconds_for_user_device(user_id, n=90)
        for term in terms_defined_in_last_nseconds:
            if term in self.banned_terms:
                return False
            if term['name'] == text:
                print("BLOCKING TERM '{}': DEFINED TOO RECENTLY".format(text))
                should_run = False
        return should_run
