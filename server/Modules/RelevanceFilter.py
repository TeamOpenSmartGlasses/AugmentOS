class RelevanceFilter:
    def __init__(self, databaseHandler):
        self.databaseHandler = databaseHandler
        self.blah = "1"

    def shouldRunForText(self, userId, text):
        return True
        shouldRun = True

        # Required as per: https://tinyurl.com/obscurePythonErrors
        print("relevance filter doing relevance filter things")
        termsDefinedInLastFiveMinutes = self.databaseHandler.getDefinedTermsFromLastNSecondsForUserDevice(
            userId)
        for term in termsDefinedInLastFiveMinutes:
            if term['name'] == text:
                print("BLOCKING TERM '{}': DEFINED TOO RECENTLY".format(text))
                shouldRun = False
        return shouldRun
