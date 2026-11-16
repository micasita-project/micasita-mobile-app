"""Un video por caso, iniciado por Maestro cuando su pantalla ya está lista."""
import csv
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import signal
import subprocess
import threading
import time

from record_android import mp4_duration, clock


class IOSRecordings:
    def __init__(self, device, root):
        self.device = device
        self.root = root
        self.current = None
        self.process = None
        self.log = None
        self.rows = []
        self.lock = threading.Lock()
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                if self.path != '/start':
                    self.send_error(404)
                    return
                try:
                    owner.start()
                    data = json.dumps({'recording': 'started', 'case': owner.current['case']}).encode()
                    self.send_response(200)
                except Exception as error:
                    data = json.dumps({'error': str(error)}).encode()
                    self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.url = f'http://127.0.0.1:{self.server.server_port}/start'
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def begin_case(self, case, title, destination):
        self.current = {'case': case, 'title': title, 'destination': str(destination),
                        'device': self.device, 'platform': 'ios', 'video': None,
                        'started_after_setup': True, 'video_edited': False}
        self.process = None

    def start(self):
        with self.lock:
            if not self.current:
                raise RuntimeError('No hay un caso activo para grabar')
            if self.process:
                if self.process.poll() is not None:
                    raise RuntimeError('La grabación se detuvo antes de terminar el caso')
                return
            dest = Path(self.current['destination'])
            video = dest / (self.current['case'] + '.mp4')
            if video.exists():
                raise RuntimeError('Ya existe el video; usar otro directorio para conservar el intento anterior')
            self.current['video'] = video.name
            self.current['command_started_timestamp'] = time.time()
            log_path = dest / 'screenrecord.log'
            self.log = log_path.open('w')
            self.process = subprocess.Popen(
                ['xcrun', 'simctl', 'io', self.device, 'recordVideo', '--codec=h264', '--mask=black', str(video)],
                stdout=self.log, stderr=subprocess.STDOUT)
            deadline = time.monotonic() + 20
            while time.monotonic() < deadline:
                if self.process.poll() is not None:
                    raise RuntimeError('No se pudo iniciar el video: ' + log_path.read_text()[-800:])
                if 'Recording started' in log_path.read_text():
                    self.current['first_frame_ready_timestamp'] = time.time()
                    time.sleep(.7)  # Pantalla inicial legible antes de la primera acción.
                    print(self.current['case'] + ' VIDEO INICIADO (pantalla lista)', flush=True)
                    return
                time.sleep(.05)
            raise RuntimeError('El simulador no confirmó el primer fotograma del video')

    def finish(self, status, message):
        row = {**self.current, 'status': status, 'message': message}
        dest = Path(row['destination'])
        duration = 0.0
        error = None
        if self.process:
            row['case_finished_timestamp'] = time.time()
            if self.process.poll() is not None:
                error = 'La grabación terminó antes de finalizar el caso'
            if self.process.poll() is None:
                time.sleep(2)  # Mantener el resultado final visible, sin editar el archivo.
                row['stop_requested_timestamp'] = time.time()
                self.process.send_signal(signal.SIGINT)
            try:
                self.process.wait(timeout=40)
                duration = mp4_duration(dest / row['video'])
                if duration <= 0:
                    raise ValueError('Duración vacía')
            except (OSError, ValueError, subprocess.TimeoutExpired) as exc:
                error = str(exc)
            finally:
                if self.process.poll() is None:
                    self.process.terminate()
                if self.log:
                    self.log.close()
            row['recording_status'] = 'complete' if not error else 'incomplete'
        else:
            row['recording_status'] = 'not_applicable' if status == 'BLOCKED' else 'not_started'
            if status != 'BLOCKED':
                error = 'No se alcanzó el punto de inicio de grabación con la pantalla preparada'
        row['video_duration_seconds'] = round(duration, 3)
        if row['video'] and not error:
            elapsed = row['case_finished_timestamp'] - row['command_started_timestamp']
            if duration < 2 or duration + 1.5 < elapsed:
                error = 'El video no cubre el resultado final completo del caso'
                row['recording_status'] = 'incomplete'
        row['capture_complete'] = None if status == 'BLOCKED' else bool(row['video'] and not error)
        row['recording_error'] = error
        if error:
            row['status'] = 'FAIL'
        row['timing_note'] = ('Tiempos relativos al comando de grabación, con un pequeño desfase del encoder. '
                              'La preparación inicial queda fuera del video. Las acciones del caso se conservan completas.')
        steps = self.steps(row, duration)
        row['steps'] = steps
        (dest / 'timeline.json').write_text(json.dumps(row, ensure_ascii=False, indent=2))
        with (dest / 'timeline.csv').open('w', newline='') as stream:
            writer = csv.writer(stream)
            writer.writerow(['start', 'end', 'start_seconds', 'end_seconds', 'case', 'title', 'action', 'status'])
            for step in steps:
                writer.writerow([clock(step['start_seconds']), clock(step['end_seconds']), step['start_seconds'],
                                 step['end_seconds'], row['case'], row['title'], step['action'], step['status']])
            if not steps:
                writer.writerow(['', '', '', '', row['case'], row['title'], message or error or 'Sin grabación', row['status']])
        lines = [f"# {row['case']} — {row['title']}", '', f"Resultado: **{row['status']}**.",
                 f"Grabación: **{row['recording_status']}**. Duración: **{clock(duration)}**.", '', row['timing_note'], '']
        if row['video']:
            lines.extend([f"[Video original]({row['video']}) · [CSV](timeline.csv) · [JSON](timeline.json)", '',
                          '| Inicio | Fin | Acción | Resultado |', '| --- | --- | --- | --- |'])
            for step in steps:
                lines.append(f"| {clock(step['start_seconds'])} | {clock(step['end_seconds'])} | {step['action']} | {step['status']} |")
            (dest / (row['case'] + '.srt')).write_text(
                f"1\n00:00:00,000 --> {clock(duration).replace('.', ',')}\n{row['case']} — {row['title']}\n")
        if message:
            lines.extend(['', message])
        if error:
            lines.extend(['', 'Error de grabación: ' + error])
        (dest / 'timeline.md').write_text('\n'.join(lines) + '\n')
        self.rows.append(row)
        self.current = None
        self.process = None
        self.write_index()
        if error:
            raise RuntimeError(error)

    def steps(self, row, duration):
        if not row['video'] or not duration:
            return []
        origin = row['command_started_timestamp']
        case = row['case']
        directories = [Path(row['destination'])]
        if case == 'CP001':
            directories += [self.root / 'CP001_a', self.root / 'CP001_b']
        steps = [{'start_seconds': 0, 'end_seconds': min(.7, duration),
                  'action': 'Pantalla inicial preparada', 'status': 'COMPLETED'}]
        names = {
            'common/login.yaml': 'Iniciar sesión', 'common/user.yaml': 'Entrar con la cuenta de Camila',
            'common/owner.yaml': 'Entrar con la cuenta de Carlos', 'common/admin.yaml': 'Entrar con la cuenta de Andrea',
            'common/register.yaml': 'Completar el registro', 'common/publish-next.yaml': 'Avanzar en el formulario',
            'common/publish-location.yaml': 'Seleccionar la dirección de la vivienda',
            'common/open-publish.yaml': 'Abrir el formulario de publicación',
            'common/hide-keyboard.yaml': 'Cerrar el teclado',
        }
        for directory in directories:
            for path in directory.rglob('commands.json'):
                for item in json.loads(path.read_text()):
                    meta = item.get('metadata', {})
                    if meta.get('depth') != 0 or not meta.get('timestamp') or meta.get('status') == 'SKIPPED':
                        continue
                    start = meta['timestamp'] / 1000 - origin
                    if not 0 <= start < duration:
                        continue
                    command = item.get('command', {})
                    kind = next(iter(command), '')
                    flow = command.get('runFlowCommand', {}).get('sourceDescription', '')
                    if 'start-recording' in flow:
                        continue
                    label = names.get(flow)
                    if not label:
                        if 'tapOn' in kind: label = 'Tocar el control indicado'
                        elif 'inputText' in kind: label = 'Escribir los datos del caso'
                        elif 'scroll' in kind.lower() or 'swipe' in kind.lower(): label = 'Desplazar la pantalla'
                        elif 'assert' in kind.lower(): label = 'Comprobar el resultado en pantalla'
                        elif 'wait' in kind.lower(): label = 'Esperar la pantalla esperada'
                        elif 'takeScreenshot' in kind: label = 'Guardar evidencia'
                        elif 'stopApp' in kind: label = 'Cerrar la app'
                        elif 'relaunch' in flow or 'launchApp' in kind: label = 'Volver a abrir la app'
                        elif kind == 'runFlowCommand':
                            nested = json.dumps(command)
                            if 'scrollUntilVisible' in nested or 'scrollCommand' in nested:
                                label = 'Desplazar la pantalla hasta el elemento esperado'
                            elif 'tapOnElement' in nested:
                                label = 'Tocar el control indicado'
                            elif 'launchApp' in nested:
                                label = 'Volver a abrir la app'
                            else:
                                continue
                        else: continue
                    steps.append({'start_seconds': round(start, 3),
                                  'end_seconds': round(min(duration, start + meta.get('duration', 0) / 1000), 3),
                                  'action': label, 'status': meta.get('status', 'UNKNOWN')})
        steps.sort(key=lambda step: step['start_seconds'])
        steps.append({'start_seconds': round(max(0, duration - 2), 3), 'end_seconds': round(duration, 3),
                      'action': 'Resultado final visible', 'status': row['status']})
        return steps

    def write_index(self):
        with (self.root / 'videos.csv').open('w', newline='') as stream:
            writer = csv.writer(stream)
            writer.writerow(['case', 'title', 'status', 'video', 'duration_seconds', 'timeline', 'recording_status'])
            for row in self.rows:
                case = row['case']
                writer.writerow([case, row['title'], row['status'], f"{case}/{row['video']}" if row['video'] else '',
                                 row['video_duration_seconds'], f'{case}/timeline.csv', row['recording_status']])
        (self.root / 'videos.json').write_text(json.dumps(self.rows, ensure_ascii=False, indent=2))
        lines = ['# Videos de la suite en iPhone', '',
                 'Un archivo original por caso. La grabación comienza con la pantalla preparada, antes de la primera acción evaluada.',
                 'Los casos bloqueados se identifican sin simular su ejecución.', '',
                 '| CP | Caso | Resultado | Duración del video | Video | Timeline |', '| --- | --- | --- | --- | --- | --- |']
        for row in self.rows:
            case = row['case']
            video = f"[MP4]({case}/{row['video']})" if row['video'] else '—'
            lines.append(f"| {case} | {row['title']} | {row['status']} | {clock(row['video_duration_seconds'])} | {video} | [Timeline]({case}/timeline.md) |")
        (self.root / 'videos.md').write_text('\n'.join(lines) + '\n')

    def close(self):
        self.server.shutdown()
        self.server.server_close()
