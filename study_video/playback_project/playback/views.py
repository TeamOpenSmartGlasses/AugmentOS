import random
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import os
from django.conf import settings
from .models import Participant

playback_time = 0
current_user_id = None  # To track the current user ID


def test(request):
    return JsonResponse({'message': 'Server is up'})


@csrf_exempt
def create_participant(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            participant_id = data.get('participantID')
            if not participant_id:
                return JsonResponse({'error': 'Participant ID is required'}, status=400)

            participant, created = Participant.objects.get_or_create(participant_id=participant_id)

            if created:
                # 0: Control, 1: Unknown Word Gloss, 2: L2 Keywords
                participant.stratification = [random.randint(0, 2) for _ in range(20)]
                participant.pretest_results = ""
                participant.posttest_results = ""
                participant.save()

                return JsonResponse({'message': 'Participant created', 'stratification': participant.stratification},
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


def get_current_user_id(request):
    global current_user_id
    if current_user_id is not None:
        return JsonResponse({'status': 'success', 'userID': current_user_id}, status=200)
    else:
        return JsonResponse({'status': 'failure', 'message': 'No user ID set'}, status=400)

