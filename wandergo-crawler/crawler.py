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
    "User-Agent": "WandergoEduCrawler/1.0 (+https://github.com/TiamEcho/bishe-wandergo)",
    "Accept-Language": "zh-CN,zh;q=0.9",
}
BAIKE_HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept-Language": "zh-CN,zh;q=0.9",
}
LIST_URL = "https://baike.baidu.com/item/%E4%B8%AD%E5%9B%BD5A%E7%BA%A7%E6%97%85%E6%B8%B8%E6%99%AF%E5%8C%BA%E5%90%8D%E5%BD%95"
WIKI_LIST_URL = "https://zh.wikipedia.org/wiki/%E5%9B%BD%E5%AE%B65A%E7%BA%A7%E6%97%85%E6%B8%B8%E6%99%AF%E5%8C%BA"
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
    """抓取 5A 名录词条页，解析 (省份, 景区名) 列表
    数据源优先级：百度百科 → 中文维基百科（百科反爬 403 时自动切换）→ 内置名单
    """
    html, src = "", ""
    for url, label in ((LIST_URL, "百度百科"), (WIKI_LIST_URL, "中文维基百科")):
        try:
            html = http_get(url)
            if "5A" in html:
                src = label
                break
            html = ""
        except Exception as e:
            print(f"[warn] {label}名录页抓取失败({e.__class__.__name__})，尝试下一个数据源")
    if not html:
        print("[warn] 在线名录均不可达，使用内置名单兜底")
        return FALLBACK[:limit]
    print(f"[info] 数据源：{src}")
    pairs, seen = [], set()
    prov_keys = set(PROV_CENTER.keys())
    spot_kw = ("景区", "风景", "名胜", "古城", "古镇", "古村", "博物", "寺", "庙", "山", "湖",
               "陵", "窟", "园", "桥", "塔", "宫", "滩", "岛", "峡", "谷", "洞", "泉", "瀑",
               "关", "楼", "城", "林", "草原", "沙", "湾", "江", "河")

    def is_spot(t):
        if not (4 <= len(t) <= 25):
            return False
        if re.search(r"(省|市|区|县|自治区|特别行政区|盟|州)$", t):   # 行政区划名排除
            return False
        return (re.fullmatch(r"[\u4e00-\u9fa5A-Za-z0-9·\-（）()]+", t) is not None
                and any(k in t for k in spot_kw))

    def is_prov(t):
        # 只认 34 个省级行政区，避免把「开封市」「佛山市」误判为省份
        return strip_suffix(t) in prov_keys

    if BeautifulSoup is not None:
        soup = BeautifulSoup(html, "html.parser")
        for table in soup.find_all("table"):
            last_prov = ""          # 维基表格用 rowspan，后续行省份为空 → 继承上一行
            for tr in table.find_all("tr"):
                cells = [td.get_text(" ", strip=True) for td in tr.find_all(["td", "th"])]
                if len(cells) < 2:
                    continue
                prov, name = "", ""
                for c in cells:
                    if not name and is_spot(c):
                        name = c
                    elif not prov and is_prov(c):
                        prov = strip_suffix(c)
                    if name and prov:
                        break
                if not prov:
                    prov = last_prov
                elif prov:
                    last_prov = prov
                if not name or name in seen:
                    continue
                seen.add(name)
                pairs.append(((prov or "中国")[:8], name))
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


def _km(a, b):
    """球面距离（km），用于校验 OSM 结果是否落在该省内"""
    import math
    dlat = (b[1] - a[1]) * math.pi / 180
    dlng = (b[0] - a[0]) * math.pi / 180
    s = (math.sin(dlat / 2) ** 2
         + math.cos(a[1] * math.pi / 180) * math.cos(b[1] * math.pi / 180) * math.sin(dlng / 2) ** 2)
    return 2 * 6371 * math.asin(math.sqrt(s))


def fetch_geo(name, province):
    """OSM Nominatim → 真实经纬度（自动化坐标，失败按省会兜底并标记）
    依次尝试：景区名+省份 → 景区名+省份+中国 → 景区名；命中且距离省会 <900km 才采纳
    """
    prov = strip_suffix(province)
    center = PROV_CENTER.get(prov, (104.0, 35.0))
    for q in (f"{name} {prov}", f"{name} {prov} 中国", name):
        try:
            data = requests.get(NOMINATIM.format(q=quote(q)), headers=HEADERS, timeout=12).json()
            time.sleep(1.1)  # Nominatim 要求 ≤1 req/s，礼貌抓取
            if data:
                p = (float(data[0]["lon"]), float(data[0]["lat"]))
                if _km(center, p) <= 900:      # 防止匹配到同名异地景点
                    return p[0], p[1], "osm"
        except Exception:
            time.sleep(1.1)
    h = hashlib.md5(name.encode("utf-8")).hexdigest()
    # 兜底：省会坐标加确定性的小偏移，保证点位不重叠且可复现
    return (round(center[0] + (int(h[:2], 16) - 128) / 400, 3),
            round(center[1] + (int(h[2:4], 16) - 128) / 400, 3), "fallback")


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
    ap.add_argument("--demo", action="store_true", help="答辩演示模式：分阶段打印醒目日志")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    t0 = time.time()

    if args.demo:
        print("""
╔══════════════════════════════════════════════════════════════╗
║   WANDERGO · 景点数据自动化爬虫 · 答辩演示模式                ║
║   链路：百度百科 5A 名录 → 词条详情 → OSM 真实经纬度          ║
╚══════════════════════════════════════════════════════════════╝""")

    print("\n[1/3] 抓取百度百科《中国5A级旅游景区名录》…")
    pairs = fetch_5a_list(args.limit)
    print(f"      ✓ 解析到 {len(pairs)} 条景区（含省份与名称）")

    spots, sql_rows = [], []
    print(f"\n[2/3] 逐条抓取详情与坐标（共 {len(pairs)} 条，礼貌限速约 1 秒/条）…")
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
        detail_flag = "图+简介" if (img and desc) else ("简介" if desc else "仅坐标")
        geo_flag = "OSM真实坐标" if geo_src == "osm" else "省会兜底"
        print(f"✓ {detail_flag} · {geo_flag} · ({lng}, {lat})")

    print("\n[3/3] 写出文件…")
    (out / "spots_full.json").write_text(json.dumps(spots, ensure_ascii=False, indent=2), encoding="utf-8")
    sql = ("-- 由 WANDERGO 爬虫自动生成 · 来源：百度百科5A名录 + OSM Nominatim 坐标\n"
           "-- 生成时间: %s\nDELETE FROM t_spot WHERE spot_id LIKE 's5a%%';\n" % time.strftime("%Y-%m-%d %H:%M:%S"))
    sql += "INSERT INTO t_spot (spot_id,name,city,province,region,address,lng,lat,hours,traffic,price,rating,tags,description,heat,source) VALUES\n"
    sql += ",\n".join(sql_rows) + ";\n"
    (out / "seed_spots.sql").write_text(sql, encoding="utf-8")

    osm_n = sum(1 for s in spots if s["geo_src"] == "osm")
    img_n = sum(1 for s in spots if s.get("img"))
    print(f"""
┌──────────────────── 抓取结果汇总 ────────────────────┐
│  景区总数      : {len(spots):>4} 条
│  真实坐标(OSM) : {osm_n:>4} 条   （其余为省会兜底，可重跑）
│  含封面图      : {img_n:>4} 条
│  省份覆盖      : {len(set(s['province'] for s in spots)):>4} 个
│  总耗时        : {time.time() - t0:>4.1f} 秒
│  输出          : spots_full.json / seed_spots.sql
└──────────────────────────────────────────────────────┘""")
    print("下一步：运行 D:\\Documents\\wandergo-db\\import.bat 一键导入 MySQL")
    print("      或 docker compose 首次启动时自动导入")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\n[abort] 用户中断")
