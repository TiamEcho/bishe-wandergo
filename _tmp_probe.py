# -*- coding: utf-8 -*-
import sys
p = r"f:\毕设\毕设-旅游攻略打卡\开题报告\2264邵文琨，周思彤，章欣钰开题报告-基于Vue + Spring Boot + 协同过滤的旅游打卡平台设计与实现开题报告.doc"
data = open(p, 'rb').read()
print(len(data), data[:8])
if data[:4] == b'PK\x03\x04':
    import zipfile
    z = zipfile.ZipFile(p)
    print([n for n in z.namelist()][:40])
else:
    print("OLE2 / RTF / other")
    # try crude utf-16 text extraction
    for enc in ('utf-16-le', 'gbk'):
        try:
            t = data.decode(enc, errors='ignore')
            print(enc, len(t))
        except Exception as e:
            print(enc, e)
