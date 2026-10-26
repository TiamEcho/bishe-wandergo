@echo off
chcp 65001 >nul
title WANDERGO 后端启动器
echo ============================================
echo  WANDERGO 后端启动（Spring Boot 3 + MyBatis-Plus）
echo  前置条件：① MySQL 已启动且 wandergo 库已导入
echo            ② 已安装 Maven 与 JDK 17
echo ============================================
if not defined MYSQL_PWD set MYSQL_PWD=root
cd /d %~dp0
mvn spring-boot:run
pause
