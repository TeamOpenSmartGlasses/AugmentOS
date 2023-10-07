class RelevanceFilter:
    def __init__(self, db_handler):
        self.db_handler = db_handler
        self.banned_terms = ["LOL", "AI", "Caden Pierce", "Alex Israel"]

    def shouldRunForText(self, userId, text):
        shouldRun = True

        termsDefinedInLastNSeconds = self.databaseHandler.getDefinedTermsFromLastNSecondsForUserDevice(userId, n=90)
        for term in termsDefinedInLastNSeconds:
            if term in self.banned_terms:
                return False
            if term['name'] == text:
                print("BLOCKING TERM '{}': DEFINED TOO RECENTLY".format(text))
                shouldRun = False
        return shouldRun
