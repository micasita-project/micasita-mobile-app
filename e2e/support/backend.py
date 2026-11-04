"""Servidor E2E real; solo correo y almacenamiento Cloudinary se sustituyen localmente."""
import sys, json, time, uuid, os
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'db'))
from context import engine
from app.core.email import email_service
email_service.send_email = lambda *args, **kwargs: True
import cloudinary.uploader
MEDIA = ROOT / 'results' / 'media'
MEDIA.mkdir(parents=True, exist_ok=True)
MEDIA_BASE_URL = os.environ.get('E2E_MEDIA_BASE_URL', 'http://10.0.2.2:8001').rstrip('/')
def local_upload(content, **kwargs):
    name = uuid.uuid4().hex + '.jpg'
    (MEDIA / name).write_bytes(content)
    return {'secure_url': MEDIA_BASE_URL + '/e2e-media/' + name}
cloudinary.uploader.upload = local_upload
from app.main import app
from app.core.config import settings
from starlette.staticfiles import StaticFiles
app.mount('/e2e-media', StaticFiles(directory=MEDIA), name='e2e-media')
@app.get('/e2e-info')
def environment_info():
    return {'database': engine.url.database,
            'media_base_url': MEDIA_BASE_URL,
            'osrm_urls': {'driving': settings.OSRM_DRIVING_URL,
                          'cycling': settings.OSRM_CYCLING_URL,
                          'walking': settings.OSRM_WALKING_URL},
            'osrm_public': all(url.startswith('https://routing.openstreetmap.de/') for url in
                [settings.OSRM_DRIVING_URL, settings.OSRM_CYCLING_URL, settings.OSRM_WALKING_URL])}

@app.middleware('http')
async def record_requests(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith(('/properties', '/recommend/', '/workplaces', '/route', '/geocode', '/admin')):
        chunks = [chunk async for chunk in response.body_iterator]
        raw = b''.join(c.encode() if isinstance(c, str) else c for c in chunks)
        async def replay():
            yield raw
        response.body_iterator = replay()
        try: body = json.loads(raw)
        except (ValueError, UnicodeError): body = None
        marker = ROOT / 'results' / 'active-case'
        event = {'case': marker.read_text().strip() if marker.exists() else None,
                 'time': time.time(), 'method': request.method, 'path': request.url.path,
                 'query': dict(request.query_params), 'status': response.status_code, 'body': body}
        with (ROOT / 'results' / 'api-events.jsonl').open('a') as f:
            f.write(json.dumps(event, ensure_ascii=False, default=str) + '\n')
    return response
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8001)
