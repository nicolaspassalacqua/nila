from django.contrib import admin

from .models import (
    DashboardSnapshot,
    Establishment,
    InstructorProfile,
    InstructorSettlement,
    Invoice,
    MembershipPlan,
    Organization,
    OrganizationMembership,
    Payment,
    PlatformSetting,
    PlatformSubscriptionPlan,
    Room,
    StudioClass,
    Student,
    StudentHistory,
    UserProfile,
)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "subscription_plan", "subscription_status", "subscription_enabled", "is_active", "created_at")
    search_fields = ("name", "legal_name", "tax_id")
    list_filter = ("subscription_status", "subscription_enabled", "is_active")


@admin.register(Establishment)
class EstablishmentAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "organization", "city", "phone", "email", "is_active")
    search_fields = ("name", "city", "phone", "email")
    list_filter = ("organization", "is_active")


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "establishment", "capacity", "is_active")
    search_fields = ("name", "room_type")
    list_filter = ("establishment", "is_active")


@admin.register(StudioClass)
class StudioClassAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "organization", "establishment", "instructor", "start_at", "status")
    list_filter = ("organization", "establishment", "status")
    search_fields = ("name", "instructor__username")


@admin.register(InstructorProfile)
class InstructorProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "organization",
        "compensation_scheme",
        "hourly_rate",
        "monthly_salary",
        "class_rate",
        "currency",
        "is_active",
    )
    list_filter = ("organization", "compensation_scheme", "currency", "is_active")
    search_fields = ("user__username", "user__email", "organization__name")


@admin.register(InstructorSettlement)
class InstructorSettlementAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "organization",
        "instructor_profile",
        "period_year",
        "period_month",
        "status",
        "amount",
        "currency",
        "paid_at",
    )
    list_filter = ("organization", "status", "currency", "period_year", "period_month")
    search_fields = (
        "organization__name",
        "instructor_profile__user__username",
        "instructor_profile__user__email",
    )


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("id", "first_name", "last_name", "organization", "user", "auth_provider", "current_level", "is_active")
    search_fields = ("first_name", "last_name", "email", "phone", "user__username", "user__email")
    list_filter = ("organization", "auth_provider", "is_active", "current_level")


@admin.register(StudentHistory)
class StudentHistoryAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "event_type", "actor", "created_at")
    search_fields = ("student__first_name", "student__last_name", "description")
    list_filter = ("event_type", "created_at")


@admin.register(MembershipPlan)
class MembershipPlanAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "organization", "price", "currency", "is_active")
    list_filter = ("organization", "is_active")
    search_fields = ("name", "organization__name")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "organization", "payment_type", "provider", "status", "amount", "currency", "created_at")
    list_filter = ("organization", "payment_type", "provider", "status")
    search_fields = ("external_reference", "payer_email", "payer_name")


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("id", "organization", "payment", "status", "invoice_number", "cae", "emitted_at")
    list_filter = ("organization", "status", "voucher_type")
    search_fields = ("invoice_number", "cae")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "preferred_language", "timezone", "is_premium", "updated_at")
    search_fields = ("user__username", "user__email")
    list_filter = ("is_premium", "preferred_language")


@admin.register(DashboardSnapshot)
class DashboardSnapshotAdmin(admin.ModelAdmin):
    list_display = ("id", "generated_at")


@admin.register(OrganizationMembership)
class OrganizationMembershipAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "organization", "role", "is_active", "created_at")
    list_filter = ("role", "is_active")
    search_fields = ("user__username", "organization__name")


@admin.register(PlatformSetting)
class PlatformSettingAdmin(admin.ModelAdmin):
    list_display = ("id", "singleton_key", "allow_google_sso", "allow_facebook_sso", "google_client_id", "facebook_app_id", "updated_at")


@admin.register(PlatformSubscriptionPlan)
class PlatformSubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "code",
        "name",
        "price",
        "currency",
        "billing_period",
        "allow_self_signup",
        "is_public",
        "is_active",
    )
    list_filter = ("is_active", "is_public", "allow_self_signup", "billing_period")
    search_fields = ("code", "name", "marketing_tag")
