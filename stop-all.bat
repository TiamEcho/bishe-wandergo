@echo off
chcp 936 >nul
title WANDERGO 一键停止
set "MYSQL_HOME=D:\ProgramData\wandergo-runtime\mysql\mysql-8.0"

echo ============================================================
echo    WANDERGO 停止所有服务
echo ============================================================
echo.

echo [1/3] 停止前端页面服务（8777）...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8777" ^| findstr "LISTENING"') do (
  taskkill /PID %%p /F >nul 2>&1
  echo       已结束进程 %%p
)

echo [2/3] 停止 Spring Boot（8080）...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
  taskkill /PID %%p /F >nul 2>&1
  echo       已结束进程 %%p
)

echo [3/3] 停止 MySQL（3306）...
if exist "%MYSQL_HOME%\bin\mysqladmin.exe" (
  "%MYSQL_HOME%\bin\mysqladmin.exe" -u root -proot1234 shutdown >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3306" ^| findstr "LISTENING"') do (
  taskkill /PID %%p /F >nul 2>&1
)
echo       已停止

echo.
echo 全部服务已停止。
pause
