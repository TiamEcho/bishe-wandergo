# -*- coding: utf-8 -*-
import sys, os
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
src = sys.argv[1]
box = tuple(float(v) for v in sys.argv[2].split(","))  # l,t,r,b 比例 0~1
maxw = int(sys.argv[3]) if len(sys.argv) > 3 else 1000
im = Image.open(src).convert("RGB")
w, h = im.size
c = im.crop((int(box[0]*w), int(box[1]*h), int(box[2]*w), int(box[3]*h)))
cw, ch = c.size
c.thumbnail((maxw, max(1, maxw*ch//cw)), Image.LANCZOS)
c.save(r"d:\Documents\Tencent Files\毕设\毕设\_preview.png")
print("crop", c.size)
