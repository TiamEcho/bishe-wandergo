# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _fig_base import *

fig, ax = canvas(297, 190)
title(ax, "图4-1  系统总体架构图", 181)

L, W = 26.0, 245.0
HH = 40.0
GAP = 26.0
TOP = 174.0

LAYERS = [
    ("表现层（前端 · Vue 3 + HTML / CSS / JavaScript）", C_BLUE,
     ["18 个 HTML 页面\n多页面应用（MPA）",
      "Vue 3 数据绑定\nCDN 引入 · 无构建",
      "ECharts 环球地图\nThree.js 三维地球",
      "Axios 接口请求\nJSON 数据交换"]),
    ("业务逻辑层（Spring Boot 3.2.5 · JDK 17）", C_ORANGE,
     ["UserController\n用户与令牌",
      "SpotController\n景点数据",
      "CheckinController\n打卡与评分",
      "CommunityController\n社区与评论",
      "RecommendController\n推荐计算",
      "AdminController\n后台管理"]),
    ("数据层（MySQL 8.0 主库 · PostgreSQL 演示库）", C_GREEN,
     ["12 张业务数据表\nt_user、t_spot 等",
      "MyBatis-Plus 3.5.5\nMapper 映射",
      "Python 爬虫\n景点与社区数据"]),
]

ys = []
for k, (name, color, items) in enumerate(LAYERS):
    yt = TOP - k * (HH + GAP) - HH
    ys.append(yt)
    box(ax, L, yt, W, HH, fill=color, lw=LW)
    ax.text(L + 4.0, yt + HH - 6.0, name, fontsize=10, fontweight="bold",
            ha="left", va="center", zorder=3)
    n = len(items)
    pad, gap = 6.0, 5.0
    cw = (W - 2 * pad - (n - 1) * gap) / n
    for i, it in enumerate(items):
        box(ax, L + pad + i * (cw + gap), yt + 5.0, cw, HH - 15.0, it, fs=9)

# 层间直线通道（无箭头）
X_T = [L + W * 0.24, L + W * 0.50, L + W * 0.76]
for x in X_T:
    line(ax, [(x, ys[0]), (x, ys[1] + HH)])
for x in X_T:
    line(ax, [(x, ys[1]), (x, ys[2] + HH)])

label(ax, L + W * 0.5, (ys[0] + ys[1] + HH) / 2, "HTTP / JSON（RESTful 接口）", fs=8.5)
label(ax, L + W * 0.5, (ys[1] + ys[2] + HH) / 2, "JDBC / MyBatis-Plus", fs=8.5)

save(fig, "图4-1_系统总体架构图")
