from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from booking.models import Appointment
from core.models import Tenant, TenantMembership
from crm.models import Client
from marketplace.models import Service
from pos.models import CashMovement, Order, OrderItem, Payment, Product
from waitlist.models import Waitlist, WaitlistEntry


class Command(BaseCommand):
    help = "Seed de datos demo para MVP"

    def handle(self, *args, **options):
        User = get_user_model()

        user, user_created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@nila.local",
                "full_name": "Admin NILA",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if user_created or not user.check_password("admin12345"):
            user.set_password("admin12345")
            user.is_staff = True
            user.is_superuser = True
            user.save()

        tenant, _ = Tenant.objects.get_or_create(
            slug="demo-center",
            defaults={"name": "Demo Center NILA", "plan": "starter", "is_active": True},
        )

        TenantMembership.objects.get_or_create(
            tenant=tenant,
            user=user,
            defaults={"role": TenantMembership.Role.OWNER, "is_active": True},
        )

        service = Service.objects.filter(tenant=tenant, name="Clase Pilates").order_by("id").first()
        if not service:
            service = Service.objects.create(
                tenant=tenant,
                name="Clase Pilates",
                discipline="Pilates",
                description="Clase personalizada demo",
                duration_min=60,
                price=Decimal("12000"),
                is_online=False,
                is_active=True,
            )

        client = Client.objects.filter(tenant=tenant, full_name="Maria Perez").order_by("id").first()
        if not client:
            client = Client.objects.create(
                tenant=tenant,
                full_name="Maria Perez",
                email="maria@demo.com",
                phone="+5491111111111",
            )

        start = timezone.now() + timedelta(days=1)
        end = start + timedelta(hours=1)

        appointment = Appointment.objects.filter(
            tenant=tenant,
            service=service,
            client=client,
            status=Appointment.Status.CONFIRMED,
        ).order_by("id").first()
        if not appointment:
            appointment = Appointment.objects.create(
                tenant=tenant,
                service=service,
                client=client,
                start_dt=start,
                end_dt=end,
                status=Appointment.Status.CONFIRMED,
                notes="Turno demo",
            )

        waitlist = Waitlist.objects.filter(
            tenant=tenant,
            service=service,
            desired_date=appointment.start_dt.date(),
        ).order_by("id").first()
        if not waitlist:
            waitlist = Waitlist.objects.create(
                tenant=tenant,
                service=service,
                desired_date=appointment.start_dt.date(),
                status=Waitlist.Status.ACTIVE,
            )

        WaitlistEntry.objects.get_or_create(
            tenant=tenant,
            waitlist=waitlist,
            client=client,
            defaults={"priority": 100},
        )

        product = Product.objects.filter(tenant=tenant, name="Sesion Pilates").order_by("id").first()
        if not product:
            product = Product.objects.create(
                tenant=tenant,
                name="Sesion Pilates",
                type=Product.Type.SERVICE,
                price=Decimal("12000"),
                is_active=True,
            )

        order = Order.objects.filter(
            tenant=tenant,
            client=client,
            status=Order.Status.PAID,
        ).order_by("id").first()
        if not order:
            order = Order.objects.create(
                tenant=tenant,
                client=client,
                status=Order.Status.PAID,
                total_amount=Decimal("12000"),
                currency="ARS",
                paid_at=timezone.now(),
            )

        OrderItem.objects.get_or_create(
            tenant=tenant,
            order=order,
            product=product,
            defaults={"qty": 1, "unit_price": Decimal("12000"), "amount": Decimal("12000")},
        )

        Payment.objects.get_or_create(
            tenant=tenant,
            order=order,
            method=Payment.Method.CASH,
            amount=Decimal("12000"),
        )

        CashMovement.objects.get_or_create(
            tenant=tenant,
            type=CashMovement.Type.IN,
            amount=Decimal("12000"),
            category="payment",
            reference=f"seed:order:{order.id}",
        )

        self.stdout.write(self.style.SUCCESS("Seed MVP aplicado"))
        self.stdout.write("Credenciales demo: admin / admin12345")
        self.stdout.write(f"Tenant demo id: {tenant.id} | slug: {tenant.slug}")
        self.stdout.write(f"Appointment demo id: {appointment.id}")
