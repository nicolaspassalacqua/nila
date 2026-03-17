"""
Studio models aggregator.
Keeps compatibility with imports like `from studio.models import ...`
while each domain owns its own models file (Odoo-style modularization).
"""

from studio.modules.core.models import Establishment, Organization, OrganizationMembership, Room
from studio.modules.classes.models import InstructorProfile, InstructorSettlement, StudioClass
from studio.modules.dashboard.models import DashboardSnapshot
from studio.modules.payments.models import Invoice, MembershipPlan, Payment
from studio.modules.social.models import SocialAccount, SocialCampaign, SocialPost
from studio.modules.students.models import Student, StudentHistory
from studio.modules.users.models import PlatformSetting, PlatformSubscriptionPlan, UserProfile

__all__ = [
    "Organization",
    "Establishment",
    "Room",
    "InstructorProfile",
    "InstructorSettlement",
    "StudioClass",
    "OrganizationMembership",
    "Student",
    "StudentHistory",
    "MembershipPlan",
    "Payment",
    "Invoice",
    "SocialAccount",
    "SocialPost",
    "SocialCampaign",
    "UserProfile",
    "PlatformSetting",
    "PlatformSubscriptionPlan",
    "DashboardSnapshot",
]
