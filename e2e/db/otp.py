"""
Imprime el código de verificación vigente de un correo en la base de pruebas.
Uso (desde micasita-ai-backend): PYTHONPATH=. venv/bin/python ../micasita-mobile-app/e2e/db/otp.py correo
"""
import sys
import time
from datetime import datetime

from sqlalchemy.engine.url import make_url

from app.core.config import settings

url = make_url(settings.DATABASE_URL).set(database="micasita_e2e")
settings.DATABASE_URL = url.render_as_string(hide_password=False)

from app.core.database import SessionLocal, engine  # noqa: E402
from app.models.otp_code import OtpCode  # noqa: E402

if engine.url.database != "micasita_e2e":
    sys.exit("Solo se permite la base micasita_e2e.")

purpose = sys.argv[2] if len(sys.argv) > 2 else "email_verify"
# El endpoint genera el OTP en BackgroundTasks, después de responder al móvil.
for attempt in range(10):
    with SessionLocal() as db:
        row = db.query(OtpCode).filter(
            OtpCode.email == sys.argv[1],
            OtpCode.purpose == purpose,
            OtpCode.expires_at > datetime.utcnow(),
        ).first()
        if row:
            print(row.code)
            break
    time.sleep(1)
else:
    sys.exit("Sin código vigente para ese correo en micasita_e2e.")
