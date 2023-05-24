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
def find_low_freq_words(text):
    text = text.lower().replace(".", " ").strip()
    text = re.sub(r'[0-9]', '', text)
    low_freq_words = list()
    for word in text.split(' '):
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

def rare_word_define_string(string):
    words = find_low_freq_words(string)
    definitions = [define_word(w) for w in words]
    definitions = [i for i in definitions if i is not None]
    definitions_short = [shorten_definition(d) for d in definitions]
    return definitions_short

if __name__ == "__main__":
    print(rare_word_define_string("existential spectroscopy this is a test and preposterous people might amicably proliferate tungsten arcane ark botanical bonsai gynecologist esoteric"))
