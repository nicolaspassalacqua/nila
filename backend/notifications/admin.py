from django.contrib import admin
from notifications.models import MessageTemplate, MessageQueue

admin.site.register(MessageTemplate)
admin.site.register(MessageQueue)
