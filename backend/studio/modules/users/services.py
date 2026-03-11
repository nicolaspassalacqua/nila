from django.contrib.auth.models import Group

ROLE_NAMES = ("admin", "owner", "instructor", "alumno")


def ensure_roles_exist():
    for role_name in ROLE_NAMES:
        Group.objects.get_or_create(name=role_name)


def has_role(user, role_name):
    return user.groups.filter(name=role_name).exists()


def is_owner(user):
    return has_role(user, "owner")


def is_instructor(user):
    return has_role(user, "instructor")


def is_student(user):
    return has_role(user, "alumno")


def is_platform_admin(user):
    return bool(user and user.is_authenticated and (user.is_superuser or user.is_staff))


def get_user_roles(user):
    return list(user.groups.values_list("name", flat=True))
