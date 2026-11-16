@echo off
rem ============================================================
rem  默认使用绝对路径 D:\ProgramData\wandergo-runtime
rem  若解压到其他位置，二选一：
rem   1) 修改下面一行 BASE 为解压后的实际目录
rem   2) 设置环境变量 WANDERGO_HOME 指向解压目录（优先级更高）
rem ============================================================
set "BASE=D:\ProgramData\wandergo-runtime"
if defined WANDERGO_HOME set "BASE=%WANDERGO_HOME%"
set "MYSQL_HOME=%BASE%\mysql\mysql-8.0"
set "NODE_EXE=%BASE%\node\node.exe"
set "APP_DIR=%BASE%\backend"
set "WEB_ROOT=%BASE%\web"
set "PS=powershell -NoProfile -ExecutionPolicy Bypass"
chcp 936 >nul
title WANDERGO 一键启动

echo ============================================================
echo    WANDERGO 旅行打卡平台 · 答辩演示一键启动
echo ============================================================
echo.

if not exist "%MYSQL_HOME%\bin\mysqld.exe" (
  echo [错误] 未找到 MySQL：%MYSQL_HOME%\bin\mysqld.exe
  goto :fail
)
if not exist "%NODE_EXE%" (
  echo [错误] 未找到 Node：%NODE_EXE%
  goto :fail
)
if not exist "%APP_DIR%\src\server.js" (
  echo [错误] 未找到后端源码：%APP_DIR%\src\server.js
  goto :fail
)
if not exist "%APP_DIR%\.env" (
  echo [提示] 未找到 %APP_DIR%\.env，AI 功能将降级为本地规则
)
if not exist "%WEB_ROOT%\index.html" (
  echo [错误] 未找到前端页面：%WEB_ROOT%\index.html
  goto :fail
)

echo [1/3] 检查 MySQL（端口 3306）...
%PS% -Command "if (Test-NetConnection 127.0.0.1 -Port 3306 -InformationLevel Quiet -WarningAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
  echo       MySQL 已在运行，跳过启动。
  goto :mysql_ok
)
echo       正在启动 MySQL ...
start "WANDERGO-MySQL" /min "%MYSQL_HOME%\bin\mysqld.exe" --defaults-file="%MYSQL_HOME%\my.ini" --console
set "WAIT=0"
:loop_mysql
%PS% -Command "Start-Sleep -Milliseconds 1000" >nul 2>&1
%PS% -Command "if (Test-NetConnection 127.0.0.1 -Port 3306 -InformationLevel Quiet -WarningAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto :mysql_ok
set /a WAIT+=1
if %WAIT% lss 40 goto :loop_mysql
echo [错误] MySQL 启动超时，请查看 %BASE%\mysql\data\*.err
goto :fail
:mysql_ok
echo       MySQL 已就绪。

echo [2/3] 检查后端服务（端口 8080）...
%PS% -Command "if (Test-NetConnection 127.0.0.1 -Port 8080 -InformationLevel Quiet -WarningAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
  echo       后端已在运行，跳过启动。
  goto :app_ok
)
echo       正在启动后端 ...
start "WANDERGO-Backend" /min /d "%APP_DIR%" "%NODE_EXE%" "src\server.js"
set "WAIT=0"
:loop_app
%PS% -Command "Start-Sleep -Milliseconds 1000" >nul 2>&1
%PS% -Command "if (Test-NetConnection 127.0.0.1 -Port 8080 -InformationLevel Quiet -WarningAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto :app_ok
set /a WAIT+=1
if %WAIT% lss 60 goto :loop_app
echo [错误] 后端启动超时，请查看 WANDERGO-Backend 窗口中的报错。
goto :fail
:app_ok
echo       后端已就绪：http://localhost:8080/api/health

echo [3/3] 正在启动前端页面（端口 8777）...
start "WANDERGO-Web" /min %PS% -File "%WEB_ROOT%\server.ps1"
%PS% -Command "Start-Sleep -Milliseconds 2500" >nul 2>&1

echo.
echo ============================================================
echo    全部启动完成
echo.
echo    前端页面：http://localhost:8777/index.html
echo    后端接口：http://localhost:8080/api/health
echo.
echo    停止服务请运行 stop-all.bat
echo ============================================================
echo.
start "" "http://localhost:8777/index.html"
pause
exit /b 0

:fail
echo.
echo 启动失败，请将以上提示截图反馈。
pause
exit /b 1
