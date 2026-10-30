import subprocess, tempfile, time, json, urllib.request, sys, os
p = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(p): p = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
d = tempfile.mkdtemp(prefix="eg_")
pr = subprocess.Popen([p,"--headless=new","--remote-debugging-port=9412","--user-data-dir="+d,"--window-size=1440,940","--hide-scrollbars","about:blank"])
for i in range(30):
    time.sleep(0.5)
    try:
        s = urllib.request.urlopen("http://127.0.0.1:9412/json", timeout=2).read().decode()
        print("OK", s[:400]); break
    except Exception as e:
        print(i, "wait", type(e).__name__)
print("poll", pr.poll())
pr.terminate()
