from django.contrib import admin
from pos.models import Product, Order, OrderItem, Payment, CashMovement

admin.site.register(Product)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(Payment)
admin.site.register(CashMovement)
