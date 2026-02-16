from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.views import FacebookAuthView, GoogleAuthConfigView, GoogleAuthView, MeView, RegisterView

urlpatterns = [
    path("token", TokenObtainPairView.as_view(), name="token_obtain_pair_noslash"),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh", TokenRefreshView.as_view(), name="token_refresh_noslash"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("register", RegisterView.as_view(), name="register_noslash"),
    path("register/", RegisterView.as_view(), name="register"),
    path("google", GoogleAuthView.as_view(), name="google_auth_noslash"),
    path("google/", GoogleAuthView.as_view(), name="google_auth"),
    path("facebook", FacebookAuthView.as_view(), name="facebook_auth_noslash"),
    path("facebook/", FacebookAuthView.as_view(), name="facebook_auth"),
    path("google/config", GoogleAuthConfigView.as_view(), name="google_auth_config_noslash"),
    path("google/config/", GoogleAuthConfigView.as_view(), name="google_auth_config"),
    path("me", MeView.as_view(), name="me_noslash"),
    path("me/", MeView.as_view(), name="me"),
]
