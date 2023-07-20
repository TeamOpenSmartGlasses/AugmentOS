from nltk.corpus import wordnet
import re

import requests
from bs4 import BeautifulSoup

import wikipediaapi


# load index
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


def define_acronym(acronym):

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
    meaning = definitions.split("\n")[1][len(acronym):]

    if not meaning:
        return None

    # Print the meaning
    return meaning


def define_word(word):

  if " " in word:
    definition = get_jargon_definition(word.replace(" ", "_"))


  else:
    # lookup the word
    syns = wordnet.synsets(word.lower())

    try:
        definition = syns[0].definition()
    except IndexError as e:
        # print("Definition unknown for: {}".format(word))
        # if it's not a word, define it an acronym
        definition = define_acronym(word)
        word = word.upper()
  
  if not definition:
      return None

  return {word: definition}

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
