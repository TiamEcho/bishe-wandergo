@echo off
chcp 65001 >nul
title WANDERGO 景点数据爬虫（自动化 · 真实数据）
echo ============================================
echo  WANDERGO 数据爬虫
echo  数据源：百度百科 5A 名录（名称/简介/封面）
echo          OSM Nominatim（真实经纬度坐标）
echo  输出  ：spots_full.json + seed_spots.sql
echo ============================================
cd /d %~dp0

rem 自动寻找可用的 Python（优先 py 启动器，其次 python）
set PYCMD=
py -3 --version >nul 2>&1 && set PYCMD=py -3
if not defined PYCMD (
  python --version >nul 2>&1 && python -c "import requests" >nul 2>&1 && set PYCMD=python
)
if not defined PYCMD (
  rem 兜底：常见安装路径
  for /d %%P in ("%LocalAppData%\Programs\Python\Python3*") do (
    if exist "%%P\python.exe" set "PYCMD=%%P\python.exe"
  )
)
if not defined PYCMD (
  echo [error] 未找到 Python，请先安装 Python 3.10+ 并勾选 Add to PATH
  pause & exit /b 1
)
echo 使用解释器: %PYCMD%

echo [1/2] 安装依赖（requests / beautifulsoup4）...
%PYCMD% -m pip install -q -r requirements.txt
echo [2/2] 开始抓取并生成 SQL ...
rem 演示模式：分阶段醒目日志 + 结果汇总（答辩投屏用）
%PYCMD% crawler.py --limit 40 --demo
echo.
echo 完成！运行 D:\Documents\wandergo-db\import.bat 将数据导入 MySQL
pause
