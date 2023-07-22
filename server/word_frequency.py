# check the frequency of all words in a list, return list of words with frequency below constant
import pandas as pd
from nltk.corpus import wordnet
import word_define
from word_define import *
import re

#load index
df_google_word_freq = pd.read_csv("./english_word_freq_list/unigram_freq.csv")
df_norvig_word_freq = pd.read_csv("./english_word_freq_list/30k.csv", header=0)
idx_google_dict_word_freq = df_google_word_freq.groupby(by='word').apply(lambda x: x.index.tolist()).to_dict()
idx_norvig_dict_word_freq = df_norvig_word_freq.groupby(by='word').apply(lambda x: x.index.tolist()).to_dict()

low_freq_constant_google = 300000 #150000 #higher means more word # relative to dataset used, up for debate, maybe user-settable (example english not your first language? Want to be higher)... in general, frequency can't be the only metric - maybe you say a rare word every day, we shouldn't keep defining it - cayden
low_freq_line_constant_norvig = 15612 #the line number /30,000, so the lower, the more words included

print("Loading word frequency indexes...")
df_google_word_freq.iloc[idx_google_dict_word_freq["golgw"]] # run once to build the index
#print(df_norvig_word_freq)
df_norvig_word_freq.iloc[idx_norvig_dict_word_freq["whereabouts"]] # run once to build the index
print("--- Word frequency index loaded.")

#we use this funny looking thing for fast string search, thanks to: https://stackoverflow.com/questions/44058097/optimize-a-string-query-with-pandas-large-data
def find_low_freq_words(words):
    low_freq_words = list()
    for word in words:
        word = word.lower()
        #check if it should be included according to google and/or norvig
        try:
            i_word_google = idx_google_dict_word_freq[word]
            i_word_norvig = idx_norvig_dict_word_freq[word]
        except KeyError as e:
            #if we didn't find the word, then it's rare, so define it if we have it
            low_freq_words.append(word)
            continue
        word_freq_google = df_google_word_freq.iloc[i_word_google]
        if ((len(word_freq_google) > 0) or (len(word_freq_norvig) > 0)):
            if word_freq_google["count"].iloc[0] < low_freq_constant_google: #we use iloc[0] because our dataset should only have one of each word
                low_freq_words.append(word)
                continue
            elif i_word_norvig[0] > low_freq_line_constant_norvig:
                low_freq_words.append(word)
                continue
    return low_freq_words


def find_acronyms(words):
    acronyms = list()
    for word in words:
        # an acronym is usually short and capitalized
        if 1 < len(word) < 5 and ("'" not in word) and word.isupper():
            # print("111 Found acronym: {}".format(word))
            acronyms.append(word)
            continue
        # if the word is very short it might still be an acronym even if it isn't all uppercase
#        elif len(word) < 4:
#            # check wether the word is in the is in the wordnet database
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

def rare_word_define_string(text):
    #clean text and split text into words
    text = text.replace(".", " ").strip()
    text = re.sub(r'[0-9]', '', text)
    word_list = text.split(' ')

    #remove words with apostrophes
    word_list = [word for word in word_list if "'" not in word]

    #get list of acronyms
    acronyms = find_acronyms(word_list)

    #list of words without acronyms
    word_list_no_acronyms = list(set(word_list) - set(acronyms))
    # print("word_list_no_acronyms: ")
    # print(word_list_no_acronyms)

    #get words and acronyms
    rare_words = find_low_freq_words(word_list_no_acronyms)

    # print("Acro:")
    # print(acronyms)
    # print("Rare words:")
    # print(rare_words)
    all_to_define = rare_words + acronyms

    #define words and acronyms
    definitions = [define_word(w) for w in all_to_define]
    definitions = [i for i in definitions if i is not None]
    definitions_short = [shorten_definition(d) for d in definitions]
    return definitions_short

if __name__ == "__main__":
    print(rare_word_define_string("existential spectroscopy this is a test and preposterous people might amicably proliferate tungsten arcane ark botanical bonsai gynecologist esoteric"))
