import json
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal

from django.db.models import Avg, Count, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from studio.models import (
    AIAssistantConfig,
    AIAssistantInteraction,
    InstructorProfile,
    InstructorSettlement,
    MembershipPlan,
    Organization,
    OrganizationMembership,
    Payment,
    SocialCampaign,
    SocialPost,
    Student,
    StudioClass,
)
from studio.modules.users.services import is_owner, is_platform_admin

from .serializers import AIAssistantConfigSerializer, AIAssistantInteractionSerializer


DEFAULT_SYSTEM_PROMPT = (
    "Eres el asistente operativo del owner de un estudio de pilates. "
    "Responde solo con la informacion del contexto provisto. "
    "Si un dato no existe en el sistema, dilo explicitamente. "
    "Prioriza respuestas accionables sobre clases, ocupacion, turnos, disponibilidad, alumnos, instructores y finanzas."
)


def get_owned_org_ids(user):
    return list(
        OrganizationMembership.objects.filter(user=user, is_active=True).values_list("organization_id", flat=True)
    )


def get_authorized_org_ids(user):
    if is_platform_admin(user):
        return list(Organization.objects.values_list("id", flat=True))
    if is_owner(user):
        return get_owned_org_ids(user)
    return []


def get_default_model(provider):
    if provider == AIAssistantConfig.PROVIDER_GEMINI:
        return "gemini-2.0-flash"
    if provider == AIAssistantConfig.PROVIDER_OLLAMA:
        return "llama3.2"
    return "gpt-5-mini"


def get_or_create_config_for_org(organization):
    config, _created = AIAssistantConfig.objects.get_or_create(
        organization=organization,
        defaults={
            "provider": AIAssistantConfig.PROVIDER_OPENAI,
            "model": get_default_model(AIAssistantConfig.PROVIDER_OPENAI),
            "system_prompt": DEFAULT_SYSTEM_PROMPT,
            "temperature": Decimal("0.20"),
            "max_context_items": 8,
        },
    )
    if not config.model:
        config.model = get_default_model(config.provider)
        config.save(update_fields=["model"])
    if not config.system_prompt:
        config.system_prompt = DEFAULT_SYSTEM_PROMPT
        config.save(update_fields=["system_prompt"])
    return config


def build_business_context(organization, config):
    now = timezone.now()
    max_items = max(3, min(int(config.max_context_items or 8), 20))
    context = {
        "organization": {
            "id": organization.id,
            "name": organization.name,
            "subscription_plan": organization.subscription_plan or "",
            "subscription_status": organization.subscription_status or "",
            "currency": organization.currency or "ARS",
            "brand_color": organization.brand_color or "",
        }
    }

    if config.include_classes_context:
        classes_qs = StudioClass.objects.filter(organization=organization).select_related(
            "establishment",
            "room",
            "instructor",
        )
        upcoming_qs = classes_qs.filter(start_at__gte=now).order_by("start_at")[:max_items]
        status_counts = {
            item["status"]: item["count"]
            for item in classes_qs.values("status").annotate(count=Count("id"))
        }
        context["classes"] = {
            "total": classes_qs.count(),
            "status_counts": status_counts,
            "upcoming": [
                {
                    "name": studio_class.name,
                    "start_at": studio_class.start_at.isoformat(),
                    "end_at": studio_class.end_at.isoformat(),
                    "establishment": studio_class.establishment.name if studio_class.establishment_id else "",
                    "room": studio_class.room.name if studio_class.room_id else "",
                    "instructor": studio_class.instructor.username if studio_class.instructor_id else "",
                    "capacity": studio_class.capacity,
                    "status": studio_class.status,
                }
                for studio_class in upcoming_qs
            ],
        }

    if config.include_students_context:
        students_qs = Student.objects.filter(organization=organization)
        context["students"] = {
            "total": students_qs.count(),
            "active": students_qs.filter(is_active=True).count(),
            "by_level": list(
                students_qs.exclude(current_level="").values("current_level").annotate(count=Count("id")).order_by("-count")[:max_items]
            ),
            "recent": [
                {
                    "name": f"{student.first_name} {student.last_name}".strip(),
                    "email": student.email,
                    "level": student.current_level or "",
                    "created_at": student.created_at.isoformat(),
                }
                for student in students_qs.order_by("-created_at")[:max_items]
            ],
        }

    if config.include_finance_context:
        payments_qs = Payment.objects.filter(organization=organization)
        approved_total = (
            payments_qs.filter(status=Payment.STATUS_APPROVED).aggregate(total=Sum("amount")).get("total") or Decimal("0")
        )
        pending_total = (
            payments_qs.filter(status=Payment.STATUS_PENDING).aggregate(total=Sum("amount")).get("total") or Decimal("0")
        )
        settlements_qs = InstructorSettlement.objects.filter(organization=organization)
        membership_qs = MembershipPlan.objects.filter(organization=organization, is_active=True)
        context["finance"] = {
            "payments_total": payments_qs.count(),
            "approved_total": float(approved_total),
            "pending_total": float(pending_total),
            "by_type": list(
                payments_qs.values("payment_type", "status").annotate(total=Count("id"), amount=Sum("amount")).order_by("-amount")[:max_items]
            ),
            "membership_plans": [
                {
                    "name": plan.name,
                    "price": float(plan.price),
                    "currency": plan.currency,
                    "duration_days": plan.duration_days,
                    "classes_per_week": plan.classes_per_week,
                }
                for plan in membership_qs[:max_items]
            ],
            "instructor_costs_pending": float(
                settlements_qs.filter(status=InstructorSettlement.STATUS_PENDING).aggregate(total=Sum("amount")).get("total")
                or Decimal("0")
            ),
        }

    if config.include_instructors_context:
        instructors_qs = InstructorProfile.objects.filter(organization=organization).select_related("user")
        context["instructors"] = {
            "total": instructors_qs.count(),
            "active": instructors_qs.filter(is_active=True).count(),
            "profiles": [
                {
                    "username": profile.user.username,
                    "scheme": profile.compensation_scheme,
                    "hourly_rate": float(profile.hourly_rate),
                    "monthly_salary": float(profile.monthly_salary),
                    "class_rate": float(profile.class_rate),
                    "currency": profile.currency,
                }
                for profile in instructors_qs[:max_items]
            ],
        }

    social_posts = SocialPost.objects.filter(organization=organization).count()
    social_campaigns = SocialCampaign.objects.filter(organization=organization).count()
    context["marketing"] = {
        "social_posts": social_posts,
        "social_campaigns": social_campaigns,
    }
    return context


def call_openai(config, question, context_payload):
    url = "https://api.openai.com/v1/responses"
    payload = {
        "model": config.model or get_default_model(config.provider),
        "instructions": config.system_prompt or DEFAULT_SYSTEM_PROMPT,
        "input": (
            "Contexto del negocio:\n"
            f"{json.dumps(context_payload, ensure_ascii=True)}\n\n"
            f"Pregunta del owner:\n{question}"
        ),
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config.api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if isinstance(payload.get("output_text"), str) and payload["output_text"].strip():
        return payload["output_text"].strip()
    for item in payload.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text" and content.get("text"):
                return content["text"].strip()
    raise ValueError("OpenAI no devolvio texto util")


def call_gemini(config, question, context_payload):
    model = config.model or get_default_model(config.provider)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={urllib.parse.quote(config.api_key)}"
    payload = {
        "system_instruction": {
            "parts": {"text": config.system_prompt or DEFAULT_SYSTEM_PROMPT},
        },
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            "Contexto del negocio:\n"
                            f"{json.dumps(context_payload, ensure_ascii=True)}\n\n"
                            f"Pregunta del owner:\n{question}"
                        )
                    }
                ],
            }
        ],
        "generationConfig": {
            "temperature": float(config.temperature or 0.2),
        },
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))
    candidates = payload.get("candidates") or []
    parts = (((candidates[0] or {}).get("content") or {}).get("parts") or []) if candidates else []
    text = "\n".join(part.get("text", "").strip() for part in parts if part.get("text")).strip()
    if not text:
        raise ValueError("Gemini no devolvio texto util")
    return text


def call_ollama(config, question, context_payload):
    base_url = (config.base_url or "http://localhost:11434").rstrip("/")
    url = f"{base_url}/api/generate"
    prompt = (
        f"{config.system_prompt or DEFAULT_SYSTEM_PROMPT}\n\n"
        "Contexto del negocio:\n"
        f"{json.dumps(context_payload, ensure_ascii=True)}\n\n"
        f"Pregunta del owner:\n{question}"
    )
    payload = {
        "model": config.model or get_default_model(config.provider),
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": float(config.temperature or 0.2)},
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))
    text = str(payload.get("response") or "").strip()
    if not text:
        raise ValueError("Ollama no devolvio texto util")
    return text


def run_llm_query(config, question, context_payload):
    if config.provider == AIAssistantConfig.PROVIDER_GEMINI:
        return call_gemini(config, question, context_payload)
    if config.provider == AIAssistantConfig.PROVIDER_OLLAMA:
        return call_ollama(config, question, context_payload)
    return call_openai(config, question, context_payload)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def ai_assistant_config(request):
    org_ids = get_authorized_org_ids(request.user)
    if not org_ids:
        return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

    organization_id = request.data.get("organization_id") if request.method == "POST" else request.query_params.get("organization_id")
    try:
        organization_id = int(organization_id) if organization_id else int(org_ids[0])
    except (TypeError, ValueError):
        return Response({"detail": "organization_id invalido"}, status=status.HTTP_400_BAD_REQUEST)
    if organization_id not in org_ids:
        return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

    organization = get_object_or_404(Organization, id=organization_id)
    config = get_or_create_config_for_org(organization)

    if request.method == "GET":
        return Response(AIAssistantConfigSerializer(config).data)

    serializer = AIAssistantConfigSerializer(config, data={**request.data, "organization": organization.id}, partial=True)
    serializer.is_valid(raise_exception=True)
    if "provider" in serializer.validated_data and not serializer.validated_data.get("model"):
        serializer.validated_data["model"] = get_default_model(serializer.validated_data["provider"])
    serializer.save()
    return Response(AIAssistantConfigSerializer(config).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ai_assistant_history(request):
    org_ids = get_authorized_org_ids(request.user)
    if not org_ids:
        return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

    organization_id = request.query_params.get("organization_id")
    try:
        organization_id = int(organization_id) if organization_id else int(org_ids[0])
    except (TypeError, ValueError):
        return Response({"detail": "organization_id invalido"}, status=status.HTTP_400_BAD_REQUEST)
    if organization_id not in org_ids:
        return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

    interactions = AIAssistantInteraction.objects.filter(organization_id=organization_id)[:30]
    return Response(AIAssistantInteractionSerializer(interactions, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_assistant_ask(request):
    org_ids = get_authorized_org_ids(request.user)
    if not org_ids:
        return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

    question = str(request.data.get("question") or "").strip()
    if not question:
        return Response({"detail": "question es requerido"}, status=status.HTTP_400_BAD_REQUEST)

    organization_id = request.data.get("organization_id")
    try:
        organization_id = int(organization_id) if organization_id else int(org_ids[0])
    except (TypeError, ValueError):
        return Response({"detail": "organization_id invalido"}, status=status.HTTP_400_BAD_REQUEST)
    if organization_id not in org_ids:
        return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

    organization = get_object_or_404(Organization, id=organization_id)
    config = get_or_create_config_for_org(organization)
    if not config.is_enabled:
        return Response({"detail": "Activa el modulo IA y configura un proveedor antes de consultar."}, status=status.HTTP_400_BAD_REQUEST)
    if config.provider in (AIAssistantConfig.PROVIDER_OPENAI, AIAssistantConfig.PROVIDER_GEMINI) and not config.api_key:
        return Response({"detail": "Falta API key para el proveedor configurado."}, status=status.HTTP_400_BAD_REQUEST)

    context_payload = build_business_context(organization, config)
    try:
        answer = run_llm_query(config, question, context_payload)
        interaction = AIAssistantInteraction.objects.create(
            organization=organization,
            user=request.user,
            provider=config.provider,
            model=config.model,
            question=question,
            answer=answer,
            status=AIAssistantInteraction.STATUS_SUCCESS,
            context_snapshot=context_payload,
        )
        return Response(
            {
                "answer": answer,
                "interaction": AIAssistantInteractionSerializer(interaction).data,
                "context": context_payload,
            }
        )
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as error:
        interaction = AIAssistantInteraction.objects.create(
            organization=organization,
            user=request.user,
            provider=config.provider,
            model=config.model,
            question=question,
            answer="",
            status=AIAssistantInteraction.STATUS_ERROR,
            error_message=str(error),
            context_snapshot=context_payload,
        )
        return Response(
            {
                "detail": f"No se pudo consultar el proveedor IA: {error}",
                "interaction": AIAssistantInteractionSerializer(interaction).data,
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )
