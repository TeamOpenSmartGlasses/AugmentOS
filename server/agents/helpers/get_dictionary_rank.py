import pandas as pd


df = pd.read_csv("server/agents/helpers/word_freq.csv")
words_dict = pd.Series(df['rank'].values, index=df['word']).to_dict()


def get_dictionary_rank(transcript: str) -> dict:
    words = transcript.split()
    words_rank = dict()

    for word in words:
        if word in words_dict:
            words_rank[word] = words_dict[word]
    
    return words_rank
