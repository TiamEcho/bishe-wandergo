@echo off
chcp 65001 >nul
title WANDERGO 数据库一键导入
echo ============================================
echo  WANDERGO 数据库导入（MySQL 8.0）
echo  1. wandergo.sql     —— 建库 + 32 景点 + 评分矩阵 + 演示数据
echo  2. 爬虫增量数据（若已运行 wandergo-crawler\run.bat）
echo ============================================
cd /d %~dp0
set /p MYSQLUser=MySQL 用户名（回车默认 root）:
if "%MYSQLUser%"=="" set MYSQLUser=root
if not defined MYSQL_PWD set /p MYSQL_PWD=请输入 MySQL 密码:

echo [1/3] 导入 wandergo.sql ...
mysql -u%MYSQLUser% -p%MYSQL_PWD% --default-character-set=utf8mb4 < wandergo.sql
if errorlevel 1 (
  echo [error] 导入失败：请确认 MySQL 服务已启动、mysql 命令在 PATH 中
  pause & exit /b 1
)
echo [2/3] 执行管理端升级 upgrade_admin.sql（角色/状态/评论/点赞表）...
mysql -u%MYSQLUser% -p%MYSQL_PWD% --default-character-set=utf8mb4 < upgrade_admin.sql
if errorlevel 1 (
  echo [warn] 升级脚本执行异常，可手动重跑 upgrade_admin.sql
)
if exist "..\wandergo-crawler\seed_spots.sql" (
  echo [3/3] 检测到爬虫数据 seed_spots.sql，一并导入 ...
  mysql -u%MYSQLUser% -p%MYSQL_PWD% --default-character-set=utf8mb4 wandergo < ..\wandergo-crawler\seed_spots.sql
) else (
  echo [3/3] 未发现爬虫数据（可运行 D:\Documents\wandergo-crawler\run.bat 生成）
)
echo.
echo [done] 导入完成！管理端账号 admin / admin123
echo        可运行 D:\Documents\wandergo-backend\run.bat 启动后端
pause
