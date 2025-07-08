import jwt, time, requests, json
from pathlib import Path

P = Path(r"C:/Users/carlo/SPR 1.1")
F = P / "github_pulso_app.json"
if not F.exists():
    F.write_text(json.dumps({"app_id": "1548838", "installation_id": 74840214}))
C = json.loads(F.read_text())

with open(P / "private-key.pem", "rb") as f:
    K = f.read()

t = int(time.time())
p = {"iat": t - 60, "exp": t + 600, "iss": C["app_id"]}
j = jwt.encode(p, K, algorithm="RS256")
h = {"Authorization": f"Bearer {j}", "Accept": "application/vnd.github+json"}
r = requests.post(f"https://api.github.com/app/installations/{C['installation_id']}/access_tokens", headers=h)

if r.status_code == 201:
    a = r.json()["token"]
    print("✅ Token gerado")
    t = requests.get("https://api.github.com/installation/repositories", headers={
        "Authorization": f"token {a}", "Accept": "application/vnd.github+json"
    })
    if t.status_code == 200:
        print("✅ Repositórios:")
        for i in t.json()["repositories"]:
            print(f"- {i['full_name']}")
    else:
        print("⚠️ Erro na consulta:", t.text)
else:
    print("❌ Falha ao obter token:", r.text)
