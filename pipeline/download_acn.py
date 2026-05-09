import requests, os, json
os.makedirs("data/raw/acn", exist_ok=True)

urls = [
    (
        "https://raw.githubusercontent.com/"
        "tongxin-li/ACN-Data-Static/master/"
        "caltech/caltech_sessions.json",
        "caltech_sessions.json"
    ),
    (
        "https://raw.githubusercontent.com/"
        "tongxin-li/ACN-Data-Static/master/"
        "jpl/jpl_sessions.json",
        "jpl_sessions.json"
    ),
]

downloaded = False
for url, fname in urls:
    try:
        r = requests.get(url, timeout=30)
        if r.status_code == 200:
            with open(f"data/raw/acn/{fname}","wb") as f:
                f.write(r.content)
            print(f"[REAL] Downloaded {fname}")
            downloaded = True
            break
    except Exception as e:
        print(f"[FAIL] {fname}: {e}")

if not downloaded:
    print("[SYNTHETIC] Using ACN published statistics")
