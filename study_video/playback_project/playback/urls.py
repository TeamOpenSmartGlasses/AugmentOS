from django.urls import path
from . import views

urlpatterns = [
    path('test/', views.test, name='test'),
    path('update-playback-time/', views.update_playback_time, name='update_playback_time'),
    path('current-playback-time/', views.get_playback_time, name='get_playback_time'),
]
