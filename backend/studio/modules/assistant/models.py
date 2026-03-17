from django.conf import settings
from django.db import models


class AIAssistantConfig(models.Model):
    PROVIDER_OPENAI = "openai"
    PROVIDER_GEMINI = "gemini"
    PROVIDER_OLLAMA = "ollama"
    PROVIDER_CHOICES = (
        (PROVIDER_OPENAI, "OpenAI"),
        (PROVIDER_GEMINI, "Gemini"),
        (PROVIDER_OLLAMA, "Ollama / local"),
    )

    organization = models.OneToOneField(
        "studio.Organization",
        on_delete=models.CASCADE,
        related_name="ai_assistant_config",
    )
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default=PROVIDER_OPENAI)
    model = models.CharField(max_length=120, blank=True)
    api_key = models.TextField(blank=True)
    base_url = models.URLField(blank=True)
    system_prompt = models.TextField(blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=2, default=0.20)
    max_context_items = models.PositiveIntegerField(default=8)
    include_classes_context = models.BooleanField(default=True)
    include_students_context = models.BooleanField(default=True)
    include_finance_context = models.BooleanField(default=True)
    include_instructors_context = models.BooleanField(default=True)
    is_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("organization_id",)

    def __str__(self):
        return f"{self.organization.name} - {self.provider}"


class AIAssistantInteraction(models.Model):
    STATUS_SUCCESS = "success"
    STATUS_ERROR = "error"
    STATUS_CHOICES = (
        (STATUS_SUCCESS, "Success"),
        (STATUS_ERROR, "Error"),
    )

    organization = models.ForeignKey(
        "studio.Organization",
        on_delete=models.CASCADE,
        related_name="ai_assistant_interactions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_assistant_interactions",
    )
    provider = models.CharField(max_length=20, choices=AIAssistantConfig.PROVIDER_CHOICES)
    model = models.CharField(max_length=120, blank=True)
    question = models.TextField()
    answer = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SUCCESS)
    error_message = models.TextField(blank=True)
    context_snapshot = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")

    def __str__(self):
        return f"{self.organization.name} - {self.provider} - {self.created_at:%Y-%m-%d %H:%M}"
