"""Precondiciones y postcondiciones persistidas, siempre en micasita_e2e."""
import json,sys,time,os
from pathlib import Path
from context import *
ROOT=Path(__file__).resolve().parents[1]
def media_urls(value,base):
    if isinstance(value,dict):return {key:media_urls(item,base) for key,item in value.items()}
    if isinstance(value,list):return [media_urls(item,base) for item in value]
    if isinstance(value,str) and '/e2e-media/' in value:return base+'/e2e-media/'+value.split('/e2e-media/',1)[1]
    return value
def prepare(case):
    fixtures=json.loads((ROOT/'results/fixtures.json').read_text())
    media_base=os.environ.get('E2E_MEDIA_BASE_URL','http://10.0.2.2:8001').rstrip('/')
    with SessionLocal() as db:
        u=db.query(User).filter_by(email='usuario@e2e-micasita.com').one()
        w=db.query(Workplace).filter_by(user_id=u.id).order_by(Workplace.id).first()
        for extra in db.query(Workplace).filter(Workplace.user_id==u.id,Workplace.id!=w.id).all(): db.delete(extra)
        w.work_address='Primax, San Miguel';w.work_lat=-12.077;w.work_lon=-77.087
        pref=db.query(RecommendationPreference).filter_by(workplace_id=w.id).one()
        pref.budget=100 if case=='CP010' else 1400;pref.preferred_transportation='driving'
        db.query(Favorite).delete()
        db.query(RecommendationHistory).delete()
        baseline=ROOT/'results/baseline-recommendations.json'
        if baseline.exists() and case not in ['CP009','CP010']:
            db.add(RecommendationHistory(workplace_id=w.id,results=json.dumps(media_urls(json.loads(baseline.read_text()),media_base))))
        for row in fixtures['properties']:
            p=db.get(Property,row['id'])
            p.status=row['status'];p.price=row['price'];p.rejection_reason=row['reason'];p.hidden_by_user_block=False
            p.images=media_urls(p.images,media_base)
        for p in db.query(Property).filter(Property.title.like('E2E Nuevo%')).all(): db.delete(p)
        for usr in db.query(User).filter(User.email.in_(['victima@e2e-micasita.com','bloqueado@e2e-micasita.com'])):
            usr.is_active=usr.email!='bloqueado@e2e-micasita.com'
        db.commit()
    (ROOT/'results/active-case').write_text(case)
    (ROOT/'results/api-events.jsonl').write_text('')

def verify(case):
    path=ROOT/'results/api-events.jsonl'
    events=[json.loads(x) for x in path.read_text().splitlines() if x.strip()] if path.exists() else []
    events=[e for e in events if e['case']==case]
    def calls(path,method=None):return [e for e in events if e['path']==path and (not method or e['method']==method) and e['status']==200]
    with SessionLocal() as db:
        u=db.query(User).filter_by(email='usuario@e2e-micasita.com').one()
        w=db.query(Workplace).filter_by(user_id=u.id).order_by(Workplace.id).first()
        p=lambda title:db.query(Property).filter_by(title=title).one()
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
        elif case=='CP017':assert db.query(Favorite).filter_by(user_id=u.id,property_id=p('E2E Ficha Completa').id).count()==1
        elif case in ['CP025','CP026']:
            prop=p('E2E Nuevo '+case);assert prop.status=='pending' and len(prop.images)>0
            if case=='CP025':assert {'Gimnasio','Piscina','WiFi'}.issubset(set(prop.features))
        elif case=='CP027':assert p('E2E Pendiente Dueno').status=='pending' and p('E2E Pendiente Dueno').price==1300
        elif case=='CP030':
            pending=calls('/admin/properties/pending','GET')
            assert pending,'No se solicitó la lista de moderación'
            fetched={row['id'] for e in pending for row in e['body']}
            assert fetched=={row.id for row in db.query(Property).filter_by(status='pending').all()},'La lista no contiene todas y solo las pendientes'
        elif case=='CP034':
            fetched={row['id'] for e in calls('/admin/users','GET') for row in e['body']}
            assert fetched=={usr.id for usr in db.query(User).all()},'No se cargaron todos los usuarios'
        elif case=='CP035':
            filtered=[e for e in calls('/admin/users','GET') if e['query'].get('search')=='usuario@e2e-micasita.com']
            assert filtered and [x['email'] for x in filtered[-1]['body']]==['usuario@e2e-micasita.com']
        elif case=='CP028':
            fetched=calls('/properties/mine','GET');owner=db.query(User).filter_by(email='dueno@e2e-micasita.com').one()
            assert fetched and {x['id'] for x in fetched[-1]['body']}=={p.id for p in db.query(Property).filter_by(publisher_id=owner.id).all()}
        elif case=='CP032':
            assert p('E2E Pendiente Admin A').status=='approved'
            assert any(x['title']=='E2E Pendiente Admin A' for e in calls('/properties/','GET') for x in e['body']['items']),'No se sirvió la aprobada en el catálogo del otro usuario'
        elif case=='CP033':
            assert p('E2E Pendiente Admin B').status=='rejected' and p('E2E Pendiente Admin B').rejection_reason=='Fotos borrosas E2E'
            feed=calls('/properties/','GET');assert feed
            assert all(x['title']!='E2E Pendiente Admin B' for e in feed for x in e['body']['items'])
        elif case=='CP036':
            assert not db.query(User).filter_by(email='victima@e2e-micasita.com').one().is_active
            assert p('E2E Casa Victima').hidden_by_user_block
            feed=calls('/properties/','GET');assert feed
            assert all(x['title']!='E2E Casa Victima' for e in feed for x in e['body']['items'])
        elif case in ['CP044','CP045']:
            prop=p('E2E Aprobada Dueno' if case=='CP044' else 'E2E Rechazada Dueno')
            assert prop.status=='pending' and prop.price==1450,'Edición no persistida o no regresó a pendiente'
        if case in ['CP033','CP036']:
            fetched={row['id'] for e in calls('/properties/','GET') for row in e['body']['items']}
            expected={row.id for row in db.query(Property).filter_by(status='approved',hidden_by_user_block=False).all()}
            assert fetched==expected,'Se debe revisar el catálogo completo con el otro usuario'
    print(case+': postcondiciones verificadas en BD/tráfico HTTP real')
if __name__=='__main__':
    (prepare if sys.argv[1]=='prepare' else verify)(sys.argv[2])
