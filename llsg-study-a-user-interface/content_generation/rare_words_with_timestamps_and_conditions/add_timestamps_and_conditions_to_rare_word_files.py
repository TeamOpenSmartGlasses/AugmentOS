# TODO: wha1t if a word isn't detected by the STT model?


import os
import pandas as pd
import numpy as np
import uuid

from deepgram.utils import verboselogs
import httpx
import json

from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    PrerecordedOptions,
    FileSource,
)


rare_words_folder = '../text_generation/rare_words'


def extract_timestamps_from_video(audio_file_path):
    try:
        config: DeepgramClientOptions = DeepgramClientOptions(
            verbose=verboselogs.SPAM,
        )

        deepgram = DeepgramClient("b265155911fa1807808e3c56d4317666d6c0ddc3", config)
        with open(audio_file_path, "rb") as file:
            buffer_data = file.read()

        payload: FileSource = {
            "buffer": buffer_data,
        }

        options: PrerecordedOptions = PrerecordedOptions(
            model="nova-2",
            smart_format=True,
            utterances=True,
            language="es",
        )

        response = deepgram.listen.rest.v("1").transcribe_file(
            payload, options, timeout=httpx.Timeout(300.0, connect=10.0)
        )
        response = json.loads(response.to_json())['results']['channels'][0]['alternatives'][0]['words']

        return response

    except Exception as e:
        print(f"Exception: {e}")


def add_timestamps_and_conditions_to_rare_word_files(word_list, filename):
    file_path = os.path.join(rare_words_folder, filename)

    try:
        df_original = pd.read_csv(file_path)
    except Exception as e:
        print(f"Failed to read {file_path}: {e}")
        return

    matched_data = []

    word_id_map = {}
    # condition_map = {}

    # possible_conditions = [1, 2, 3]
    # np.random.shuffle(possible_conditions)
    csv_words = df_original['rare_word'].str.lower().tolist()

    for entry in word_list:
        detected_word = entry['word'].lower()

        if detected_word in csv_words:
            df_matches = df_original[df_original['rare_word'].str.lower() == detected_word]

            for _, row in df_matches.iterrows():
                word = row['rare_word']

                if word not in word_id_map:
                    word_id_map[word] = str(uuid.uuid4())

                # if word not in condition_map:
                #     condition_map[word] = np.random.choice(possible_conditions)

                matched_data.append({
                    'word_id': str(uuid.uuid4()),
                    'word': word,
                    'translation': row['translation'],
                    'start_time': entry['start'],
                    'end_time': entry['end'],
                    'unique_word_id': word_id_map[word],
                    # 'condition': condition_map[word]
                })

    if not matched_data:
        print(f"No matching words found for {filename}.")
        return

    df_matched = pd.DataFrame(matched_data)
    df_matched.sort_values(by='start_time', inplace=True)
    df_matched.reset_index(drop=True, inplace=True)

    columns = ['word_id', 'unique_word_id', 'word', 'translation', 'start_time', 'end_time', 'condition']
    df_matched = df_matched[columns]

    output_filename = filename.split('.')[0] + "_with_time_stamps_and_conditions.csv"
    output_path = os.path.join(rare_words_folder, output_filename)

    try:
        df_matched.to_csv(f"{filename.split(".")[0]}_with_timestamps_and_conditions.csv", index=True, index_label='word_index')
        print(f"Processed and saved: {output_path}")
    except Exception as e:
        print(f"Failed to save {output_path}: {e}")


if __name__ == "__main__":
    audio_file_path = '../process_video/videos/video_1.mp4'
    word_list = extract_timestamps_from_video(audio_file_path)

    if not word_list:
        print("No words detected. Exiting.")
    else:
        for filename in os.listdir(rare_words_folder):
            if filename.endswith('.csv'):
                add_timestamps_and_conditions_to_rare_word_files(word_list, filename)
