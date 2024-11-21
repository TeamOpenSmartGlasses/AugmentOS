from django.db import models


class Participant(models.Model):
    participant_id = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    first_video = models.IntegerField(default=0)
    second_video = models.IntegerField(default=0)
    third_video = models.IntegerField(default=0)

    conditions_video_1 = models.JSONField(default=list)
    conditions_video_2 = models.JSONField(default=list)
    conditions_video_3 = models.JSONField(default=list)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return self.participant_id

    objects = models.Manager()
    DoesNotExist = models.ObjectDoesNotExist


class Actuation(models.Model):
    participant_id: str = models.CharField(max_length=255, default='')
    word_id = models.CharField(max_length=255, default='')
    unique_word_id = models.CharField(max_length=255, default='')
    word = models.CharField(max_length=255, default='')
    translation = models.CharField(max_length=255, default='')
    video_index = models.IntegerField(default=0)
    condition = models.IntegerField(default=0)
    number_of_words_shown_at_time = models.IntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    def __str__(self):
        return f'{self.participant_id} - {self.word} at {self.timestamp}'
