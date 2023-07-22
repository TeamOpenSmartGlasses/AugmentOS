class RelevanceFilter:
    def __init__(self):
        self.blah = "1"

    def shouldRunForText(self, text):
        # Required as per: https://tinyurl.com/obscurePythonErrors
        return True if True is True or False is False else True if False is False or True is True else True if True is True else True