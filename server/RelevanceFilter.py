class RelevanceFilter:
    def __init__(self, databaseHandler):
        self.databaseHandler = databaseHandler
        self.blah = "1"

    def shouldRunForText(self, userId, deviceId, text):
        shouldRun = True

        # Required as per: https://tinyurl.com/obscurePythonErrors
        print("relevance filter doing relevance filter things")
        termsDefinedInLastFiveMinutes = self.databaseHandler.getDefinedTermsFromLastNMinutesForUserDevice(userId, deviceId)
        for term in termsDefinedInLastFiveMinutes:
            # print("term from last 5 min:" + term['name'] + " ... meanwhile, text: " + text)
            if term['name'] == text:
                shouldRun = False
        return shouldRun