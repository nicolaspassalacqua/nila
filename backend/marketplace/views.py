from datetime import timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from booking.models import Appointment
from core.models import Tenant, TenantRating, TenantSubscription, TenantSubscriptionPlan
from core.tenant_access import get_tenant_for_request
from marketplace.models import Service
from marketplace.serializers import ServiceSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return Service.objects.filter(tenant=tenant).order_by("name")

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        serializer.save(tenant=tenant)


class MarketplaceDiscoveryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = (request.query_params.get("q") or "").strip()
        discipline = (request.query_params.get("discipline") or "").strip()

        tenant_ids = list(
            Tenant.objects.filter(
                memberships__user=request.user,
                memberships__is_active=True,
                is_active=True,
            )
            .values_list("id", flat=True)
            .distinct()
        )

        services = Service.objects.filter(tenant_id__in=tenant_ids, is_active=True)
        if query:
            services = services.filter(
                Q(name__icontains=query)
                | Q(discipline__icontains=query)
                | Q(description__icontains=query)
            )
        if discipline and discipline.lower() != "todas":
            services = services.filter(discipline=discipline)

        services = services.select_related("tenant").order_by("tenant__name", "name")

        ratings = {
            row["tenant_id"]: {
                "avg": float(row["avg_score"] or 0),
                "count": int(row["reviews_count"] or 0),
            }
            for row in TenantRating.objects.filter(tenant_id__in=tenant_ids)
            .values("tenant_id")
            .annotate(avg_score=Avg("score"), reviews_count=Count("id"))
        }
        subscriptions = {
            sub.tenant_id: sub
            for sub in TenantSubscription.objects.select_related("plan").filter(
                tenant_id__in=tenant_ids,
                user=request.user,
                status=TenantSubscription.Status.ACTIVE,
            )
        }
        plans_by_tenant = {}
        for plan in TenantSubscriptionPlan.objects.filter(tenant_id__in=tenant_ids, is_active=True).order_by("price", "name"):
            plans_by_tenant.setdefault(plan.tenant_id, []).append(plan)

        now = timezone.now()
        grouped = {}
        for service in services:
            next_slots = self._build_next_slots(service, now)
            tenant_bucket = grouped.setdefault(
                service.tenant_id,
                {
                    "tenant_id": service.tenant_id,
                    "tenant_name": service.tenant.name,
                    "rating_avg": round(ratings.get(service.tenant_id, {}).get("avg", 0), 2),
                    "rating_count": ratings.get(service.tenant_id, {}).get("count", 0),
                    "is_subscribed": bool(subscriptions.get(service.tenant_id)),
                    "active_subscription": self._serialize_subscription(subscriptions.get(service.tenant_id)),
                    "plans": self._serialize_plans(plans_by_tenant.get(service.tenant_id, [])),
                    "services": [],
                },
            )
            tenant_bucket["services"].append(
                {
                    "id": service.id,
                    "name": service.name,
                    "discipline": service.discipline,
                    "description": service.description,
                    "price": str(service.price),
                    "duration_min": service.duration_min,
                    "is_online": service.is_online,
                    "available_slots": next_slots,
                }
            )

        return Response({"establishments": list(grouped.values())})

    def _serialize_plans(self, plans):
        return [
            {
                "id": plan.id,
                "name": plan.name,
                "description": plan.description,
                "price": str(plan.price),
                "billing_cycle": plan.billing_cycle,
            }
            for plan in plans
        ]

    def _serialize_subscription(self, subscription):
        if not subscription:
            return None
        return {
            "id": subscription.id,
            "status": subscription.status,
            "amount": str(subscription.amount),
            "label": subscription.label,
            "plan_id": subscription.plan_id,
            "starts_at": subscription.starts_at.isoformat() if subscription.starts_at else None,
            "ends_at": subscription.ends_at.isoformat() if subscription.ends_at else None,
        }

    def _build_next_slots(self, service: Service, now):
        active = Appointment.objects.filter(
            tenant_id=service.tenant_id,
            service_id=service.id,
            status__in=[Appointment.Status.REQUESTED, Appointment.Status.CONFIRMED],
            end_dt__gte=now,
        ).order_by("start_dt")

        base_start = now + timedelta(minutes=60)
        if active.exists():
            last_end = active.last().end_dt
            if last_end and last_end > base_start:
                base_start = last_end

        duration = max(int(service.duration_min or 60), 15)
        slots = []
        for idx in range(3):
            start = base_start + timedelta(minutes=duration * idx)
            slots.append(
                {
                    "start_iso": start.isoformat(),
                    "label": timezone.localtime(start).strftime("%d/%m/%Y %H:%M"),
                }
            )
        return slots


class EstablishmentSubscribeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, tenant_id: int):
        tenant = Tenant.objects.filter(
            id=tenant_id,
            memberships__user=request.user,
            memberships__is_active=True,
            is_active=True,
        ).first()
        if not tenant:
            return Response({"detail": "No tienes acceso a este establecimiento."}, status=403)

        plan_id = request.data.get("plan_id")
        plan = None
        if plan_id:
            plan = TenantSubscriptionPlan.objects.filter(id=plan_id, tenant=tenant, is_active=True).first()
            if not plan:
                return Response({"detail": "Plan invalido para este establecimiento."}, status=400)
        else:
            plan = TenantSubscriptionPlan.objects.filter(tenant=tenant, is_active=True).order_by("price", "name").first()

        if plan:
            amount = plan.price
            label = plan.name
        else:
            amount = 0
            label = "Plan base"

        subscription, _created = TenantSubscription.objects.get_or_create(
            tenant=tenant,
            user=request.user,
            defaults={
                "plan": plan,
                "status": TenantSubscription.Status.ACTIVE,
                "amount": amount,
                "label": label,
            },
        )
        if subscription.status != TenantSubscription.Status.ACTIVE or subscription.plan_id != (plan.id if plan else None):
            subscription.plan = plan
            subscription.status = TenantSubscription.Status.ACTIVE
            subscription.amount = amount
            subscription.label = label
            subscription.ends_at = None
            subscription.save(update_fields=["plan", "status", "amount", "label", "ends_at", "updated_at"])

        return Response(
            {
                "tenant_id": tenant.id,
                "tenant_name": tenant.name,
                "status": subscription.status,
                "amount": str(subscription.amount),
                "label": subscription.label,
                "plan_id": subscription.plan_id,
            }
        )
