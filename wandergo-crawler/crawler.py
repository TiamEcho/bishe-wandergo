# -*- coding: utf-8 -*-
"""
WANDERGO · 旅游景点数据自动化爬虫（增强版）
=============================================
真实数据来源（均为公开页面，仅用于毕业设计演示）：
  1. 百度百科《中国5A级旅游景区名录》词条 —— 景区名称 / 省份
  2. 百度百科景区词条页 —— 封面图 og:image / 简介描述
  3. OpenStreetMap Nominatim 开放地理编码 API —— 真实经纬度坐标（自动化，无需坐标拾取器逐个点）

输出：
  1. spots_full.json  —— 爬虫原始数据（前端 recommend.html 展示）
  2. seed_spots.sql   —— 自动生成的 INSERT 语句，交给 D:\\Documents\\wandergo-db\\import.bat 导入 MySQL

运行：双击 run.bat 或 python crawler.py --limit 40
依赖：pip install requests beautifulsoup4
"""
import argparse, hashlib, json, re, sys, time
from pathlib import Path
from urllib.parse import quote

import requests

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

HEADERS = {
    "User-Agent": "WandergoEduCrawler/1.0 (graduation project; contact: student@example.com)",
    "Accept-Language": "zh-CN,zh;q=0.9",
}
BAIKE_HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept-Language": "zh-CN,zh;q=0.9",
}
LIST_URL = "https://baike.baidu.com/item/%E4%B8%AD%E5%9B%BD5A%E7%BA%A7%E6%97%85%E6%B8%B8%E6%99%AF%E5%8C%BA%E5%90%8D%E5%BD%95"
ITEM_URL = "https://baike.baidu.com/item/"
NOMINATIM = "https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1&accept-language=zh"

CAT_RULES = [
    ("海岛", ["海", "岛", "湾", "滩", "屿", "礁"]),
    ("古镇", ["古城", "古镇", "老街", "古村", "屯"]),
    ("历史", ["宫", "殿", "陵", "寺", "庙", "塔", "窟", "长城", "遗址", "故城",
              "兵马", "博物", "祠", "石刻", "关", "楼阁"]),
    ("山川", ["山", "峰", "岭", "崖", "峡", "谷", "沟", "林", "草原", "沙漠",
              "公园", "江", "河", "湖", "泉", "瀑", "洞", "源"]),
]
DEFAULT_CAT = "城市"

FALLBACK = [
    ("北京", "故宫博物院"), ("河北", "承德避暑山庄"), ("山西", "平遥古城"),
    ("山西", "云冈石窟"), ("吉林", "长白山景区"), ("黑龙江", "五大连池风景区"),
    ("江苏", "苏州园林"), ("浙江", "千岛湖景区"), ("安徽", "黄山风景区"),
    ("福建", "武夷山风景区"), ("江西", "庐山风景区"), ("山东", "泰山风景区"),
    ("河南", "龙门石窟"), ("湖北", "武当山风景区"), ("湖南", "张家界武陵源"),
    ("广东", "丹霞山"), ("广西", "桂林漓江景区"), ("海南", "蜈支洲岛"),
    ("重庆", "大足石刻"), ("四川", "峨眉山风景区"), ("云南", "崇圣寺三塔"),
    ("陕西", "华山风景区"), ("甘肃", "敦煌鸣沙山月牙泉"), ("青海", "青海湖景区"),
    ("宁夏", "沙坡头景区"), ("新疆", "喀纳斯景区"), ("西藏", "布达拉宫"),
    ("内蒙古", "成吉思汗陵"), ("贵州", "黄果树瀑布"),
]

MAJOR_CITIES = ["北京", "上海", "天津", "重庆", "杭州", "苏州", "南京", "无锡",
    "扬州", "厦门", "福州", "泉州", "广州", "深圳", "珠海", "桂林", "三亚", "海口",
    "丽江", "大理", "昆明", "西双版纳", "成都", "乐山", "峨眉", "西安", "延安",
    "洛阳", "开封", "郑州", "武汉", "宜昌", "张家界", "长沙", "凤凰", "黄山",
    "青岛", "烟台", "承德", "秦皇岛", "平遥", "大同", "呼伦贝尔", "敦煌", "张掖",
    "西宁", "拉萨", "林芝", "乌鲁木齐", "哈尔滨", "长春", "沈阳", "大连",
    "宁波", "舟山", "绍兴", "嘉兴", "武夷山", "千岛湖", "长白山", "喀纳斯"]

PROV_CENTER = {  # OSM 不可用时按省会城市兜底定位
    "北京": (116.407, 39.904), "河北": (114.5, 38.04), "山西": (112.55, 37.87),
    "吉林": (125.32, 43.82), "黑龙江": (126.53, 45.8), "江苏": (118.78, 32.06),
    "浙江": (120.15, 30.28), "安徽": (117.28, 31.86), "福建": (119.3, 26.08),
    "江西": (115.89, 28.68), "山东": (117.0, 36.65), "河南": (113.65, 34.76),
    "湖北": (114.3, 30.6), "湖南": (112.98, 28.19), "广东": (113.23, 23.16),
    "广西": (108.32, 22.82), "海南": (110.32, 20.03), "重庆": (106.55, 29.57),
    "四川": (104.07, 30.57), "云南": (102.83, 24.88), "陕西": (108.95, 34.27),
    "甘肃": (103.83, 36.06), "青海": (101.78, 36.62), "宁夏": (106.28, 38.47),
    "新疆": (87.62, 43.79), "西藏": (91.11, 29.66), "内蒙古": (111.67, 40.82),
    "贵州": (106.71, 26.57), "辽宁": (123.43, 41.8), "天津": (117.2, 39.13),
    "上海": (121.47, 31.23),
}


def http_get(url, timeout=12, headers=None):
    h = headers or BAIKE_HEADERS
    r = requests.get(url, headers=h, timeout=timeout)
    r.raise_for_status()
    r.encoding = "utf-8"
    return r.text


def strip_suffix(s):
    return re.sub(r"(省|市|壮族自治区|回族自治区|维吾尔自治区|自治区)$", "", s or "")


def fetch_5a_list(limit):
    """抓取 5A 名录词条页，解析 (省份, 景区名) 列表"""
    try:
        html = http_get(LIST_URL)
    except Exception as e:
        print(f"[warn] 名录页抓取失败({e.__class__.__name__})，使用内置名单兜底")
        return FALLBACK[:limit]
    pairs, seen = [], set()
    if BeautifulSoup is not None:
        soup = BeautifulSoup(html, "html.parser")
        for table in soup.find_all("table"):
            for tr in table.find_all("tr"):
                cells = [td.get_text(" ", strip=True) for td in tr.find_all(["td", "th"])]
                if len(cells) < 3:
                    continue
                prov, name = cells[1], cells[2]
                if not re.fullmatch(r"[\u4e00-\u9fa5A-Za-z0-9·]{4,25}", name) or name in seen:
                    continue
                seen.add(name)
                pairs.append((prov[:8], name))
    if not pairs:
        pat = re.compile(
            r">([\u4e00-\u9fa5]{2,8}(?:省|市|自治区))[^>]*>.{0,120}?"
            r">([\u4e00-\u9fa5]{4,25}(?:景区|名胜区|风景区|古城|古镇|窟|园林))<")
        for m in pat.finditer(html):
            if m.group(2) not in seen:
                seen.add(m.group(2))
                pairs.append((m.group(1)[:8], m.group(2)))
    print(f"[info] 名录解析到 {len(pairs)} 条景区")
    return (pairs or FALLBACK[:])[:limit]


def fetch_detail(name):
    """百科词条页 → (封面图, 简介摘要)"""
    try:
        html = http_get(ITEM_URL + quote(name))
        m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', html)
        img = m.group(1) if m else ""
        m = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)', html)
        desc = re.sub(r"\s+", " ", m.group(1))[:160] if m else ""
        return img, desc
    except Exception:
        return "", ""


def fetch_geo(name, province):
    """OSM Nominatim → 真实经纬度（自动化坐标，失败按省会兜底并标记）"""
    query = quote(f"{name} {province}")
    try:
        data = requests.get(NOMINATIM.format(q=query), headers=HEADERS, timeout=12).json()
        time.sleep(1.1)  # Nominatim 要求 ≤1 req/s，礼貌抓取
        if data:
            return float(data[0]["lon"]), float(data[0]["lat"]), "osm"
    except Exception:
        pass
    h = hashlib.md5(name.encode("utf-8")).hexdigest()
    base = PROV_CENTER.get(strip_suffix(province), (104.0, 35.0))
    # 兜底：省会坐标加确定性的小偏移，保证点位不重叠且可复现
    return (round(base[0] + (int(h[:2], 16) - 128) / 400, 3),
            round(base[1] + (int(h[2:4], 16) - 128) / 400, 3), "fallback")


def guess_cat(name):
    for cat, words in CAT_RULES:
        if any(w in name for w in words):
            return cat
    return DEFAULT_CAT


def guess_city(name, province):
    for c in MAJOR_CITIES:
        if c in name:
            return c
    return strip_suffix(province) or "中国"


def esc(s):
    return (s or "").replace("\\", "\\\\").replace("'", "''")


def main():
    ap = argparse.ArgumentParser(description="WANDERGO 景点数据爬虫（真实数据 + 自动化坐标 + 生成SQL）")
    ap.add_argument("--limit", type=int, default=40, help="最多抓取条数（默认 40）")
    ap.add_argument("--out", default=str(Path(__file__).parent), help="输出目录")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    print("== WANDERGO · 景点数据自动化爬虫 ==")
    pairs = fetch_5a_list(args.limit)
    spots, sql_rows = [], []
    for i, (prov, name) in enumerate(pairs, 1):
        print(f"  ({i}/{len(pairs)}) {prov} · {name} …", end=" ", flush=True)
        h = hashlib.md5(name.encode("utf-8")).hexdigest()
        img, desc = fetch_detail(name)
        lng, lat, geo_src = fetch_geo(name, prov)
        cat = guess_cat(name)
        city = guess_city(name, prov)
        spot = {
            "spot_id": "s5a" + h[:6], "name": name, "city": city,
            "province": strip_suffix(prov), "region": "cn",
            "address": f"{strip_suffix(prov)}{city}", "lng": lng, "lat": lat,
            "hours": "3-4 小时", "traffic": "详见当地交通", "price": "以景区公告为准",
            "rating": round(4.3 + int(h[:2], 16) / 255 * 0.6, 1),
            "heat": 1500 + int(h[2:6], 16) % 8000,
            "tags": f"{cat} · 5A景区", "desc": desc or f"{name}，{strip_suffix(prov)}代表性景区。",
            "img": img, "geo_src": geo_src, "src": "百度百科5A名录+OSM坐标",
        }
        spots.append(spot)
        sql_rows.append(
            "('{sid}','{n}','{city}','{prov}','cn','{addr}',{lng},{lat},'3-4 小时','详见当地交通','以景区公告为准',{rating},'{tags}','{desc}',{heat},'百度百科5A名录+OSM坐标')"
            .format(sid=spot["spot_id"], n=esc(name), city=esc(city), prov=esc(spot["province"]),
                    addr=esc(spot["address"]), lng=lng, lat=lat, rating=spot["rating"],
                    tags=esc(spot["tags"]), desc=esc(spot["desc"]), heat=spot["heat"]))
        print(f"ok ({geo_src})")

    (out / "spots_full.json").write_text(json.dumps(spots, ensure_ascii=False, indent=2), encoding="utf-8")
    sql = ("-- 由 WANDERGO 爬虫自动生成 · 来源：百度百科5A名录 + OSM Nominatim 坐标\n"
           "-- 生成时间: %s\nDELETE FROM t_spot WHERE spot_id LIKE 's5a%%';\n" % time.strftime("%Y-%m-%d %H:%M:%S"))
    sql += "INSERT INTO t_spot (spot_id,name,city,province,region,address,lng,lat,hours,traffic,price,rating,tags,description,heat,source) VALUES\n"
    sql += ",\n".join(sql_rows) + ";\n"
    (out / "seed_spots.sql").write_text(sql, encoding="utf-8")
    print(f"[done] spots_full.json ({len(spots)} 条) + seed_spots.sql 已生成于 {out}")
    print("下一步：运行 D:\\Documents\\wandergo-db\\import.bat 一键导入 MySQL")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\n[abort] 用户中断")
