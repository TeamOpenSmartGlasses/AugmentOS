import pandas as pd
import os
import jieba

# Mapping of incoming language codes to the FrequencyWords repository's folder names
language_code_map = {
    "English": "en",
    "Spanish": "es",
    "Russian": "ru",
    "Japanese": "ja",
    "French": "fr",
    "Chinese": "zh_cn",  # Assuming simplified Chinese; adjust if necessary for traditional
    "Chinese (Pinyin)": "zh_cn",  # Assuming simplified Chinese; adjust if necessary for traditional
}

def load_frequency_list(language_code: str, type: str) -> pd.DataFrame:
    """
    Load the frequency list for the specified language.
    """
    if language_code not in language_code_map:
        raise ValueError(f"Unsupported language code: {language_code}")

    # Construct the path to the frequency list
    folder_name = language_code_map[language_code]
    file_path = os.path.join("./word_frequency_lists/content/2018", folder_name, f"{folder_name}_{type}.txt")

    # Load the frequency list into a DataFrame
    df = pd.read_csv(file_path, sep=" ", names=['word', 'frequency'], header=None)
    df['rank'] = df['frequency'].rank(ascending=False)
    return df

def get_word_frequency_percentiles(transcript: str, language_code: str) -> dict:
    df = load_frequency_list(language_code, '50k')
    words_dict = pd.Series(df['rank'].values,index=df['word']).to_dict()
    total_words = len(df)  # Get the total number of words in the dataset

    df = load_frequency_list(language_code, 'full')
    large_words_dict = pd.Series(df['rank'].values,index=df['word']).to_dict()

    # Tokenize the transcript based on the language
    if language_code == "Chinese":
        words = list(jieba.cut(transcript))
        print("TOKENIZED WORDS: ", words)

    else:
        words = transcript.split()

    words_rank = {}

    for word in words:
        # For languages other than Chinese, consider lowercasing the word to improve match rate
        word_lower = word.lower() if language_code in ["English", "Spanish", "French"] else word
        word_lower_token = word_lower.split("'")[0].translate(str.maketrans("", "", "?!.,;\""))
        if word_lower_token in words_dict:
            # Convert rank to percentile
            percentile = round((words_dict[word_lower_token] / total_words) * 100, 1)
            words_rank[word] = percentile
        elif word_lower_token in large_words_dict: 
            percentile = 99 #large percentile for words not in small dataset but in large dataset
            words_rank[word] = percentile
 
    print("WORDS_RANK",words_rank)
    return words_rank

if __name__ == "__main__":
    to_test_str = "你好，你今天过得怎么样？ 这是一个协同效应。"
    word_freqs = get_word_frequency_percentiles(to_test_str, "Chinese")
    print(word_freqs)
