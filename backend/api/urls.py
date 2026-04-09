from django.urls import path
from . import views

urlpatterns = [
    path('v1/analyze/', views.AnalyzeView.as_view()),
    path('v1/validate/', views.ValidateInputView.as_view()),
    path('v1/plots/', views.PlotView.as_view()),
    path('v1/sections/', views.SectionListView.as_view()),
    path('v1/history/', views.HistoryListView.as_view()),
    path('v1/testcases/run/', views.RunTestSuiteView.as_view()),
]