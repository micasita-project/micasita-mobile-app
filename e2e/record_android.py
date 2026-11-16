"""Graba una pasada Android sin editar y exporta sus marcas de tiempo reales."""
import argparse
import csv
import datetime
import json
import os
from pathlib import Path
import shutil
import signal
import struct
import subprocess
import time

ROOT = Path(__file__).resolve().parent
APP = ROOT.parent


def mp4_duration(path):
    """Leer mvhd con seek: no cargar un video largo entero en memoria."""
    with path.open('rb') as stream:
        def boxes(begin, end):
            offset = begin
            while offset + 8 <= end:
                stream.seek(offset)
                size, kind = struct.unpack('>I4s', stream.read(8))
                header = 8
                if size == 1:
                    size = struct.unpack('>Q', stream.read(8))[0]
                    header = 16
                if size == 0:
                    size = end - offset
                if size < header or offset + size > end:
                    raise ValueError('Caja MP4 incompleta')
                yield kind, offset + header, offset + size
                offset += size
        for kind, begin, end in boxes(0, path.stat().st_size):
            if kind == b'moov':
                for child, payload, _ in boxes(begin, end):
                    if child == b'mvhd':
                        stream.seek(payload)
                        data = stream.read(32)
                        if data[0] == 0:
                            scale, length = struct.unpack_from('>II', data, 12)
                        else:
                            scale = struct.unpack_from('>I', data, 20)[0]
                            length = struct.unpack_from('>Q', data, 24)[0]
                        if scale and length:
                            return length / scale
    raise ValueError('El MP4 no tiene una duración válida')


def clock(seconds):
    milliseconds = round(max(0, seconds) * 1000)
    hours, remainder = divmod(milliseconds, 3600000)
    minutes, remainder = divmod(remainder, 60000)
    return f'{hours:02d}:{minutes:02d}:{remainder / 1000:06.3f}'


def export_timeline(folder, recording):
    suite = folder / 'suite'
    events = [json.loads(line) for line in (suite / 'case-events.jsonl').read_text().splitlines() if line]
    starts = {e['case']: e for e in events if e['event'] == 'case_start'}
    ends = {e['case']: e for e in events if e['event'] == 'case_end'}
    duration = mp4_duration(folder / recording['video'])
    origin = recording['command_started_timestamp']
    rows = []
    for case, start in starts.items():
        end = ends.get(case)
        raw_begin = start['timestamp'] - origin
        raw_end = end['timestamp'] - origin if end else duration
        rows.append({
            'case': case, 'title': start['title'],
            'start_seconds': round(min(duration, max(0, raw_begin)), 3),
            'end_seconds': round(min(duration, max(0, raw_end)), 3),
            'measured_start_seconds': round(raw_begin, 3),
            'measured_end_seconds': round(raw_end, 3),
            'status': end['status'] if end else 'INCOMPLETE',
            'message': end.get('message', '') if end else 'Sin evento de fin',
        })
    selected = recording['selected_cases']
    complete = set(starts) == set(ends) == set(selected) and recording.get('suite_ended_timestamp', float('inf')) - origin <= duration + 2
    data = {
        **recording, 'video_duration_seconds': round(duration, 3),
        'video_edited': False, 'capture_complete': complete,
        'timing_note': 'Marcas del reloj del ejecutor respecto al inicio del comando ADB. '
                       'Hay un pequeño desfase de arranque del encoder; no son marcas exactas por fotograma. '
                       'Cada CP incluye su preparación y verificación posterior. BLOCKED no significa ejecutado.',
        'cases': rows,
    }
    (folder / 'timeline.json').write_text(json.dumps(data, ensure_ascii=False, indent=2))
    with (folder / 'timeline.csv').open('w', newline='') as stream:
        writer = csv.writer(stream)
        writer.writerow(['start', 'end', 'start_seconds', 'end_seconds', 'case', 'title', 'status', 'message'])
        for row in rows:
            writer.writerow([clock(row['start_seconds']), clock(row['end_seconds']), row['start_seconds'], row['end_seconds'],
                             row['case'], row['title'], row['status'], row['message']])
    captions = []
    for row in rows:
        if row['status'] == 'BLOCKED' or row['end_seconds'] - row['start_seconds'] < .2:
            continue
        captions.append(f"{len(captions) + 1}\n{clock(row['start_seconds']).replace('.', ',')} --> "
                        f"{clock(row['end_seconds']).replace('.', ',')}\n{row['case']} — {row['title']}\n")
    (folder / 'cases.srt').write_text('\n'.join(captions))
    counts = {status: sum(row['status'] == status for row in rows) for status in ['PASS', 'FAIL', 'BLOCKED', 'INCOMPLETE']}
    lines = ['# Timeline de la grabación Android', '',
             'Video original continuo, vertical, sin cortes ni rótulos incrustados.', '',
             f"Duración: **{clock(duration)}**. Resolución: **{recording['resolution']}**.",
             f'Resultados de esta grabación: **{counts}**.',
             f'Captura completa de los casos seleccionados: **{complete}**.', '', data['timing_note'], '',
             '| Inicio | Fin | CP | Descripción | Resultado |', '| --- | --- | --- | --- | --- |']
    for row in rows:
        lines.append(f"| {clock(row['start_seconds'])} | {clock(row['end_seconds'])} | {row['case']} | {row['title']} | {row['status']} |")
    for row in rows:
        if row['message']:
            lines.extend(['', f"**{row['case']} ({row['status']}):** {row['message']}"])
    lines.extend(['', f"[Video original]({recording['video']}) · [CSV](timeline.csv) · [JSON](timeline.json) · "
                  '[Subtítulos opcionales](cases.srt) · [Informe de pruebas](suite/resumen.md)', '',
                  'El SRT es un archivo independiente para editar; no modifica el MP4. '
                  'Los casos bloqueados figuran en el timeline, sin un subtítulo que sugiera que se ejecutaron.', ''])
    (folder / 'timeline.md').write_text('\n'.join(lines))
    return {'directory': str(folder), 'duration_seconds': round(duration, 3), 'capture_complete': complete, **counts}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--device', default='emulator-5554')
    parser.add_argument('--cases', help='Opcional: CP003,CP006; por defecto todos los casos activos')
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'catalog.json').read_text())['cases']
    selected = args.cases.split(',') if args.cases else [c['id'] for c in catalog]
    if len(set(selected)) != len(selected) or set(selected) - {c['id'] for c in catalog}:
        parser.error('La selección debe contener casos activos sin duplicados.')
    if shutil.which('caffeinate'):
        # En macOS termina automáticamente junto con este proceso.
        subprocess.Popen(['caffeinate', '-i', '-w', str(os.getpid())],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    adb = [str(Path(os.environ.get('ANDROID_HOME', str(Path.home() / 'Library/Android/sdk'))) / 'platform-tools/adb'), '-s', args.device]

    def shell(*command):
        return subprocess.run([*adb, 'shell', *command], capture_output=True, text=True, timeout=20)

    if shell('pidof', 'screenrecord').stdout.strip():
        raise SystemExit('Ya existe otra grabación activa; no se interrumpe.')
    stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    folder = ROOT / 'results' / ('recording-android-' + stamp)
    folder.mkdir(parents=True)
    remote = '/sdcard/micasita-suite-' + stamp + '.mp4'
    recording = {'video': 'android-original.mp4', 'platform': 'android', 'device': args.device,
                 'resolution': '720x1600', 'bit_rate': 800000, 'remote_video': remote,
                 'selected_cases': selected, 'command_started_timestamp': time.time()}
    (folder / 'recording.json').write_text(json.dumps(recording, indent=2))
    print('Grabación: ' + str(folder), flush=True)
    with (folder / 'screenrecord.log').open('w') as log:
        recorder = subprocess.Popen([*adb, 'shell', 'screenrecord', '--size', recording['resolution'],
                                     '--bit-rate', str(recording['bit_rate']), '--time-limit', '0', '--verbose', remote],
                                    stdout=log, stderr=subprocess.STDOUT)
        pid = None
        for _ in range(40):
            if recorder.poll() is not None:
                raise RuntimeError('No se pudo iniciar screenrecord; revisar su log.')
            processes = shell('pidof', 'screenrecord').stdout.split()
            if processes:
                pid = processes[0]
                break
            time.sleep(.1)
        if not pid:
            recorder.terminate()
            raise RuntimeError('No se encontró el proceso screenrecord.')
        runner = None
        try:
            time.sleep(.5)
            command = ['npm', 'run', 'test:e2e', '--', '--platform', 'android', '--device', args.device]
            if args.cases:
                command.extend(['--cases', args.cases])
            with (folder / 'execution.log').open('w') as execution:
                runner = subprocess.Popen(command, cwd=APP, env={**os.environ, 'E2E_RESULTS_DIR': str(folder / 'suite')},
                                          stdout=execution, stderr=subprocess.STDOUT, start_new_session=True)
                seen = 0
                while runner.poll() is None:
                    if recorder.poll() is not None:
                        raise RuntimeError('La grabación terminó antes que las pruebas.')
                    events_path = folder / 'suite/case-events.jsonl'
                    if events_path.exists():
                        contents = events_path.read_text()
                        events = contents.splitlines()
                        if contents and not contents.endswith('\n'):
                            events = events[:-1]
                        for line in events[seen:]:
                            event = json.loads(line)
                            print(event['case'] + ' ' + event.get('status', 'INICIO'), flush=True)
                        seen = len(events)
                    time.sleep(1)
                recording['suite_exit_code'] = runner.returncode
        finally:
            if runner and runner.poll() is None:
                os.killpg(runner.pid, signal.SIGINT)
                try:
                    runner.wait(timeout=20)
                except subprocess.TimeoutExpired:
                    os.killpg(runner.pid, signal.SIGTERM)
                    runner.wait(timeout=10)
            recording['suite_ended_timestamp'] = time.time()
            time.sleep(1)
            shell('kill', '-2', pid)
            recorder.wait(timeout=30)
            recording['recording_stopped_timestamp'] = time.time()
            (folder / 'recording.json').write_text(json.dumps(recording, indent=2))
            subprocess.run([*adb, 'pull', remote, str(folder / recording['video'])], check=True, timeout=180)
    summary = export_timeline(folder, recording)
    print(json.dumps(summary, ensure_ascii=False), flush=True)
    # El archivo de Android se conserva hasta verificar el video en la Mac.
    return 0 if summary['capture_complete'] and not summary['FAIL'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
