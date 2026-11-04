"""Genera la referencia real de recomendaciones contra el backend E2E encendido."""
import json,os,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'db'))
from context import engine
import requests
base='http://127.0.0.1:8001'
r=requests.post(base+'/auth/login',data={'username':'usuario@e2e-micasita.com','password':'Test-1234'},timeout=15);r.raise_for_status()
headers={'Authorization':'Bearer '+r.json()['access_token']}
r=requests.get(base+'/workplaces/',headers=headers,timeout=15);r.raise_for_status();work=r.json()[0]
r=requests.post(base+f'/recommend/workplaces/{work["id"]}/generate',headers=headers,timeout=90);r.raise_for_status();data=r.json()
assert data['results'],'Faltan viviendas recomendadas en el entorno de pruebas'
assert data['results'][0].get('franjas'),'OSRM público no disponible: no hay franjas horarias reales'
(ROOT/'results/baseline-recommendations.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
print('Referencia real guardada: '+str(data['total'])+' resultados, con franjas horarias.')
