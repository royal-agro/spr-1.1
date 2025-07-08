# -*- coding: utf-8 -*-
import jwt, time, requests, json, os

base = r"C:\Users\carlo\SPR 1.1\credenciais"
with open(fr"{base}\github_pulso_app.json") as f:
    c = json.load(f)
with open(fr"{base}\github_pulso_private_key.pem") as f:
    k = f.read()

t = int(time.time())
payload = {"iat": t - 60, "exp": t + 600, "iss": c["app_id"]}
jwt_token = jwt.encode(payload, k, algorithm="RS256")

headers = {
    "Authorization": f"Bearer {jwt_token}",
    "Accept": "application/vnd.github+json"
}

print("🔐 JWT gerado com sucesso.\n")
print("📡 Consultando instalações...")
resp = requests.get("https://api.github.com/app/installations", headers=headers)
print("↩️ Resposta da API /app/installations:\n")
print(resp.status_code)
print(resp.text)