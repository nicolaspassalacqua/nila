from django.contrib import admin

from .models import (
    DashboardSnapshot,
    Establishment,
    Invoice,
    MembershipPlan,
    Organization,
    OrganizationMembership,
    Payment,
    PlatformSetting,
    Room,
    StudioClass,
    Student,
    StudentHistory,
    UserProfile,
)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "is_active", "created_at")
    search_fields = ("name", "legal_name", "tax_id")


@admin.register(Establishment)
class EstablishmentAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "organization", "city", "is_active")
    search_fields = ("name", "city")
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
    list_display = ("id", "singleton_key", "allow_google_sso", "allow_facebook_sso", "updated_at")
