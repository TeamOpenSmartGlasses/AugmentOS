import pandas as pd


df = pd.read_csv("./russian_word_freq_list/30k.csv")
words_dict = pd.Series(df['rank'].values, index=df['word']).to_dict()

def get_dictionary_rank(transcript: str) -> dict:
    words = transcript.split()
    words_rank = dict()
    total_words = len(df)  # Get the total number of words in the dataset

    for word in words:
        if word in words_dict:
            # Convert rank to percentile
            percentile = (words_dict[word] / total_words) * 100
            words_rank[word] = percentile #100 - percentile  # To make higher percentiles indicate rarer words
    
    return words_rank
