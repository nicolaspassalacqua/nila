import re
import unicodedata
from datetime import datetime, timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from booking.models import Appointment, BlockedSlot
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
            slot_data = self._build_next_slots(service, now)
            tenant_bucket = grouped.setdefault(
                service.tenant_id,
                {
                    "tenant_id": service.tenant_id,
                    "tenant_name": service.tenant.name,
                    "tenant_photo_url": service.tenant.photo_url,
                    "tenant_address": service.tenant.address,
                    "tenant_description": service.tenant.description,
                    "tenant_opening_hours": service.tenant.opening_hours,
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
                    "service_type": service.service_type,
                    "service_config": service.service_config or {},
                    "available_slots": slot_data["available_slots"],
                    "unavailable_slots": slot_data["unavailable_slots"],
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
        duration = max(int(service.duration_min or 60), 15)
        config = service.service_config or {}
        min_advance_hours = int(config.get("min_advance_hours") or 1)
        tz = timezone.get_current_timezone()
        base_start = timezone.localtime(now, tz) + timedelta(hours=min_advance_hours)
        base_start = self._round_to_duration(base_start, duration)

        active = Appointment.objects.filter(
            tenant_id=service.tenant_id,
            status__in=[Appointment.Status.CONFIRMED],
            end_dt__gte=now,
        )
        if service.service_type == Service.ServiceType.ALQUILER_CANCHA:
            active = active.filter(service__service_type=Service.ServiceType.ALQUILER_CANCHA)
        else:
            active = active.filter(service_id=service.id)
        active = active.only("start_dt", "end_dt", "court_name", "status")
        blocked = BlockedSlot.objects.filter(
            tenant_id=service.tenant_id,
            end_dt__gte=now,
        ).only("start_dt", "end_dt", "court_name")

        included_courts = config.get("included_courts") if isinstance(config.get("included_courts"), list) else []
        included_court_names = [
            str(court.get("name", "")).strip()
            for court in included_courts
            if isinstance(court, dict) and str(court.get("name", "")).strip()
        ]

        def resolve_slot_state(start_dt, end_dt):
            overlap_qs = active.filter(start_dt__lt=end_dt, end_dt__gt=start_dt)
            overlap_items = list(overlap_qs)
            blocked_overlap = list(blocked.filter(start_dt__lt=end_dt, end_dt__gt=start_dt))
            if service.service_type != Service.ServiceType.ALQUILER_CANCHA or not included_court_names:
                if blocked_overlap:
                    return {
                        "is_available": False,
                        "availability": "blocked",
                        "legend": "No disponible (bloqueado por profesional)",
                    }
                if not overlap_items:
                    return {"is_available": True, "availability": "available", "legend": "Disponible"}
                return {
                    "is_available": False,
                    "availability": "confirmed",
                    "legend": "No disponible (reservado)",
                }

            blocked_courts = {str(item.court_name or "").strip() for item in blocked_overlap}
            has_global_block = any(not name for name in blocked_courts)
            if has_global_block:
                return {
                    "is_available": False,
                    "availability": "blocked",
                    "legend": "No disponible (bloqueado por profesional)",
                }
            busy_confirmed = {str(item.court_name or "").strip() for item in overlap_items}
            if not overlap_items and not blocked_courts:
                return {"is_available": True, "availability": "available", "legend": "Disponible"}
            unavailable_courts = {
                name
                for name in included_court_names
                if (name in blocked_courts) or (name in busy_confirmed)
            }
            free_count = len([name for name in included_court_names if name not in unavailable_courts])
            if free_count > 0:
                return {
                    "is_available": True,
                    "availability": "available",
                    "legend": f"{free_count}/{len(included_court_names)} canchas libres",
                }
            if blocked_courts:
                return {
                    "is_available": False,
                    "availability": "blocked",
                    "legend": "No disponible (bloqueado por profesional)",
                }
            return {
                "is_available": False,
                "availability": "confirmed",
                "legend": "No disponible (reservado)",
            }

        schedule = self._parse_opening_hours(service.tenant.opening_hours)
        timeline = []
        max_slots = 24

        if schedule["ranges"]:
            max_days_ahead = 14
            for day_offset in range(0, max_days_ahead + 1):
                if len(timeline) >= max_slots:
                    break
                day = (base_start + timedelta(days=day_offset)).date()
                if schedule["days"] and day.weekday() not in schedule["days"]:
                    continue

                for open_hour, open_min, close_hour, close_min in schedule["ranges"]:
                    day_open = timezone.make_aware(
                        datetime(day.year, day.month, day.day, open_hour, open_min),
                        tz,
                    )
                    day_close = timezone.make_aware(
                        datetime(day.year, day.month, day.day, close_hour, close_min),
                        tz,
                    )
                    if day_close <= day_open:
                        day_close = day_close + timedelta(days=1)

                    cursor = self._round_to_duration(max(base_start, day_open), duration)
                    while cursor + timedelta(minutes=duration) <= day_close and len(timeline) < max_slots:
                        slot_end = cursor + timedelta(minutes=duration)
                        slot_state = resolve_slot_state(cursor, slot_end)
                        timeline.append(
                            {
                                "start_iso": cursor.isoformat(),
                                "label": cursor.strftime("%d/%m/%Y %H:%M"),
                                "availability": slot_state["availability"],
                                "legend": slot_state["legend"],
                            }
                        )
                        cursor = cursor + timedelta(minutes=duration)
        else:
            cursor = base_start
            safety = 0
            while len(timeline) < max_slots and safety < 300:
                safety += 1
                slot_end = cursor + timedelta(minutes=duration)
                slot_state = resolve_slot_state(cursor, slot_end)
                timeline.append(
                    {
                        "start_iso": cursor.isoformat(),
                        "label": cursor.strftime("%d/%m/%Y %H:%M"),
                        "availability": slot_state["availability"],
                        "legend": slot_state["legend"],
                    }
                )
                cursor = cursor + timedelta(minutes=duration)
        available_slots = [
            {"start_iso": item["start_iso"], "label": item["label"]}
            for item in timeline
            if item["availability"] == "available"
        ]
        unavailable_slots = [
            {
                "start_iso": item["start_iso"],
                "label": item["label"],
                "availability": item["availability"],
                "legend": item["legend"],
            }
            for item in timeline
            if item["availability"] != "available"
        ]
        return {"available_slots": available_slots, "unavailable_slots": unavailable_slots}

    def _round_to_duration(self, value, duration_min):
        value = value.replace(second=0, microsecond=0)
        minute_offset = value.minute % duration_min
        if minute_offset != 0:
            value = value + timedelta(minutes=(duration_min - minute_offset))
        return value

    def _parse_opening_hours(self, raw):
        text = str(raw or "").strip()
        if not text:
            return {"days": set(), "ranges": []}

        time_match = re.search(r"\d{2}:\d{2}\s*-\s*\d{2}:\d{2}", text)
        day_part = text[: time_match.start()].strip() if time_match else text
        normalized_day_part = unicodedata.normalize("NFKD", day_part.lower()).encode("ascii", "ignore").decode("ascii")

        day_map = {"lun": 0, "mar": 1, "mie": 2, "jue": 3, "vie": 4, "sab": 5, "dom": 6}
        days = set()
        for token in [item.strip() for item in normalized_day_part.split(",") if item.strip()]:
            code = day_map.get(token[:3])
            if code is not None:
                days.add(code)

        if not days:
            if "lun a vie" in normalized_day_part:
                days = {0, 1, 2, 3, 4}
            elif "lun a sab" in normalized_day_part:
                days = {0, 1, 2, 3, 4, 5}
            elif "lun a dom" in normalized_day_part:
                days = {0, 1, 2, 3, 4, 5, 6}

        ranges = []
        for open_h, open_m, close_h, close_m in re.findall(r"(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})", text):
            ranges.append((int(open_h), int(open_m), int(close_h), int(close_m)))

        return {"days": days, "ranges": ranges}


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
