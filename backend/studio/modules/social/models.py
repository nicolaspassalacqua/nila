from django.db import models


class SocialAccount(models.Model):
    PLATFORM_FACEBOOK = "facebook"
    PLATFORM_INSTAGRAM = "instagram"
    PLATFORM_TIKTOK = "tiktok"
    PLATFORM_LINKEDIN = "linkedin"
    PLATFORM_CHOICES = (
        (PLATFORM_FACEBOOK, "Facebook"),
        (PLATFORM_INSTAGRAM, "Instagram"),
        (PLATFORM_TIKTOK, "TikTok"),
        (PLATFORM_LINKEDIN, "LinkedIn"),
    )

    organization = models.ForeignKey("studio.Organization", on_delete=models.CASCADE, related_name="social_accounts")
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    account_name = models.CharField(max_length=150)
    handle = models.CharField(max_length=150)
    followers_count = models.PositiveIntegerField(default=0)
    engagement_rate = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    growth_rate = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    is_connected = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("organization", "platform", "handle")
        ordering = ("platform", "account_name")

    def __str__(self):
        return f"{self.organization.name} - {self.platform} - {self.handle}"


class SocialPost(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_PUBLISHED = "published"
    STATUS_SCHEDULED = "scheduled"
    STATUS_CHOICES = (
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
        (STATUS_SCHEDULED, "Scheduled"),
    )

    organization = models.ForeignKey("studio.Organization", on_delete=models.CASCADE, related_name="social_posts")
    account = models.ForeignKey(
        SocialAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posts",
    )
    platform = models.CharField(max_length=20, choices=SocialAccount.PLATFORM_CHOICES)
    title = models.CharField(max_length=180)
    body = models.TextField(blank=True)
    image_label = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PUBLISHED)
    likes_count = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)
    shares_count = models.PositiveIntegerField(default=0)
    views_count = models.PositiveIntegerField(default=0)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-published_at", "-created_at")

    def __str__(self):
        return f"{self.organization.name} - {self.title}"


class SocialCampaign(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_ACTIVE = "active"
    STATUS_PAUSED = "paused"
    STATUS_COMPLETED = "completed"
    STATUS_CHOICES = (
        (STATUS_DRAFT, "Draft"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_PAUSED, "Paused"),
        (STATUS_COMPLETED, "Completed"),
    )

    organization = models.ForeignKey("studio.Organization", on_delete=models.CASCADE, related_name="social_campaigns")
    name = models.CharField(max_length=160)
    objective = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    leads_count = models.PositiveIntegerField(default=0)
    ctr = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    visitors_count = models.PositiveIntegerField(default=0)
    budget_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    budget_currency = models.CharField(max_length=8, default="ARS")
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return f"{self.organization.name} - {self.name}"
