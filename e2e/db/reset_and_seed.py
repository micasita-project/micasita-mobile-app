"""Reconstruye exclusivamente micasita_e2e con fixtures conocidos para CP001–CP045."""
import json,os
from datetime import datetime
from pathlib import Path
from sqlalchemy import text
from context import *
from app.core.security import get_password_hash
from app.core.privacy import PRIVACY_POLICY_VERSION
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / 'results' / 'media'
MEDIA.mkdir(parents=True, exist_ok=True)
MEDIA_BASE_URL=os.environ.get('E2E_MEDIA_BASE_URL','http://localhost:8001' if os.environ.get('E2E_PLATFORM')=='ios' else 'http://10.0.2.2:8001').rstrip('/')
for i, color in enumerate(['#ad6a51','#638d71','#6377a7','#bc9944','#8d638d','#4a9294'],1):
    image = Image.new('RGB',(640,480),color)
    ImageDraw.Draw(image).text((80,200),f'MiCasita E2E - Foto {i}',fill='white')
    image.save(MEDIA / f'fixture-{i}.jpg')
with engine.begin() as c:
    c.execute(text('DROP SCHEMA public CASCADE'))
    c.execute(text('CREATE SCHEMA public'))
    c.execute(text('CREATE EXTENSION IF NOT EXISTS postgis'))
Base.metadata.create_all(engine)
with SessionLocal() as db:
    def user(email,name,last='Prueba',role='user',active=True):
        u=User(email=email,name=name,last_name=last,role=role,is_active=active,email_verified=True,
               hashed_password=get_password_hash('Admin-E2E-1234' if role=='admin' else 'Test-1234'),
               consent_accepted_at=datetime.utcnow(),consent_version=PRIVACY_POLICY_VERSION,
               home_lat=-12.090,home_lon=-77.050,home_address='Av. Arequipa 2000, Lince, Lima')
        db.add(u);db.flush()
        if role!='admin':
            w=Workplace(user_id=u.id,work_address='Primax, San Miguel',work_lat=-12.077,work_lon=-77.087)
            db.add(w);db.flush()
            db.add(RecommendationPreference(user_id=u.id,workplace_id=w.id,budget=1400,
                preferred_transportation='driving',max_distance_km=10))
        return u
    admin=user('admin@e2e-micasita.com','Admin',role='admin')
    usuario=user('usuario@e2e-micasita.com','Usuario')
    dueno=user('dueno@e2e-micasita.com','Dueño','Propietario')
    otro=user('otro@e2e-micasita.com','Otro','Propietario')
    victima=user('victima@e2e-micasita.com','Victima','Bloqueable')
    user('bloqueado@e2e-micasita.com','Bloqueado','Cuenta',active=False)
    props=[]
    def prop(owner,title,price=1200,status='approved',reason=None,offset=0):
        lat,lon=-12.070+offset*.0007,-77.080+offset*.0002
        p=Property(publisher_id=owner.id,title=title,status=status,rejection_reason=reason,
            property_type='Departamento',district='San Miguel',address='Av. de Prueba 100, San Miguel',
            latitude=lat,longitude=lon,location=f'SRID=4326;POINT({lon} {lat})',currency='PEN',price=price,
            total_area_sqm=60,covered_area_sqm=55,bedrooms=2,bathrooms=1,parking=0,
            description='Vivienda creada para las pruebas automatizadas.',phone='987654321',
            images=[f'{MEDIA_BASE_URL}/e2e-media/fixture-{i}.jpg' for i in [1,2]],
            features=['Ascensor','Seguridad 24/7'],hidden_by_user_block=False)
        db.add(p);db.flush();props.append({'id':p.id,'title':title,'status':status,'price':price,'reason':reason})
        return p
    prop(admin,'E2E Ficha Completa',1300)
    prop(dueno,'E2E Aprobada Dueno',1250,offset=1)
    for i,price in enumerate([900,1000,1100,1200,1400,1500,1600,1800,2500]*2):
        prop(admin,f'E2E Catalogo {i+1:02}',price,offset=i+2)
    prop(dueno,'E2E Pendiente Dueno',1300,'pending')
    prop(dueno,'E2E Rechazada Dueno',1100,'rejected','Fotos borrosas')
    prop(otro,'E2E Pendiente Admin A',1500,'pending')
    prop(otro,'E2E Pendiente Admin B',1600,'pending')
    prop(victima,'E2E Casa Victima',1350,offset=4)
    db.commit()
    (ROOT/'results'/'fixtures.json').write_text(json.dumps({'properties':props},ensure_ascii=False,indent=2))
    print(f'micasita_e2e: {db.query(User).count()} usuarios, {len(props)} viviendas; 21 aprobadas.')
