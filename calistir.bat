@echo off
pythonw reminder.py 2>"%~dp0reminder_error.log"
if %errorlevel% neq 0 (
    echo Hata olustu! Detaylar:
    type "%~dp0reminder_error.log"
    pause
)
