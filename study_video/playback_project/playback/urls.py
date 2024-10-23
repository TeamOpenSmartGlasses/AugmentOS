from django.urls import path
from . import views

urlpatterns = [
    path('api/test/', views.test, name='test'),
    path('api/update-playback-time/', views.update_playback_time, name='update_playback_time'),
    path('api/create-participant/', views.create_participant, name='create_participant'),
    path('api/current-playback-time/', views.get_playback_time, name='get_playback_time'),
    path('api/set-current-user-id/', views.set_current_user_id, name='set_current_user_id'),
    path('api/get-current-user-id/', views.get_current_user_id, name='get_current_user_id'),
]