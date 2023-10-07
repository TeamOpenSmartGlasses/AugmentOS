import numpy as np

CUSTOM_TOKENIZER = True
EMBEDDING_DIMENSIONS = [50, 100, 200, 300][0]


class Embedder:

    def __init__(self, model_path):
        self.model_path = model_path
        self.embeddings_dict = {}
        self.load_all_embeddings()

    def load_all_embeddings(self):

        with open(self.model_path, 'r', encoding="utf-8") as f:

            for line in f:
                values = line.split()
                word = values[0]
                vector = np.asarray(values[1:], "float32")
                self.embeddings_dict[word] = vector

    def embed_word(self, word):
        return self.embeddings_dict[word]

    def embed_sentence(self, sentence):
        return [self.embed_word(word) for word in sentence]

    def update_embeddings(self, update_dict):
        for word, value in update_dict.items():
            self.embeddings_dict[word] = value
