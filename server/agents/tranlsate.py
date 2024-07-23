from PyMultiDictionary import MultiDictionary

def translate_word(word, source_lang, target_lang):
    dictionary = MultiDictionary()
    translations = dictionary.translate(source_lang, word)
    translation_dict = {key: value for key, value in translations}
    print(translation_dict)
    return translation_dict[target_lang]

# Example usage
source_language = 'zh'  # 'zh' for Chinese
target_language = 'en'
#word_to_translate = '休息'
word_to_translate = '你好'

translated_word = translate_word(word_to_translate, source_language, target_language)
print(f"'{word_to_translate}' in {target_language} is '{translated_word}'")
