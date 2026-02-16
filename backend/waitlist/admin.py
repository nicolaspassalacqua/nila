from django.contrib import admin
from waitlist.models import Waitlist, WaitlistEntry, WaitlistOffer

admin.site.register(Waitlist)
admin.site.register(WaitlistEntry)
admin.site.register(WaitlistOffer)
