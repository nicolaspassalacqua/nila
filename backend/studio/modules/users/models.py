from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField("auth.User", on_delete=models.CASCADE, related_name="studio_profile")
    preferred_language = models.CharField(max_length=10, default="es")
    timezone = models.CharField(max_length=40, default="America/Argentina/Buenos_Aires")
    is_premium = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile<{self.user.username}>"


class PlatformSetting(models.Model):
    singleton_key = models.CharField(max_length=20, unique=True, default="default")
    allow_google_sso = models.BooleanField(default=False)
    allow_facebook_sso = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "PlatformSetting<default>"
