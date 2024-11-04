"""This module assumes that at most one user is connected at any time."""

import csv
import os
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import random

from django.conf import settings
from .models import Participant, Actuation
import pandas as pd


playback_time = 0
current_user_id = None
rare_words_directory_path = '../content_generation/rare_words_with_timestamps_and_conditions'
print(os.listdir(rare_words_directory_path))
rare_words_for_each_video_dict = dict()


def parse_csv():
    if len(os.listdir(rare_words_directory_path)) > 3: # should have at most 3 rare word files one for each video
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
                        'condition': int(row['condition'])
                    })
            except FileNotFoundError:
                print('CSV file not found')
            except Exception as e:
                print(f'Error reading CSV file: {e}')


parse_csv()

def test(request):
    return JsonResponse({'message': 'Server is up'})


def get_conditions_for_participant(video_key):
    words = rare_words_for_each_video_dict.get(video_key, [])
    conditions = [word['condition'] for word in words]

    unique_word_id_to_indices = {}
    unique_word_id_to_condition = {}
    for i, word in enumerate(words):
        uid = word['unique_word_id']
        unique_word_id_to_indices.setdefault(uid, []).append(i)
        unique_word_id_to_condition[uid] = word['condition']  # Assuming the condition is the same for the same unique_word_id

    increment_indices = set()
    for cond in [1, 2, 3]:
        uids_with_cond = [uid for uid, c in unique_word_id_to_condition.items() if c == cond]
        num_uids = len(uids_with_cond)
        num_to_increment = num_uids // 3
        if num_to_increment > 0:
            sampled_uids = random.sample(uids_with_cond, num_to_increment)
            for uid in sampled_uids:
                increment_indices.update(unique_word_id_to_indices[uid])

    stratified_conditions = [
        conditions[i] + 3 if i in increment_indices else conditions[i]
        for i in range(len(conditions))
    ]

    return stratified_conditions


@csrf_exempt
def create_participant(request):
    """
    Create a new participant with the given participant ID. The last three digits of the participant ID are used to
    determine the videos that the participant will watch.
    """
    global current_user_id
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            participant_id = data.get('participantID')
            if not participant_id:
                return JsonResponse({'error': 'Participant ID is required'}, status=400)

            participant, created = Participant.objects.get_or_create(participant_id=participant_id)

            if created:
                participant.conditions_video_1 = get_conditions_for_participant(video_key='video_1')
                participant.conditions_video_2 = get_conditions_for_participant(video_key='video_2')
                participant.conditions_video_3 = get_conditions_for_participant(video_key='video_3')

                participant.save()
                current_user_id = participant_id

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


def get_playback_time(request):
    return JsonResponse({'currentTime': playback_time})


index_video = 0

def get_new_word(request): # TODO: check latency between request being sent and word being displayed
    global index_video
    global current_user_id

    # if index_video < len(rare_words_for_each_video_dict["video_1"]) and current_user_id:
    current_word = rare_words_for_each_video_dict["video_1"][index_video] # TODO: fix this

    print(current_word['startTime'], playback_time)
    if current_word['startTime'] <= playback_time:
        index_video += 1

        try:
            participant = Participant.objects.get(participant_id=current_user_id)
        except Participant.DoesNotExist:
            return JsonResponse({'error': 'Participant not found'}, status=400)

        Actuation.objects.create(
            participant=participant,
            word_id=current_word['word_id'],
            word=current_word['word'],
            timestamp=timezone.now()
        )

        print("sending word")

        return JsonResponse({
            'word': current_word['word'],
            'translation': current_word['translation'],
            'condition': current_word['condition'],
        })

    return JsonResponse({'word': None, 'translation': None, 'condition': 0})


@csrf_exempt
def set_current_user_id(request):
    global current_user_id
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('userID')
            if not user_id:
                return JsonResponse({'error': 'User ID is required'}, status=400)

            current_user_id = user_id
            return JsonResponse({'status': 'success', 'message': 'User ID set', 'userID': current_user_id}, status=200)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=400)


@csrf_exempt
def get_current_user_id(request):
    global current_user_id
    if current_user_id is not None:
        return JsonResponse({'status': 'success', 'userID': current_user_id}, status=200)
    else:
        return JsonResponse({'status': 'failure', 'message': 'No user ID set'}, status=400)


def export_participants_csv(request):
    file_path = os.path.join(settings.BASE_DIR, 'participants.csv')

    with open(file_path, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Participant ID', 'Video 1', 'Video 2', 'Video 3', 'Word ID', 'Word', 'Timestamp'])

        participants = Participant.objects.all()
        for participant in participants:
            actuations = Actuation.objects.filter(participant=participant)

            if actuations.exists():
                for actuation in actuations:
                    writer.writerow([
                        participant.participant_id,
                        participant.video_1,
                        participant.video_2,
                        participant.video_3,
                        actuation.word_id,
                        actuation.word,
                        actuation.timestamp
                    ])
            else:
                writer.writerow([
                    participant.participant_id,
                    participant.video_1,
                    participant.video_2,
                    participant.video_3,
                    '',  # No word ID
                    '',  # No word
                    ''  # No timestamp
                ])

    return JsonResponse({'message': f'CSV file saved locally at {file_path}'})
