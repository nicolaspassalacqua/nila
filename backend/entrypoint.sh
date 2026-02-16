#!/bin/sh
set -e

python manage.py migrate

if [ "$SEED_MVP" = "1" ]; then
  python manage.py seed_mvp || true
fi

exec "$@"
