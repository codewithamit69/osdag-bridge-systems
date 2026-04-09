from django.urls import path
from .views import analyze, calculate, plots

urlpatterns = [
    path('calculate/', calculate),
    path('analyze/', analyze),
    path('plots/', plots),
]