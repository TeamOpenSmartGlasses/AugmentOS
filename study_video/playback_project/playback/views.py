from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

playback_time = 0

def test(request):
    return JsonResponse({'message': 'Server is up'})

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
