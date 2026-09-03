import requests, json
tests = [
    ("Analisis BBCA dong, worth it gak buat dibeli sekarang?", "BBCA"),
    ("Carikan saham yang lagi oversold dan masih syariah, terus masukin top 3 ke watchlist aku", None),
    ("Mending BBCA atau BBRI buat dividend play?", None),
    ("Portofolio aku sehat gak sih sekarang?", None),
]
for i, (msg, ctx) in enumerate(tests, 1):
    print(f"\n=== TEST {i}: {msg[:60]} ===")
    try:
        r = requests.post('http://localhost:3000/api/ai/axelia', json={'message': msg, 'contextTicker': ctx, 'history': []}, timeout=60)
        print(f"HTTP {r.status_code}")
        j = r.json()
        print(f"via: {j.get('via')}")
        txt = j.get('text') or j.get('error') or ''
        print(txt[:1500].encode('ascii', 'ignore').decode())
        steps = j.get('steps') or []
        print(f"steps: {len(steps)} | " + ", ".join([f"{s['tool']}:{str(s['args'])[:60]}" for s in steps[:3]]))
        print("---")
    except Exception as e:
        print(f"ERR: {e}")
        import traceback; traceback.print_exc()
