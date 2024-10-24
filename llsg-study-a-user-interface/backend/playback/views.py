import csv
import os
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from django.conf import settings
from .models import Participant, Actuation
import pandas as pd


playback_time = 0
condition = 1
current_user_id = None
word_list = []


def parse_csv():
    global word_list
    file_path = os.path.join(settings.BASE_DIR, '../rare_words.csv')
    try:
        df = pd.read_csv(file_path)

        for _, row in df.iterrows():
            word_list.append({
                'word_id': row['word_id'],
                'word': row['word'],
                'translation': row['translation'],
                'startTime': float(row['start_time']),
                'endTime': float(row['end_time'])
            })
    except FileNotFoundError:
        print('CSV file not found')
    except Exception as e:
        print(f'Error reading CSV file: {e}')


parse_csv()

def test(request):
    return JsonResponse({'message': 'Server is up'})


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

            if not participant_id[-3:].isdigit():
                return JsonResponse({'error': 'Last three digits of participant ID must be numbers'}, status=400)

            video_1, video_2, video_3 = map(int, participant_id[-3:])
            if not (1 <= video_1 <= 6 and 1 <= video_2 <= 6 and 1 <= video_3 <= 6):
                return JsonResponse({'error': 'Each of the last 3 characters of the user ID must be digits between 1 and 6'}, status=400)

            participant, created = Participant.objects.get_or_create(participant_id=participant_id)

            if created:
                participant.video_1 = video_1
                participant.video_2 = video_2
                participant.video_3 = video_3

                participant.save()
                current_user_id = participant_id

                return JsonResponse({'message': 'Participant created', 'videos': [video_1, video_2, video_3]},
                                    status=201)
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


def get_new_word(request):
    global word_list
    global current_user_id

    if word_list and current_user_id:
        current_word = word_list[0]
        if current_word['startTime'] <= playback_time:
            word_list.pop(0)

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

            return JsonResponse({
                'word': current_word['word'],
                'translation': current_word['translation'],
                'condition': condition,
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
