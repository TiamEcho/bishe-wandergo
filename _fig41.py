# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, r"d:\Documents\Tencent Files\毕设\毕设")
from _draw import *

BLUE = (0xDC, 0xE9, 0xF7)
ORNG = (0xFB, 0xE5, 0xD6)
GREN = (0xE2, 0xEF, 0xDA)
WHITE = (255, 255, 255)

begin()

text(0, 8, W, 12, "图4-1  系统总体架构图", F(16, True))

X0, BW = 22.0, 253.0
HH, GAPY = 32.0, 20.0
TOP = H - 24.0

LAYERS = [
    ("表现层（前端 · Vue 3 + HTML / CSS / JavaScript）", BLUE, TOP,
     ["18 个 HTML 页面\n多页面应用（MPA）",
      "Vue 3 数据绑定\nCDN 引入·无构建",
      "ECharts 环球地图\nThree.js 三维地球",
      "Axios 接口请求\nJSON 数据交换"]),
    ("业务逻辑层（Spring Boot 3.2.5 · JDK 17）", ORNG, TOP - HH - GAPY,
     ["UserController\n用户与令牌",
      "SpotController\n景点数据",
      "CheckinController\n打卡与评分",
      "CommunityController\n社区与评论",
      "RecommendController\n推荐计算",
      "AdminController\n后台管理"]),
    ("数据层（MySQL 8.0 主库 · PostgreSQL 演示库）", GREN, TOP - 2 * (HH + GAPY),
     ["12 张业务数据表\nt_user、t_spot 等",
      "MyBatis-Plus 3.5.5\nMapper 映射",
      "Python 爬虫\n景点与社区数据"]),
]

for title, color, yt, items in LAYERS:
    rect(X0, yt, BW, HH, "", fill=color, lw=2.0)
    text(X0 + 3, yt + 1.6, 220, 7.5, title, F(10.5, True), align="left", valign="top")
    n = len(items)
    pad, gap = 4.0, 4.0
    cw = (BW - 2 * pad - (n - 1) * gap) / n
    for i, it in enumerate(items):
        rect(X0 + pad + i * (cw + gap), yt + 9.5, cw, 19.5, it, fill=WHITE, font=F(8.5), lw=1.3)

# 层间箭头与标签
for xf in (0.16, 0.5, 0.84):
    x = X0 + BW * xf
    line(x, TOP - GAPY + 1.0, x, TOP - 0.8, arrow=True)
    line(x, TOP - HH - GAPY + 1.0, x, TOP - HH - 0.8, arrow=True)

yt1 = TOP - GAPY
yt2 = TOP - HH - GAPY
text(X0 + BW * 0.5 - 40, yt1 - 5.6, 80, 4.6, "HTTP / JSON（RESTful）", F(8), align="center", bg=WHITE)
text(X0 + BW * 0.5 - 36, yt2 - 5.6, 72, 4.6, "JDBC / MyBatis-Plus", F(8), align="center", bg=WHITE)

note = ("说明：前端采用多页面应用（MPA）方式组织，页面之间以原生 JavaScript 跳转，未使用 Vue Router；"
        "表现层通过 Axios 以 JSON 格式调用后端 RESTful 接口；后端按控制层、业务层、数据访问层分层，"
        "由 MyBatis-Plus 完成对象与数据表的映射；数据库可通过环境变量在 MySQL 与 PostgreSQL 之间切换。")
lines = wrap(note, F(9), BW)
text(X0, 38, BW, 26, "\n".join(lines), F(9), align="left", valign="top")

save("图4-1_系统总体架构图")
