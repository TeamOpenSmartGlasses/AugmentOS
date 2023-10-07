from nltk.corpus import wordnet
import re
# from google.cloud import aiplatform
import openai

import requests
from bs4 import BeautifulSoup

import wikipediaapi

from nltk.corpus import wordnet
from sklearn.metrics.pairwise import cosine_similarity
from Modules.Tokenizer import Tokenizer
from Modules.Embedder import Embedder

CUSTOM_TOKENIZER = True
EMBEDDING_DIMENSIONS = [50, 100, 200, 300][0]

# load index
def load_word_def_index():
    print("Loading word definitions index...")
    syns = wordnet.synsets("dog")  # run once to build index
    print("--- Word definitions index loaded.")


def get_jargon_definition(term):
    wiki_wiki = wikipediaapi.Wikipedia('MyProjectName (joe@example.com)', 'en')

    page = wiki_wiki.page(term)
    if page.exists():
        return page.summary
    else:
        return None


banned_acronyms = ["NER", "SCSC", "CSE", "CSC", "OUR", "MY", "DOG"]


def define_acronym(acronym):
    if acronym in banned_acronyms:
        return None

    # Send a GET request to the webpage
    url = f"https://www.acronymfinder.com/{acronym}.html"
    response = requests.get(url)

    # Create a BeautifulSoup object to parse the HTML content
    soup = BeautifulSoup(response.content, 'html.parser')

    # Find the definition element on the page
    definition_element = soup.find(class_="result-list")

    # Extract the meaning from the page
    try:
        definitions = definition_element.text.strip()
    except (AttributeError, requests.exceptions.ConnectionError):
        return None

    # Get the first meaning
    definition = definitions.split("\n")[1][len(acronym):]

    if not definition:
        return None

    # Print the meaning
    return {acronym: definition}


def define_word(word, context):
    print("defining word: '{}' with context '{}'".format(word, context))
    if " " in word:
        definition = get_jargon_definition(word.replace(" ", "_"))

    else:
        # lookup the word
        syns = wordnet.synsets(word.lower())

        definitions = [syn.definition() for syn in syns]
        if not definitions:
            # if it's not a word, define it an acronym
            # definition = define_acronym(word)
            # word = word.upper()
            print("Definition unknown for: {}".format(word))
            return None

        definition = word_sense_disambiguation(
            context=context, sentences=definitions)

    return {word: definition}


def average_embedding(words, embedder):
    embeddings = [embedder.embed_word(
        word) for word in words if word in embedder.embeddings_dict]
    if len(embeddings) == 0:
        print("\n\n\nERROR. WORDS: ")
        print(words)
        return -1
    return sum(embeddings) / len(embeddings)


tokenizer = Tokenizer()
embedder = Embedder(
    model_path=f"./glove.6B/glove.6B.{EMBEDDING_DIMENSIONS}d.txt")


def word_sense_disambiguation(context, sentences):

    context_words = tokenizer.tokenize(
        context, max_length=20) if CUSTOM_TOKENIZER else context.split()
    context_embedding = average_embedding(context_words, embedder)

    max_similarity = -1
    predicted_meaning = None

    for sentence in sentences:
        try:
            sentence_words = tokenizer.tokenize(
                sentence, max_length=20) if CUSTOM_TOKENIZER else sentence.split()
            sentence_embedding = average_embedding(sentence_words, embedder)
            similarity = cosine_similarity(context_embedding.reshape(
                1, -1), sentence_embedding.reshape(1, -1))

            if similarity > max_similarity:
                max_similarity = similarity
                predicted_meaning = sentence
        except Exception as e:
            print(e)
            predicted_meaning = sentence
    return predicted_meaning


def shorten_definition(definition, max_length=46, max_defs=2):
    # parse by ";" which seperates seperate definitions
    word = list(definition.keys())[0]
    definition_list = list(definition.values())[0].split(";")

    # cut out everything in parantheses
    definition_list = [re.sub("[\(\[].*?[\)\]]", "", d).strip()
                       for d in definition_list]

    # grab other definitions
    new_definition = definition_list[0]
    for i in definition_list[1:max_defs]:
        if (len(new_definition) + len(i)) > max_length:
            break
        if i == " ":
            break
        new_definition += ";" + i

    return {word: new_definition}


def benchmark_summarizations(definition):
    timings = {}
    openAiModels = ["text"]
    vertexAiModels = []

    prompt = summarize_prompt_template(definition)

    response = openai.Completion.create(
        model="text-davinci-003",
        prompt=prompt
    )
    pass


def summarize_prompt_template(definition):
    return f"Please summarize the following entity definition into 20 words or less\n [Definition]{definition}"
