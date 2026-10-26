# -*- coding: utf-8 -*-
"""
WANDERGO · 数据库种子自动生成器
================================
从平台前端数据文件（data.js）自动解析 32 个景点（含真实坐标）与 24 位演示用户
的评分矩阵，自动生成 wandergo.sql —— 不手写、可重复执行。

运行：python gen_seed.py [data.js路径]
输出：同目录 wandergo.sql（完整建库脚本）
"""
import json, re, sys, time
from pathlib import Path

HERE = Path(__file__).parent
DEFAULT_DATA = r"d:\Documents\Tencent Files\毕设\毕设\wandergo-platform\js\data.js"


def esc(s):
    return (s or "").replace("\\", "\\\\").replace("'", "''")


def parse_spots(src):
    rows = []
    pat = re.compile(
        r"\{id:'([^']+)',n:'([^']+)',city:'([^']+)',rg:'(cn|ab)',addr:'([^']*)',"
        r"lng:(-?[\d.]+),lat:(-?[\d.]+),hrs:'([^']*)',traf:'([^']*)',price:'([^']*)',"
        r"rating:([\d.]+),tag:'([^']*)',desc:'([^']*)'\}")
    for m in pat.finditer(src):
        sid, n, city, rg, addr, lng, lat, hrs, traf, price, rating, tag, desc = m.groups()
        rows.append((sid, n, city, rg, addr, float(lng), float(lat),
                     hrs, traf, price, float(rating), tag, desc))
    return rows


def parse_rates(src):
    users = []
    block = re.search(r"const RATE_USERS=\[(.*?)\n\];", src, re.S)
    if not block:
        return users
    for m in re.finditer(r"\{u:'([^']+)',r:\{([^}]*)\}\}", block.group(1)):
        nick, pairs = m.group(1), m.group(2)
        r = dict(re.findall(r"(\w+):([\d.]+)", pairs))
        users.append((nick, r))
    return users


def main():
    data_path = Path(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DATA)
    src = data_path.read_text(encoding="utf-8")
    spots = parse_spots(src)
    rates = parse_rates(src)
    if not spots:
        sys.exit("[error] 未能从 data.js 解析出景点，请检查路径")
    print(f"[info] 解析到 {len(spots)} 个景点 / {len(rates)} 位评分用户")

    spot_vals = ",\n".join(
        "('{sid}','{n}','{city}','{rg}','{addr}',{lng},{lat},'{hrs}','{traf}','{price}',{rating},'{tag}','{desc}',{heat},'高德坐标拾取器+公开资料')"
        .format(sid=esc(sid), n=esc(n), city=esc(city), rg=rg, addr=esc(addr), lng=lng, lat=lat,
                hrs=esc(hrs), traf=esc(traf), price=esc(price), rating=rating, tag=esc(tag),
                desc=esc(desc), heat=3000 + (i * 233) % 6500)
        for i, (sid, n, city, rg, addr, lng, lat, hrs, traf, price, rating, tag, desc) in enumerate(spots))

    user_rows = ["('青柠汽水','e10adc3949ba59abbe56e057f20f883e')",  # 演示账号 123456
                 "('慢半拍','e10adc3949ba59abbe56e057f20f883e')",
                 "('苍山雪','e10adc3949ba59abbe56e057f20f883e')",
                 "('城墙根','e10adc3949ba59abbe56e057f20f883e')",
                 "('海岛控Mia','e10adc3949ba59abbe56e057f20f883e')",
                 "('极光猎人','e10adc3949ba59abbe56e057f20f883e')"]

    rate_vals = []
    for nick, r in rates:
        for sid, sc in r.items():
            rate_vals.append(f"('{esc(nick)}','{esc(sid)}',{int(float(sc))})")

    checkin_vals = [
        ("青柠汽水", "洱海生态廊道", "大理", "2026-09-28", "环海西路骑到才村码头，日出正好落在洱海上。", "😌 治愈放松", 1268),
        ("青柠汽水", "阳朔遇龙河", "桂林", "2026-10-02", "竹筏漂过九马画山，人在画中游不是比喻。", "🏔 震撼到失语", 1850),
        ("城墙根", "故宫博物院", "北京", "2026-10-05", "六百年紫禁城，红墙黄瓦拍不够。", "🥹 值得再来", 320),
        ("海岛控Mia", "亚龙湾", "三亚", "2026-10-12", "海水和日落都是免费的高光。", "😌 治愈放松", 4210),
        ("极光猎人", "冰岛黄金圈", "冰岛", "2026-02-18", "KP4 的夜里，极光像有人在天上抖窗帘。", "🏔 震撼到失语", 15600),
    ]
    ck_vals = ",\n".join("('{u}','{d}','{c}','{date}','{t}','{m}',{cost})".format(
        u=esc(u), d=esc(d), c=esc(c), date=date, t=esc(t), m=esc(m), cost=cost)
        for u, d, c, date, t, m, cost in checkin_vals)

    sql = f"""-- ============================================================
-- WANDERGO 旅游打卡平台 · MySQL 建库脚本（自动生成）
-- 生成时间: {time.strftime('%Y-%m-%d %H:%M:%S')}
-- 景点数据: 来自前端 data.js（坐标经高德坐标拾取器校准）
-- 爬虫增量数据: 运行 D:\\Documents\\wandergo-crawler\\run.bat 后由 import.bat 自动并入
-- 演示账号密码均为: 123456
-- ============================================================
DROP DATABASE IF EXISTS wandergo;
CREATE DATABASE wandergo DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wandergo;

-- 用户表
CREATE TABLE t_user (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(64) NOT NULL,
  avatar VARCHAR(8) DEFAULT '旅',
  created_at VARCHAR(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 景点表
CREATE TABLE t_spot (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  spot_id VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(50),
  province VARCHAR(50),
  region VARCHAR(8) DEFAULT 'cn',
  address VARCHAR(200),
  lng DOUBLE, lat DOUBLE,
  hours VARCHAR(40), traffic VARCHAR(120), price VARCHAR(40),
  rating DOUBLE DEFAULT 4.5,
  tags VARCHAR(80),
  description TEXT,
  heat DOUBLE DEFAULT 0,
  source VARCHAR(80)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 打卡记录表
CREATE TABLE t_checkin_record (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nick VARCHAR(50) NOT NULL,
  spot_name VARCHAR(100), city VARCHAR(50),
  checkin_date VARCHAR(20), text TEXT, mood VARCHAR(40),
  total_cost DOUBLE DEFAULT 0,
  created_at VARCHAR(20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 评分行为表（协同过滤输入）
CREATE TABLE t_rating_record (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nick VARCHAR(50) NOT NULL,
  spot_id VARCHAR(32) NOT NULL,
  score INT DEFAULT 5,
  created_at VARCHAR(20),
  UNIQUE KEY uk_user_spot (nick, spot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ 种子数据 ============
INSERT INTO t_user (username,password,avatar) VALUES
{','.join(user_rows)};

INSERT INTO t_spot (spot_id,name,city,region,address,lng,lat,hours,traffic,price,rating,tags,description,heat,source) VALUES
{spot_vals};

INSERT INTO t_checkin_record (nick,spot_name,city,checkin_date,text,mood,total_cost) VALUES
{ck_vals};

INSERT INTO t_rating_record (nick,spot_id,score) VALUES
{','.join(rate_vals)};
"""
    out = HERE / "wandergo.sql"
    out.write_text(sql, encoding="utf-8")
    print(f"[done] 已生成 {out}")
    print(f"       景点 {len(spots)} 条 · 评分 {len(rate_vals)} 条 · 打卡 {len(checkin_vals)} 条")


if __name__ == "__main__":
    main()
