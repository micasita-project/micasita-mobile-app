"""Acceso exclusivo a micasita_e2e; importar antes de los modelos del backend."""
from sqlalchemy.engine.url import make_url
from app.core.config import settings
source_url = make_url(settings.DATABASE_URL)
if source_url.host not in {'localhost', '127.0.0.1', '::1'} or source_url.query:
    raise RuntimeError('E2E exige PostgreSQL local, sin parámetros adicionales de conexión')
settings.DATABASE_URL = source_url.set(database='micasita_e2e').render_as_string(hide_password=False)
from app.core.database import Base, SessionLocal, engine
if engine.url.database != 'micasita_e2e':
    raise RuntimeError('Solo se permite micasita_e2e')
import app.models.user, app.models.property, app.models.favorite, app.models.workplace
import app.models.recommendation_preference, app.models.recommendation_history, app.models.otp_code
from app.models.user import User
from app.models.property import Property
from app.models.favorite import Favorite
from app.models.workplace import Workplace
from app.models.recommendation_preference import RecommendationPreference
from app.models.recommendation_history import RecommendationHistory
