"""Precondiciones y postcondiciones persistidas, siempre en micasita_e2e."""
import json,sys,time,os
from pathlib import Path
from context import *
ROOT=Path(__file__).resolve().parents[1]
SAMPLE=json.loads((ROOT/'sample_data.json').read_text())
def media_urls(value,base):
    if isinstance(value,dict):return {key:media_urls(item,base) for key,item in value.items()}
    if isinstance(value,list):return [media_urls(item,base) for item in value]
    if isinstance(value,str) and '/e2e-media/' in value:return base+'/e2e-media/'+value.split('/e2e-media/',1)[1]
    return value
def prepare(case):
    fixtures=json.loads((ROOT/'results/fixtures.json').read_text())
    media_base=os.environ.get('E2E_MEDIA_BASE_URL','http://10.0.2.2:8001').rstrip('/')
    with SessionLocal() as db:
        u=db.query(User).filter_by(email='camila.rojas@example.com').one()
        w=db.query(Workplace).filter_by(user_id=u.id).order_by(Workplace.id).first()
        for extra in db.query(Workplace).filter(Workplace.user_id==u.id,Workplace.id!=w.id).all(): db.delete(extra)
        w.work_address='Primax, San Miguel';w.work_lat=-12.077;w.work_lon=-77.087
        pref=db.query(RecommendationPreference).filter_by(workplace_id=w.id).one()
        pref.budget=100 if case=='CP010' else 1400;pref.preferred_transportation='driving'
        db.query(Favorite).filter_by(user_id=u.id).delete()
        db.query(RecommendationHistory).filter_by(workplace_id=w.id).delete()
        baseline=ROOT/'results/baseline-recommendations.json'
        if baseline.exists() and case not in ['CP009','CP010']:
            db.add(RecommendationHistory(workplace_id=w.id,results=json.dumps(media_urls(json.loads(baseline.read_text()),media_base))))
        for row in fixtures['properties']:
            p=db.get(Property,row['id'])
            p.status=row['status'];p.price=row['price'];p.rejection_reason=row['reason'];p.hidden_by_user_block=False
            p.images=media_urls(p.images,media_base)
        owner=db.query(User).filter_by(email=SAMPLE['accounts']['owner']['email']).one()
        created_titles=[SAMPLE['new_listing_default'],*SAMPLE['new_listing_titles'].values()]
        for p in db.query(Property).filter(Property.publisher_id==owner.id,Property.title.in_(created_titles)).all(): db.delete(p)
        if case=='CP001':
            previous=db.query(User).filter_by(email=SAMPLE['registration']['email']).one_or_none()
            if previous:
                db.delete(previous)
            from app.models.otp_code import OtpCode
            db.query(OtpCode).filter_by(email=SAMPLE['registration']['email']).delete()
        for usr in db.query(User).filter(User.email.in_(['diego.vargas@example.com','lucia.herrera@example.com'])):
            usr.is_active=usr.email!='lucia.herrera@example.com'
        db.commit()
    (ROOT/'results/active-case').write_text(case)
    (ROOT/'results/api-events.jsonl').write_text('')

def verify(case):
    path=ROOT/'results/api-events.jsonl'
    events=[json.loads(x) for x in path.read_text().splitlines() if x.strip()] if path.exists() else []
    events=[e for e in events if e['case']==case]
    def calls(path,method=None):return [e for e in events if e['path']==path and (not method or e['method']==method) and e['status']==200]
    with SessionLocal() as db:
        u=db.query(User).filter_by(email='camila.rojas@example.com').one()
        w=db.query(Workplace).filter_by(user_id=u.id).order_by(Workplace.id).first()
        fixture_ids={row['title']:row['id'] for row in json.loads((ROOT/'results/fixtures.json').read_text())['properties']}
        owner=db.query(User).filter_by(email=SAMPLE['accounts']['owner']['email']).one()
        p=lambda title:db.get(Property,fixture_ids[title]) if title in fixture_ids else db.query(Property).filter_by(title=title,publisher_id=owner.id).one()
        if case=='CP002':assert db.query(User).filter_by(email=u.email).count()==1,'Se duplicó la cuenta'
        elif case=='CP003':
            works=db.query(Workplace).filter_by(user_id=u.id).all()
            assert len(works)==2 and any('Primax' in x.work_address for x in works),'Trabajo no guardado'
            assert all(-12.7<x.work_lat<-11.5 and -77.5<x.work_lon<-76.5 for x in works)
        elif case=='CP004':
            assert db.query(Workplace).filter_by(user_id=u.id).count()==1,'Se guardó una dirección inválida'
            assert w.work_address=='Primax, San Miguel' and w.work_lat==-12.077 and w.work_lon==-77.087
        elif case=='CP006':
            feed=calls('/properties/','GET')
            assert any(int(e['query'].get('skip','0'))==0 and len(e['body']['items'])==10 for e in feed),'No se cargó página inicial de 10'
            assert any(int(e['query'].get('skip','0'))==10 and len(e['body']['items'])==10 for e in feed),'No se cargó segunda página de 10'
        elif case in ['CP007','CP008']:
            feed=calls('/properties/','GET')
            if case=='CP008':feed=[e for e in feed if e['query'].get('min_price')=='1000' and e['query'].get('max_price')=='1500']
            assert feed,'La UI no solicitó el catálogo esperado'
            for e in feed:
                for item in e['body']['items']:
                    assert item['status']=='approved'
                    if case=='CP008':assert 1000<=item['price']<=1500
        elif case in ['CP009','CP018']:
            h=db.query(RecommendationHistory).filter_by(workplace_id=w.id).order_by(RecommendationHistory.id.desc()).first()
            assert h,'No se guardó la recomendación generada'
            data=json.loads(h.results);items=data['results'] if isinstance(data,dict) else data
            assert items,'Sin recomendaciones'
            scores=[x['match_score'] for x in items];assert scores==sorted(scores,reverse=True),'Puntajes desordenados'
            assert all(x['predicted_time_min']>0 for x in items)
            if case=='CP018':
                pref=db.query(RecommendationPreference).filter_by(workplace_id=w.id).one()
                assert pref.preferred_transportation=='cycling'
                before={x['property']['id']:x['predicted_time_min'] for x in json.loads((ROOT/'results/baseline-recommendations.json').read_text())['results']}
                assert any(x['property']['id'] in before and x['predicted_time_min']!=before[x['property']['id']] for x in items),'Los tiempos no cambiaron'
        elif case=='CP010':
            h=db.query(RecommendationHistory).filter_by(workplace_id=w.id).order_by(RecommendationHistory.id.desc()).first()
            assert h
            data=json.loads(h.results);assert data['results']==[] and data.get('min_price_in_area',0)>100
        elif case in ['CP012','CP015','CP042']:
            routes=calls('/route')
            assert routes,'No hubo cálculo de ruta'
            if case=='CP015':
                e=routes[-1];pts=e['body']['waypoints'];assert len(pts)>2 and e['body']['from_osrm'],'No hay geometría vial real'
                from math import hypot
                q=e['query']
                # OSRM ajusta los extremos al segmento vial más cercano (tolerancia 300 m).
                assert hypot(pts[0]['latitude']-float(q['origin_lat']),pts[0]['longitude']-float(q['origin_lon']))<.003
                assert hypot(pts[-1]['latitude']-float(q['dest_lat']),pts[-1]['longitude']-float(q['dest_lon']))<.003
            if case=='CP042':assert any(e['body'].get('franjas') and len(e['body']['franjas'])==3 for e in routes)
        elif case=='CP017':assert db.query(Favorite).filter_by(user_id=u.id,property_id=p('Departamento luminoso en San Miguel').id).count()==1
        elif case in ['CP025','CP026']:
            prop=p(SAMPLE['new_listing_titles'][case]);assert prop.status=='pending' and len(prop.images)>0
            if case=='CP025':assert {'Gimnasio','Piscina','WiFi'}.issubset(set(prop.features))
        elif case=='CP027':assert p('Departamento cerca de la universidad').status=='pending' and p('Departamento cerca de la universidad').price==1300
        elif case=='CP030':
            pending=calls('/admin/properties/pending','GET')
            assert pending,'No se solicitó la lista de moderación'
            fetched={row['id'] for e in pending for row in e['body']}
            assert fetched=={row.id for row in db.query(Property).filter_by(status='pending').all()},'La lista no contiene todas y solo las pendientes'
        elif case=='CP034':
            fetched={row['id'] for e in calls('/admin/users','GET') for row in e['body']}
            assert fetched=={usr.id for usr in db.query(User).all()},'No se cargaron todos los usuarios'
        elif case=='CP035':
            filtered=[e for e in calls('/admin/users','GET') if e['query'].get('search')=='camila.rojas@example.com']
            assert filtered and [x['email'] for x in filtered[-1]['body']]==['camila.rojas@example.com']
        elif case=='CP028':
            fetched=calls('/properties/mine','GET');owner=db.query(User).filter_by(email='carlos.mendoza@example.com').one()
            assert fetched and {x['id'] for x in fetched[-1]['body']}=={p.id for p in db.query(Property).filter_by(publisher_id=owner.id).all()}
        elif case=='CP032':
            assert p('Departamento amplio en San Borja').status=='approved'
            assert any(x['title']=='Departamento amplio en San Borja' for e in calls('/properties/','GET') for x in e['body']['items']),'No se sirvió la aprobada en el catálogo del otro usuario'
        elif case=='CP033':
            assert p('Departamento amoblado en Lince').status=='rejected' and p('Departamento amoblado en Lince').rejection_reason=='Las fotos no son claras'
            feed=calls('/properties/','GET');assert feed
            assert all(x['title']!='Departamento amoblado en Lince' for e in feed for x in e['body']['items'])
        elif case=='CP036':
            assert not db.query(User).filter_by(email='diego.vargas@example.com').one().is_active
            assert p('Departamento junto al centro comercial').hidden_by_user_block
            feed=calls('/properties/','GET');assert feed
            assert all(x['title']!='Departamento junto al centro comercial' for e in feed for x in e['body']['items'])
        elif case in ['CP044','CP045']:
            prop=p('Departamento con vista al parque' if case=='CP044' else 'Minidepartamento cerca del mercado')
            assert prop.status=='pending' and prop.price==1450,'Edición no persistida o no regresó a pendiente'
        if case in ['CP033','CP036']:
            price=1601 if case=='CP033' else 1351
            filtered=[e for e in calls('/properties/','GET') if e['query'].get('min_price')==str(price) and e['query'].get('max_price')==str(price)]
            assert filtered,'La UI debe buscar por el precio reservado de la vivienda modificada'
            expected={row.id for row in db.query(Property).filter_by(status='approved',hidden_by_user_block=False,price=price).all()}
            assert not expected,'La vivienda rechazada u oculta no debe formar parte del catálogo público'
            assert all(e['body']['items']==[] and e['body']['total']==0 for e in filtered),'El catálogo filtrado debe confirmar la ausencia de la vivienda'
    print(case+': postcondiciones verificadas en BD/tráfico HTTP real')
if __name__=='__main__':
    (prepare if sys.argv[1]=='prepare' else verify)(sys.argv[2])
