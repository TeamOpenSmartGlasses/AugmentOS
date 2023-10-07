import nltk
from nltk.tokenize import word_tokenize, MWETokenizer

from string import punctuation

#nltk.download('stopwords')


class Tokenizer:

    def __init__(self):
        self.stop_words = set(nltk.corpus.stopwords.words('english'))
        self.tokenizer = MWETokenizer()

    def tokenize(self, text, max_length=-1):
        tokens = [token.lower() for token in self.tokenizer.tokenize(word_tokenize(
            text)) if token not in punctuation and token.lower() not in self.stop_words]

        if max_length != -1:  # Skip padding
            # Padding to max_length
            tokens.extend(['<PAD>'] * (max_length - len(tokens)))

        return tokens
