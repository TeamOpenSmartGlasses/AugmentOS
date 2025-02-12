# check the frequency of all words in a list, return list of words with frequency below
# constant
import pandas as pd
from nltk.corpus import wordnet
from Modules.word_define import *
import re
import pickle

# how rare should a word be for us to consider it rare? the percentage of the line
# number needed to be considered a rare word - the higher, the more rare the word has
# to be defined
low_freq_threshold_google = 0.0922
low_freq_threshold_norvig = 0.901
google_lines = 333334

norvig_lines = 30000
low_freq_constant_google = low_freq_threshold_google * google_lines
low_freq_line_constant_norvig = low_freq_threshold_norvig * norvig_lines

word_frequency_indexes = None
df_google_word_freq = None
df_norvig_word_freq = None
idx_google_dict_word_freq = None
idx_norvig_dict_word_freq = None


def load_word_freq_indices():
    global word_frequency_indexes
    global df_google_word_freq
    global df_norvig_word_freq
    global idx_google_dict_word_freq
    global idx_norvig_dict_word_freq
    # load index
    print("Loading word frequency indexes...")
    word_frequency_indexes = pickle.load(
        open("./pickles/word_freq_indexes.pkl", "rb")
    )
    df_google_word_freq = word_frequency_indexes["google_word_freq"]
    df_norvig_word_freq = word_frequency_indexes["norvig_word_freq"]
    idx_google_dict_word_freq = word_frequency_indexes["idx_google_dict_word_freq"]
    idx_norvig_dict_word_freq = word_frequency_indexes["idx_norvig_dict_word_freq"]
    print("--- Word frequency index loaded.")
    load_word_def_index()


# we use this funny looking thing for fast string search, thanks to:
# https://stackoverflow.com/questions/44058097/optimize-a-string-query-with-pandas
# -large-data


def find_low_freq_words(words):
    low_freq_words = list()
    for word in words:
        word = word.lower()
        # find word in google
        try:
            i_word_google = idx_google_dict_word_freq[word][0]
            # print("Google score of |{} == {}|".format(word, i_word_google /
            # google_lines))
        except KeyError as e:
            # if we didn't find the word in giant google dataset, then it's rare,
            # so define it if we have it
            low_freq_words.append(word)
            continue
        # find word in norvig
        i_word_norvig = None
        try:
            i_word_norvig = idx_norvig_dict_word_freq[word][0]
            # print("Norvig score of |{} == {}|".format(word, i_word_norvig /
            # norvig_lines))
        except KeyError as e:
            # if we didn't find the word in norvig, it might not be rare (e.g. "habitual")
            print("Word '{}' not found in norvig word frequency database.".format(word))
        if i_word_google > low_freq_constant_google:
            low_freq_words.append(word)
            continue
        elif (i_word_norvig is not None) and (i_word_norvig > low_freq_line_constant_norvig):
            low_freq_words.append(word)
            continue

    # print("low freq words: {}".format(low_freq_words))
    return low_freq_words


def get_word_freq_index(word):
    """
    Takes in a word and gives a frequency index, where 0 is common and 1 is rare.
    """
    word = word.lower()
    google_score = None
    norvig_score = None
    # find word in google
    try:
        i_word_google = idx_google_dict_word_freq[word][0]
        google_score = (i_word_google / google_lines)
        # print("Google score of |{} == {}|".format(word, i_word_google / google_lines))
    except KeyError as e:
        # if we didn't find the word in giant google dataset, then it's rare, so define
        # it if we have it
        google_score = 1.0

    # find word in norvig
    i_word_norvig = None
    try:
        i_word_norvig = idx_norvig_dict_word_freq[word][0]
        norvig_score = i_word_norvig / norvig_lines
        # print("Norvig score of |{} == {}|".format(word, i_word_norvig / norvig_lines))
    except KeyError as e:
        # if we didn't find the word in norvig, it might not be rare (e.g. "habitual")
        # print("Word '{}' not found in norvig word frequency database.".format(word))
        norvig_score = 1.0  # just give it a score of half, since we don't know

    return ((google_score * 2) + norvig_score) / 3


def find_acronyms(words):
    acronyms = list()
    for word in words:
        # an acronym is usually short and capitalized
        if (1 < len(word) < 5) and ("'" not in word) and word.isupper():
            # print("111 Found acronym: {}".format(word))
            acronyms.append(word)
            continue
        # if the word is very short it might still be an acronym even if it isn't all
        # uppercase
    #        elif len(word) < 4:
    #            # check weather the word is in the is in the wordnet database
    #            syns = wordnet.synsets(word)
    #
    #            try:
    #                definition = syns[0].definition()
    #                print("This is a word: {}".format(word))
    #            # if wordnet can't find a definition for the word assume it's an acronym
    #            except IndexError as e:
    #                print("222 Found acronym: {}".format(word))
    #                acronyms.append(word)
    #                continue
    return acronyms


def rare_word_define_string(text, context):
    # clean text and split text into words
    text = text.replace(".", " ").strip()
    text = re.sub(r'[0-9]', '', text)
    word_list = text.split(' ')

    # remove words with apostrophes
    word_list = [word for word in word_list if "'" not in word]

    # get list of acronyms
    acronyms = find_acronyms(word_list)

    # list of words without acronyms
    word_list_no_acronyms = list(set(word_list) - set(acronyms))
    print("word_list_no_acronyms: ")
    print(word_list_no_acronyms)

    # get list of rare words
    rare_words = find_low_freq_words(word_list_no_acronyms)

    all_to_define = rare_words + acronyms

    # define acronyms
    acro_definitions = [define_acronym(a) for a in acronyms]
    acro_definitions = [ad for ad in acro_definitions if ad is not None]

    # define rare words
    rare_word_definitions = [define_word(w, context) for w in rare_words]
    rare_word_definitions = [
        wd for wd in rare_word_definitions if wd is not None]
    rare_word_definitions = [shorten_definition(
        d
    ) for d in rare_word_definitions]

    # combine definitions
    definitions = acro_definitions + rare_word_definitions

    return definitions

# if __name__ == "__main__":
# print(rare_word_define_string("CSE existential LLM
# spectroscopy this is a test and preposterous NSA people might amicably proliferate
# OUR tungsten arcane ark USA botanical bonsai ASR gynecologist esoteric
# multiprocessing"))
