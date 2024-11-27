import pandas as pd
import pickle

df_google_word_freq = pd.read_csv("../english_word_freq_list/unigram_freq.csv")
df_norvig_word_freq = pd.read_csv("../english_word_freq_list/30k.csv", header=0)
idx_google_dict_word_freq = df_google_word_freq.groupby(by='word').apply(lambda x: x.index.tolist()).to_dict()
idx_norvig_dict_word_freq = df_norvig_word_freq.groupby(by='word').apply(lambda x: x.index.tolist()).to_dict()

low_freq_constant_google = 300000 # 150000 #higher means more word # relative to dataset used, up for debate, maybe user-settable (example english not your first language? Want to be higher)... in general, frequency can't be the only metric - maybe you say a rare word every day, we shouldn't keep defining it - cayden
low_freq_line_constant_norvig = 15612 # the line number /30,000, so the lower, the more words included

print("Loading word frequency indexes...")
df_google_word_freq.iloc[idx_google_dict_word_freq["golgw"]] # run once to build the index
#print(df_norvig_word_freq)
df_norvig_word_freq.iloc[idx_norvig_dict_word_freq["whereabouts"]] # run once to build the index
print("--- Word frequency index loaded.")

objects_to_pickle = {
    "df_google_word_freq": df_google_word_freq,
    "df_norvig_word_freq": df_norvig_word_freq,
    "idx_google_dict_word_freq": idx_google_dict_word_freq,
    "idx_norvig_dict_word_freq": idx_norvig_dict_word_freq
}

# Save the dictionary to a pickle file
pickle.dump(objects_to_pickle, open("../pickles/word_frequency_indexes.pkl", "wb"))