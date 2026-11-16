"""Copia micasita_db local a micasita_e2e y agrega los datos de prueba sin borrar el seed."""
import json,os,sys,hashlib
from io import BytesIO
from datetime import datetime
from pathlib import Path
from context import *
from app.core.security import get_password_hash
from app.core.privacy import PRIVACY_POLICY_VERSION
from PIL import Image
import requests
ROOT = Path(__file__).resolve().parents[1]
SAMPLE = json.loads((ROOT / 'sample_data.json').read_text())
sys.path.insert(0, str(ROOT.parents[1] / 'micasita-ai-backend' / 'scripts'))
from local_database import clone_database
MEDIA = ROOT / 'results' / 'media'
MEDIA.mkdir(parents=True, exist_ok=True)
MEDIA_BASE_URL=os.environ.get('E2E_MEDIA_BASE_URL','http://localhost:8001' if os.environ.get('E2E_PLATFORM')=='ios' else 'http://10.0.2.2:8001').rstrip('/')
engine.dispose()
clone_info = clone_database(engine.url.set(database='micasita_db'))
Base.metadata.create_all(engine)
baseline = ROOT / 'results/baseline-recommendations.json'
if baseline.exists():
    baseline.rename(baseline.with_name('baseline-recommendations-before-clone-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '.json'))
with SessionLocal() as db:
    seed_properties = db.query(Property).count()
    # Solo la copia de demostración: no mostrar el correo personal del administrador del seed.
    seed_admin = db.query(User).filter_by(role='admin').one()
    for field in ['email', 'name', 'last_name']:
        setattr(seed_admin, field, SAMPLE['seed_admin'][field])
    # Fotos reales del catálogo: se descargan sin rótulos y se suben al disco local.
    photo_sources = []
    for source in db.query(Property).order_by(Property.id).limit(20):
        url = next((url for url in (source.images or []) if url.lower().endswith('.jpg')), None)
        if not url or any(row['source_url'] == url for row in photo_sources):
            continue
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))
        image.verify()
        if image.format != 'JPEG' or len(response.content) > 5 * 1024 * 1024:
            continue
        name = f'fixture-{len(photo_sources)+1}.jpg'
        (MEDIA / name).write_bytes(response.content)
        photo_sources.append({'file': name, 'source_url': url, 'sha256': hashlib.sha256(response.content).hexdigest()})
        if len(photo_sources) == 6:
            break
    if len(photo_sources) != 6:
        raise RuntimeError('No se pudieron preparar seis fotos de viviendas del catálogo')
    (ROOT/'results/media-sources.json').write_text(json.dumps(photo_sources, indent=2))
    reserved_prices = [1301, 1501, 1601, 1351]
    if db.query(Property).filter(Property.price.in_(reserved_prices)).first():
        raise RuntimeError('El seed usa un precio reservado de E2E: actualizar fixtures y filtros de los flujos')
    def user(key):
        person=SAMPLE['accounts'][key]
        u=User(email=person['email'],name=person['name'],last_name=person['last_name'],role=person['role'],is_active=person['active'],email_verified=True,
               hashed_password=get_password_hash(SAMPLE['password']),
               consent_accepted_at=datetime.utcnow(),consent_version=PRIVACY_POLICY_VERSION,
               home_lat=-12.090,home_lon=-77.050,home_address='Av. Arequipa 2000, Lince, Lima')
        db.add(u);db.flush()
        if person['role']!='admin':
            w=Workplace(user_id=u.id,work_address='Primax, San Miguel',work_lat=-12.077,work_lon=-77.087)
            db.add(w);db.flush()
            db.add(RecommendationPreference(user_id=u.id,workplace_id=w.id,budget=1400,
                preferred_transportation='driving',max_distance_km=10))
        return u
    admin=user('admin')
    usuario=user('user')
    dueno=user('owner')
    otro=user('other_owner')
    victima=user('block_target')
    user('blocked')
    props=[]
    def prop(owner,title,price=1200,status='approved',reason=None,offset=0):
        lat,lon=-12.070+offset*.0007,-77.080+offset*.0002
        p=Property(publisher_id=owner.id,title=title,status=status,rejection_reason=reason,
            property_type='Departamento',district='San Miguel',address=SAMPLE['property_address'],
            latitude=lat,longitude=lon,location=f'SRID=4326;POINT({lon} {lat})',currency='PEN',price=price,
            total_area_sqm=60,covered_area_sqm=55,bedrooms=2,bathrooms=1,parking=0,
            description=SAMPLE['property_description'],phone='987654321',
            images=[f'{MEDIA_BASE_URL}/e2e-media/fixture-{i}.jpg' for i in [1,2]],
            features=['Ascensor','Seguridad 24/7'],hidden_by_user_block=False)
        db.add(p);db.flush();props.append({'id':p.id,'title':title,'status':status,'price':price,'reason':reason})
        return p
    titles=SAMPLE['property_titles']
    prop(admin,titles['complete'],1301)
    prop(dueno,titles['owner_approved'],1250,offset=1)
    for i,price in enumerate([900,1000,1100,1200,1400,1500,1600,1800,2500]*2):
        prop(admin,SAMPLE['catalog_titles'][i],price,offset=i+2)
    prop(dueno,titles['owner_pending'],1300,'pending')
    prop(dueno,titles['owner_rejected'],1100,'rejected','Fotos borrosas')
    prop(otro,titles['admin_approve'],1501,'pending')
    prop(otro,titles['admin_reject'],1601,'pending')
    prop(victima,titles['block_target'],1351,offset=4)
    db.commit()
    (ROOT/'results'/'fixtures.json').write_text(json.dumps({'properties':props,'seed_properties':seed_properties,'clone':clone_info},ensure_ascii=False,indent=2))
    print(f'micasita_e2e: {seed_properties} viviendas del seed conservadas + {len(props)} viviendas E2E; {db.query(User).count()} usuarios.')
