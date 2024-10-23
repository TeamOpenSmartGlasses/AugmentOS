from django.db import models
import random


class Participant(models.Model):
    participant_id = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    stratification = models.JSONField(default=list)
    pretest_results = models.TextField(blank=True, null=True)
    posttest_results = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        # Generate stratification if it doesn't already exist
        if not self.stratification:
            self.stratification = [random.randint(0, 2) for _ in range(20)]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.participant_id
