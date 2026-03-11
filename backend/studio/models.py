"""
Studio models aggregator.
Keeps compatibility with imports like `from studio.models import ...`
while each domain owns its own models file (Odoo-style modularization).
"""

from studio.modules.core.models import Establishment, Organization, OrganizationMembership, Room
from studio.modules.classes.models import StudioClass
from studio.modules.dashboard.models import DashboardSnapshot
from studio.modules.payments.models import Invoice, MembershipPlan, Payment
from studio.modules.students.models import Student, StudentHistory
from studio.modules.users.models import PlatformSetting, UserProfile

__all__ = [
    "Organization",
    "Establishment",
    "Room",
    "StudioClass",
    "OrganizationMembership",
    "Student",
    "StudentHistory",
    "MembershipPlan",
    "Payment",
    "Invoice",
    "UserProfile",
    "PlatformSetting",
    "DashboardSnapshot",
]
