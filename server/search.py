#from datasets import load_dataset
import os
import sys

from txtai.embeddings import Embeddings
from txtai.pipeline import Similarity

import pandas as pd

import time

# Load embeddings
print("Loading embeddings...")
embeddings = Embeddings({"path": "sentence-transformers/paraphrase-MiniLM-L3-v2", "content": True})

embeddings.load("updated_embeddings/custom_data_embeddings.txtai")
# embeddings_folder = sys.argv[1] if len(sys.argv) > 1 else "current_wikipedia_title_embedding_articletext_numero_100000000_time_1664722315.257419.txtai"
# embeddings.load(embeddings_folder)
dir(embeddings)
print("Embeddings loaded.")

# Create similarity instance for re-ranking
# similarity = Similarity("valhalla/distilbart-mnli-12-3")

def search(query):
  return [(result["score"], result["text"]) for result in embeddings.search(query, limit=5)]

def ranksearch(query):
  results = [text for _, text in search(query)]
  return [(score, results[x]) for x, score in similarity(query, results)]

# queries = ["what a wonderful world", "Steve Jobs", "Donald Trump", "vietnam big war in the 60s", "hippy music festival 1969 woodstock", "opposite of day", "dog", "Voltage divider"]
# queries = ["zen and the art of motorcycle maintenance", "USA", "founder of dell", "founder of tesla", "divide a potential difference", "most common keyboard layout", "glass bottle of beer", "laptop"]
# queries = ["Rocket engine", "Personal computer", "Dog"]
# queries = ["and in regenerative medicine when you're trying", "you're working with agential material", "it's a very platonic notion that if the machine", "embyrogenesis is the process of building an entire human from a single cell", "xenobots", "wild type genes", "Regenerative medicine", "embyrogenesis"]
queries = ["Frustrated Total Internal Reflection"]

# Create similarity instance for re-ranking
# similarity = Similarity("valhalla/distilbart-mnli-12-3")

for query in queries:
    print("Running similiarity search.")
    print("********************8Query: {}".format(query))
    # print(ranksearch(query))
    res = embeddings.search(query, 10)

    for val in res:
        print(val)
        print("\n********")

    print("\n\n\n\n\n\n")
