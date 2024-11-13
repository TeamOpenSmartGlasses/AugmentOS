"""This module assumes that at most one user is connected at any time."""

import csv
import os
from typing import List, Dict

from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import random
import datetime

from django.conf import settings
from django.views.decorators.http import condition

if __name__ != "__main__":
    from .models import Participant, Actuation
import pandas as pd


# playback_time = 40 # TODO: change this
playback_time = 0
current_participant_id = None
NUMBER_OF_PARTICIPANTS = 21
RARE_WORD_DISPLAY_THRESHOLD = 0.5

participant_index = 0 # index of the participant in the list of participants
index_video_word = 0 # index of the word in the list of words for the video
video_index = 0 # index of the video in the list of videos

if __name__ == '__main__':
    rare_words_directory_path = '../../content_generation/rare_words_with_timestamps_and_conditions'
else:
    rare_words_directory_path = '../content_generation/rare_words_with_timestamps_and_conditions'

print(os.listdir(rare_words_directory_path))
rare_words_for_each_video_dict = dict()
FRACTION_OF_NO_INTERVENTION_PARTICIPANTS = 1/3

def parse_csv():
    # TODO: fix this
    if len(os.listdir(rare_words_directory_path)) > 5: # should have at most 3 rare word files one for each video
        raise RuntimeError('Too many files in the directory. Shutting down the server.')

    global rare_words_for_each_video_dict

    for filename in os.listdir(rare_words_directory_path):
        if filename.endswith('.csv'):
            file_path = os.path.join(rare_words_directory_path, filename)
            video_name = "video_" + filename.split('_')[1]
            rare_words_for_each_video_dict[video_name] = list()

            try:
                df = pd.read_csv(file_path)

                for i, row in df.iterrows():
                    rare_words_for_each_video_dict[video_name].append({
                        'unique_word_id': row['unique_word_id'],
                        'word_id': row['word_id'],
                        'word': row['word'],
                        'translation': row['translation'],
                        'startTime': float(row['start_time']),
                        'endTime': float(row['end_time']),
                        # 'condition': int(row['condition'])
                    })
            except FileNotFoundError:
                print('CSV file not found')
            except Exception as e:
                print(f'Error reading CSV file: {e}')


def assign_videos_and_conditions_to_participants() -> List:
    video_orders = [[1, 2, 3] for _ in range(NUMBER_OF_PARTICIPANTS)]
    condition_orders = [[1, 2, 3] for _ in range(NUMBER_OF_PARTICIPANTS)]

    for i in range(NUMBER_OF_PARTICIPANTS):
        random.shuffle(video_orders[i])
        random.shuffle(condition_orders[i])

    participants_data = [
        {"video_order": video_orders[i], "condition_order": condition_orders[i]}
        for i in range(NUMBER_OF_PARTICIPANTS)
    ]

    return participants_data


parse_csv()


import os
import json
import datetime

def read_or_create_json():
    directory = 'participant_video_and_conditions_csvs'
    if not os.path.exists(directory):
        os.makedirs(directory)

    files = os.listdir(directory)
    if files:
        # Read the first file in the directory
        file_path = os.path.join(directory, files[0])
        with open(file_path, 'r') as json_file:
            output_data = json.load(json_file)
    else:
        # Call the function to create the JSON
        participant_video_and_condition = assign_videos_and_conditions_to_participants()
        current_datetime = datetime.datetime.now()
        output_data = {
            "date_saved": current_datetime.isoformat(),
            "data": participant_video_and_condition
        }

        current_datetime = current_datetime.strftime("%Y%m%d_%H%M%S")
        file_name = f'participant_video_and_condition_{current_datetime}.json'
        file_path = os.path.join(directory, file_name)

        with open(file_path, 'w') as json_file:
            json.dump(output_data, json_file, indent=4)

    return output_data


output_data = read_or_create_json()
participant_video_and_condition = output_data['data']
participant_conditions = dict()
print(output_data)


def test(request):
    return JsonResponse({'message': 'Server is up'})


video_list_index = 0
@csrf_exempt
def get_video_index_for_participant(request) -> JsonResponse:
    global video_list_index
    global video_index
    global current_participant_id
    global participant_index

    print("video_list_index", video_list_index)
    print("video_index", video_index)
    print("participant_index", participant_index)
    print("current_participant_id", current_participant_id)

    if request.method == 'GET':
        if not current_participant_id:
            return JsonResponse({'error': 'Participant ID is required'}, status=400)

        try:
            participant = Participant.objects.get(participant_id=current_participant_id)
        except Participant.DoesNotExist:
            return JsonResponse({'error': 'Participant not found'}, status=404)

        try:
            video_index = participant_video_and_condition[participant_index]['video_order'][video_list_index]
            video_list_index += 1
        except IndexError:
            return JsonResponse({'error': 'No more videos to watch'}, status=400)

        if video_list_index > 2:
            participant_index += 1
            video_list_index = 0


        return JsonResponse({'video_index': video_index})

    return JsonResponse({'error': 'Invalid request method'}, status=400)


def get_conditions_for_participant(video_key: str) -> List:
    index = int(video_key.split("_")[1])
    intervention_type = participant_video_and_condition[participant_index]['condition_order'][index - 1]

    words = rare_words_for_each_video_dict[video_key]

    conditions = [intervention_type] * len(words)

    unique_word_id_to_indices = {}
    for i, word in enumerate(words):
        uid = word['unique_word_id']
        unique_word_id_to_indices.setdefault(uid, []).append(i)

    for uid, indices in unique_word_id_to_indices.items():
        num_to_increment = int(len(indices) * FRACTION_OF_NO_INTERVENTION_PARTICIPANTS)
        indices_to_increment = random.sample(indices, num_to_increment)
        for idx in indices_to_increment:
            conditions[idx] += 3

    return conditions


@csrf_exempt
def create_participant(request):
    """
    Create a new participant with the given participant ID. The last three digits of the participant ID are used to
    determine the videos that the participant will watch.
    """

    global participant_conditions
    global current_participant_id
    global video_list_index

    video_list_index = 0

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            participant_id = data.get('participantID')


            if not participant_id:
                return JsonResponse({'error': 'Participant ID is required'}, status=400)

            participant, created = Participant.objects.get_or_create(participant_id=participant_id)
            participant_order_and_conditions = participant_video_and_condition[participant_index]

            if created:
                # participant.first_video = participant_order_and_conditions['video_order'][0] # first video is the first video showed to the user, this is different from video 1
                # participant.second_video = participant_order_and_conditions['video_order'][1]
                # participant.third_video = participant_order_and_conditions['video_order'][2]

                participant.conditions_video_1 = get_conditions_for_participant(video_key='video_1') # conditions for video 1
                participant.conditions_video_2 = get_conditions_for_participant(video_key='video_2')
                participant.conditions_video_3 = get_conditions_for_participant(video_key='video_3')

                participant_conditions = {
                    'video_1': participant.conditions_video_1,
                    'video_2': participant.conditions_video_2,
                    'video_3': participant.conditions_video_3,
                }

                participant.save()
                current_participant_id = participant_id

                return JsonResponse({'message': 'Participant created'}, status=201)
            else:
                return JsonResponse({'message': 'Participant already exists'}, status=200)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=400)


@csrf_exempt
def update_playback_time(request):
    global playback_time

    if request.method == 'POST':
        data = json.loads(request.body)
        playback_time = data.get('currentTime', 0)
        return JsonResponse({'status': 'success'})

    return JsonResponse({'status': 'failure', 'message': 'Invalid request method'}, status=400)


@csrf_exempt
def get_playback_time(request):
    return JsonResponse({'currentTime': playback_time})


@csrf_exempt
def get_new_word(request): # TODO: check latency between request being sent and word being displayed
    global index_video_word
    global current_participant_id
    global participant_conditionsr

    # if index_video < len(rare_words_for_each_video_dict["video_1"]) and current_user_id:
    try:
        current_word = rare_words_for_each_video_dict[f"video_{video_index}"][index_video_word] # TODO: fix this\
        condition = participant_conditions[f"video_{video_index}"][index_video_word]
    except:
        return JsonResponse({'word': None, 'translation': None, 'condition': 0})

    print(current_word['startTime'], playback_time)
    if current_word['startTime'] <= playback_time:
        index_video_word += 1

        try:
            _ = Participant.objects.get(participant_id=current_participant_id)
        except Participant.DoesNotExist:
            return JsonResponse({'error': 'Participant not found'}, status=400)

        Actuation.objects.create(
            participant=current_participant_id,
            word_id=current_word['word_id'],
            video_index=video_index,
            unique_word_id=current_word['unique_word_id'],
            word=current_word['word'],
            translation=current_word['translation'],
            condition=condition,
            timestamp=timezone.now(),
        )

        return JsonResponse({
            'word': current_word['word'],
            'translation': current_word['translation'],
            'condition': condition,
        })

    return JsonResponse({'word': None, 'translation': None, 'condition': 0})


@csrf_exempt
def set_current_user_id(request):
    global current_participant_id
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('userID')
            if not user_id:
                return JsonResponse({'error': 'User ID is required'}, status=400)

            current_participant_id = user_id
            return JsonResponse({'status': 'success', 'message': 'User ID set', 'userID': current_participant_id}, status=200)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=400)


@csrf_exempt
def get_current_user_id(request):
    global current_participant_id
    print("user_id", current_participant_id)
    if current_participant_id is not None:
        return JsonResponse({'status': 'success', 'userID': current_participant_id}, status=200)
    else:
        return JsonResponse({'status': 'failure', 'message': 'No user ID set'}, status=400)


@csrf_exempt
def export_participants_csv(request):
    global video_index
    if __name__ == "__main__":
        file_path = f'./participants_{datetime.datetime.now()}.csv'
    else:
        file_path = os.path.join(settings.BASE_DIR, f'participant_list/participants_{datetime.datetime.now()}.csv')

    with open(file_path, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            'Participant ID', 'Current Video Index', 'Current Condition',
            'Word ID', 'Unique Word ID', 'Word', 'Translation',
            'Condition', 'Timestamp'
        ])

        participants = Participant.objects.all()
        for participant in participants:
            actuations = Actuation.objects.filter(participant=participant)

            if actuations.exists():
                for actuation in actuations:
                    writer.writerow([
                        participant.participant_id,
                        actuation.video_index,
                        actuation.condition,
                        actuation.word_id,
                        actuation.unique_word_id,
                        actuation.word,
                        actuation.translation,
                        actuation.condition,
                        actuation.timestamp
                    ])
            else:
                writer.writerow([
                    participant.participant_id,
                    '',  # No video index
                    '',  # No condition
                    '',  # No word ID
                    '',  # No unique word ID
                    '',  # No word
                    '',  # No translation
                    '',  # No condition
                    ''  # No timestamp
                ])

    return JsonResponse({'message': f'CSV file saved locally at {file_path}'})


if __name__ == '__main__':
    test_conditions = get_conditions_for_participant("video_1")
    export_participants_csv(None)
    print(test_conditions)
