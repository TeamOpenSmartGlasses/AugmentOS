from django.db import models


class Participant(models.Model):
    participant_id = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Add the three video attributes
    video_1 = models.IntegerField(null=True, blank=True)
    video_2 = models.IntegerField(null=True, blank=True)
    video_3 = models.IntegerField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # Generate stratification if it doesn't already exist
        super().save(*args, **kwargs)

    def __str__(self):
        return self.participant_id


class Actuation(models.Model):
    participant = models.ForeignKey(Participant, on_delete=models.CASCADE)
    word_id = models.CharField(max_length=255)
    word = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.participant.participant_id} - {self.word} at {self.timestamp}'
