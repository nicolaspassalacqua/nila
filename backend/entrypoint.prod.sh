#!/bin/sh
set -e

python manage.py migrate --noinput

python manage.py shell -c "from django.contrib.auth import get_user_model; from django.contrib.auth.models import Group; import os; roles=('admin','owner','instructor','alumno'); [Group.objects.get_or_create(name=r) for r in roles]; U=get_user_model(); username=os.getenv('ADMIN_USERNAME','admin'); email=os.getenv('ADMIN_EMAIL','admin@nila.local'); password=os.getenv('ADMIN_PASSWORD','admin1234'); u,_=U.objects.get_or_create(username=username, defaults={'email':email,'is_staff':True,'is_superuser':True,'is_active':True}); u.email=email; u.is_staff=True; u.is_superuser=True; u.is_active=True; u.set_password(password); u.save(); u.groups.add(Group.objects.get(name='admin'))"

exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --timeout "${GUNICORN_TIMEOUT:-120}"
