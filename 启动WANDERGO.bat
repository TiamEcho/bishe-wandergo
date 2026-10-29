@echo off
chcp 65001 >nul
title WANDERGO 本地启动器
cd /d "%~dp0"

echo ============================================
echo   WANDERGO 旅行打卡平台 · 本地启动器
echo   正在启动本地网页服务（无需安装任何软件）
echo ============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
if errorlevel 1 (
  echo.
  echo 启动失败：请右键本文件 - 以管理员身份运行，或联系作者。
  pause
)
