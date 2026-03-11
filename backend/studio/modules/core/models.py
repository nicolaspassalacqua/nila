from django.db import models


def default_enabled_modules():
    return ["configuracion", "pos", "alumnos", "clases", "tutoriales", "tableros", "contactos", "redes_sociales"]


def default_weekly_hours():
    return {
        "mon": {"enabled": False, "morning_start": "", "morning_end": "", "afternoon_start": "", "afternoon_end": ""},
        "tue": {"enabled": False, "morning_start": "", "morning_end": "", "afternoon_start": "", "afternoon_end": ""},
        "wed": {"enabled": False, "morning_start": "", "morning_end": "", "afternoon_start": "", "afternoon_end": ""},
        "thu": {"enabled": False, "morning_start": "", "morning_end": "", "afternoon_start": "", "afternoon_end": ""},
        "fri": {"enabled": False, "morning_start": "", "morning_end": "", "afternoon_start": "", "afternoon_end": ""},
        "sat": {"enabled": False, "morning_start": "", "morning_end": "", "afternoon_start": "", "afternoon_end": ""},
        "sun": {"enabled": False, "morning_start": "", "morning_end": "", "afternoon_start": "", "afternoon_end": ""},
    }

class Organization(models.Model):
    TAX_CONDITION_MONOTRIBUTO = "monotributista"
    TAX_CONDITION_RESPONSABLE_INSCRIPTO = "responsable_inscripto"
    TAX_CONDITION_EXENTO = "exento"
    TAX_CONDITION_CONSUMIDOR_FINAL = "consumidor_final"
    TAX_CONDITION_OTRO = "otro"
    TAX_CONDITION_CHOICES = (
        (TAX_CONDITION_MONOTRIBUTO, "Monotributista"),
        (TAX_CONDITION_RESPONSABLE_INSCRIPTO, "Responsable Inscripto"),
        (TAX_CONDITION_EXENTO, "Exento"),
        (TAX_CONDITION_CONSUMIDOR_FINAL, "Consumidor Final"),
        (TAX_CONDITION_OTRO, "Otro"),
    )
    IIBB_TYPE_LOCAL = "local"
    IIBB_TYPE_CONVENIO = "convenio_multilateral"
    IIBB_TYPE_EXENTO = "exento"
    IIBB_TYPE_CHOICES = (
        (IIBB_TYPE_LOCAL, "Contribuyente local"),
        (IIBB_TYPE_CONVENIO, "Convenio multilateral"),
        (IIBB_TYPE_EXENTO, "Exento"),
    )
    BILLING_SYSTEM_WS = "wsfe"
    BILLING_SYSTEM_COMPROBANTES_EN_LINEA = "comprobantes_en_linea"
    BILLING_SYSTEM_CHOICES = (
        (BILLING_SYSTEM_WS, "Webservice WSFE"),
        (BILLING_SYSTEM_COMPROBANTES_EN_LINEA, "Comprobantes en linea"),
    )
    BILLING_ENV_TEST = "homologacion"
    BILLING_ENV_PROD = "produccion"
    BILLING_ENV_CHOICES = (
        (BILLING_ENV_TEST, "Homologacion"),
        (BILLING_ENV_PROD, "Produccion"),
    )

    name = models.CharField(max_length=150, unique=True)
    logo = models.TextField(blank=True)
    legal_name = models.CharField(max_length=200, blank=True)
    tax_id = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=250, blank=True)
    tax_condition = models.CharField(max_length=40, choices=TAX_CONDITION_CHOICES, blank=True)
    enabled_modules = models.JSONField(default=default_enabled_modules, blank=True)
    fiscal_document_issued = models.BooleanField(default=False)
    mercadolibre_enabled = models.BooleanField(default=False)
    electronic_billing_enabled = models.BooleanField(default=False)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    fiscal_street = models.CharField(max_length=120, blank=True)
    fiscal_street_number = models.CharField(max_length=20, blank=True)
    fiscal_floor = models.CharField(max_length=20, blank=True)
    fiscal_apartment = models.CharField(max_length=20, blank=True)
    fiscal_city = models.CharField(max_length=100, blank=True)
    fiscal_province = models.CharField(max_length=100, blank=True)
    fiscal_postal_code = models.CharField(max_length=20, blank=True)
    activity_start_date = models.DateField(null=True, blank=True)
    main_activity_code = models.CharField(max_length=20, blank=True)
    fiscal_email = models.EmailField(blank=True)
    fiscal_phone = models.CharField(max_length=30, blank=True)
    iibb_number = models.CharField(max_length=40, blank=True)
    iibb_type = models.CharField(max_length=40, choices=IIBB_TYPE_CHOICES, blank=True)
    iibb_jurisdiction = models.CharField(max_length=100, blank=True)
    iibb_condition = models.CharField(max_length=80, blank=True)
    afip_pos_number = models.PositiveIntegerField(null=True, blank=True)
    afip_pos_billing_system = models.CharField(max_length=40, choices=BILLING_SYSTEM_CHOICES, blank=True)
    afip_pos_address = models.CharField(max_length=250, blank=True)
    wsaa_certificate_alias = models.CharField(max_length=120, blank=True)
    afip_environment = models.CharField(max_length=20, choices=BILLING_ENV_CHOICES, blank=True)
    is_active = models.BooleanField(default=True)
    subscription_enabled = models.BooleanField(default=False)
    subscription_plan = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Establishment(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="establishments")
    name = models.CharField(max_length=150)
    address = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100, blank=True)
    open_time = models.TimeField(null=True, blank=True)
    close_time = models.TimeField(null=True, blank=True)
    weekly_hours = models.JSONField(default=default_weekly_hours, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("organization", "name")

    def __str__(self):
        return f"{self.organization.name} - {self.name}"


class Room(models.Model):
    establishment = models.ForeignKey(Establishment, on_delete=models.CASCADE, related_name="rooms")
    name = models.CharField(max_length=120)
    room_type = models.CharField(max_length=80, blank=True)
    capacity = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    is_blocked = models.BooleanField(default=False)
    blocked_reason = models.CharField(max_length=200, blank=True)
    blocked_from = models.DateTimeField(null=True, blank=True)
    blocked_to = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("establishment", "name")

    def __str__(self):
        return f"{self.establishment.name} - {self.name}"


class OrganizationMembership(models.Model):
    ROLE_OWNER = "owner"
    ROLE_MANAGER = "manager"
    ROLE_CHOICES = (
        (ROLE_OWNER, "Owner"),
        (ROLE_MANAGER, "Manager"),
    )

    user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="organization_memberships")
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_OWNER)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "organization")

    def __str__(self):
        return f"{self.user_id}-{self.organization_id}-{self.role}"

