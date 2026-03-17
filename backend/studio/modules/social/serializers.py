from rest_framework import serializers

from .models import SocialAccount, SocialCampaign, SocialPost


class SocialAccountSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    platform_label = serializers.CharField(source="get_platform_display", read_only=True)

    class Meta:
        model = SocialAccount
        fields = (
            "id",
            "organization",
            "organization_name",
            "platform",
            "platform_label",
            "account_name",
            "handle",
            "followers_count",
            "engagement_rate",
            "growth_rate",
            "is_connected",
            "is_active",
            "metadata",
            "created_at",
            "updated_at",
        )


class SocialPostSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    account_name = serializers.CharField(source="account.account_name", read_only=True)
    account_handle = serializers.CharField(source="account.handle", read_only=True)
    platform_label = serializers.CharField(source="get_platform_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SocialPost
        fields = (
            "id",
            "organization",
            "organization_name",
            "account",
            "account_name",
            "account_handle",
            "platform",
            "platform_label",
            "title",
            "body",
            "image_label",
            "status",
            "status_label",
            "likes_count",
            "comments_count",
            "shares_count",
            "views_count",
            "published_at",
            "created_at",
            "updated_at",
        )


class SocialCampaignSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SocialCampaign
        fields = (
            "id",
            "organization",
            "organization_name",
            "name",
            "objective",
            "status",
            "status_label",
            "leads_count",
            "ctr",
            "visitors_count",
            "budget_amount",
            "budget_currency",
            "starts_at",
            "ends_at",
            "created_at",
            "updated_at",
        )
