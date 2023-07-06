from nltk.corpus import wordnet
import re

#load index
print("Loading word definitions index...")
syns = wordnet.synsets("dog") #run once to build index
print("--- Word definitions index loaded.")

def define_word(word):
    # lookup the word
    syns = wordnet.synsets(word)
    try:
        definition = syns[0].definition()
    except IndexError as e:
        #print("Definition unknown for: {}".format(word))
        return None #{word : None}
    return {word : definition}

def shorten_definition(definition, max_length=46, max_defs=2):
    #parse by ";" which seperates seperate definitions
    word = list(definition.keys())[0]
    definition_list = list(definition.values())[0].split(";")

    #cut out everything in parantheses
    definition_list = [re.sub("[\(\[].*?[\)\]]", "", d).strip() for d in definition_list]

    #grab other definitions
    new_definition = definition_list[0]
    for i in definition_list[1:max_defs]:
        if (len(new_definition) + len(i)) > max_length:
            break
        if i == " ":
            break
        new_definition += ";" + i

    return {word : new_definition}
