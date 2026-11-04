"""Ejecutor de los casos funcionales de la app con informes y postcondiciones reales."""
import argparse,datetime,json,os,shutil,subprocess,sys,time,xml.etree.ElementTree as ET
import hashlib,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parent
APP=ROOT.parent
BACKEND=APP.parent/'micasita-ai-backend'
PYTHON=BACKEND/'venv/bin/python'
ADB=Path(os.environ.get('ANDROID_HOME',str(Path.home()/'Library/Android/sdk')))/'platform-tools/adb'
CATALOG=json.loads((ROOT/'catalog.json').read_text())

def backend_script(script,*args,capture=False):
    return subprocess.run([str(PYTHON),str(ROOT/script),*map(str,args)],cwd=BACKEND,
        env={**os.environ,'PYTHONPATH':str(BACKEND)},text=True,capture_output=capture,check=True)

def synthetic_report(case,dest,status,message):
    if (dest/'report.xml').exists():
        shutil.copyfile(dest/'report.xml',dest/'maestro-report.xml')
    root=ET.Element('testsuites');suite=ET.SubElement(root,'testsuite',name=case,tests='1',failures='1' if status=='FAIL' else '0',skipped='1' if status=='BLOCKED' else '0')
    test=ET.SubElement(suite,'testcase',name=case,classname='Excel',time='0')
    if status=='FAIL':ET.SubElement(test,'failure',message=message).text=message
    if status=='BLOCKED':ET.SubElement(test,'skipped',message=message)
    ET.indent(root);ET.ElementTree(root).write(dest/'report.xml',encoding='utf-8',xml_declaration=True)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--cases',help='CP003,CP006,...; por defecto todos los casos de la app')
    parser.add_argument('--list',action='store_true',help='Listar los casos de la app sin iniciar servicios ni modificar datos')
    parser.add_argument('--source-excel',type=Path,help='Opcional: validar el SHA256 de una copia del Excel de origen antes de ejecutar')
    parser.add_argument('--platform',choices=['android','ios'],default=os.environ.get('E2E_PLATFORM','android'))
    parser.add_argument('--device',default=os.environ.get('E2E_DEVICE'),help='Serial Android o UDID del simulador iOS')
    parser.add_argument('--ios-photo-error-log',type=Path,help='Reutilizar un error de fototeca ya observado y registrar CP024–CP026 como BLOCKED sin reimportar')
    args=parser.parse_args()
    selected=args.cases.split(',') if args.cases else [c['id'] for c in CATALOG['cases']]
    known={c['id'] for c in CATALOG['cases']}
    if len(selected)!=len(set(selected)):parser.error('No repetir identificadores en --cases.')
    invalid=set(selected)-known
    if invalid:parser.error('Casos fuera de la suite de la app o desconocidos: '+', '.join(sorted(invalid))+'. Consultar TRACEABILITY.md.')
    if args.source_excel:
        if not args.source_excel.is_file():parser.error('--source-excel exige un archivo existente.')
        if hashlib.sha256(args.source_excel.read_bytes()).hexdigest()!=CATALOG['sha256']:
            parser.error('El Excel no coincide con el catálogo: actualizar catalog.json y la trazabilidad antes de ejecutar.')
    if args.list:
        for case in CATALOG['cases']:
            if case['id'] in selected:print(case['id']+' — '+case['title'])
        return 0
    platform=args.platform
    device=args.device or ('emulator-5554' if platform=='android' else None)
    if not device:parser.error('En iOS indicar --device con el UDID del simulador.')
    if args.ios_photo_error_log and (platform!='ios' or not args.ios_photo_error_log.is_file()):
        parser.error('--ios-photo-error-log exige iOS y un registro de error existente.')
    os.environ.update(E2E_PLATFORM=platform,E2E_DEVICE=device,
        E2E_MEDIA_BASE_URL='http://localhost:8001' if platform=='ios' else 'http://10.0.2.2:8001')
    adb=[str(ADB),'-s',device]
    if platform=='ios':
        subprocess.run(['xcrun','simctl','get_app_container',device,'pe.edu.upc.micasita','app'],check=True,stdout=subprocess.DEVNULL,timeout=30)
    info=None
    if any(case!='CP043' for case in selected):
        with urllib.request.urlopen('http://127.0.0.1:8001/e2e-info',timeout=5) as response:
            info=json.load(response)
        if info.get('database')!='micasita_e2e' or info.get('osrm_public') is not True:
            raise SystemExit('Se exige el servidor E2E con micasita_e2e y OSRM público.')
        if info.get('media_base_url',os.environ['E2E_MEDIA_BASE_URL'])!=os.environ['E2E_MEDIA_BASE_URL']:
            raise SystemExit('Reiniciar el backend con E2E_PLATFORM='+platform+' para servir las fotos al simulador correcto.')
    stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    prefix='suite-ios-' if platform=='ios' else 'suite-'
    results=Path(os.environ.get('E2E_RESULTS_DIR',str(ROOT/'results'/(prefix+stamp)))).resolve();results.mkdir(parents=True,exist_ok=True)
    info={**(info or {}),'platform':platform,'device':device}
    if info is not None:(results/'environment.json').write_text(json.dumps(info,indent=2))
    env={**os.environ,'E2E_RESULTS_DIR':str(results)}
    if not (ROOT/'results/fixtures.json').exists():raise SystemExit('Faltan fixtures: ejecutar e2e/db/reset_and_seed.py')
    if not (ROOT/'results/baseline-recommendations.json').exists():raise SystemExit('Falta la referencia de IA: ejecutar e2e/prepare.sh')
    photo_setup_error=None
    if any(c in selected for c in ['CP024','CP025','CP026']):
        photos=sorted((ROOT/'results/media').glob('fixture-*.jpg'))
        if args.ios_photo_error_log:
            photo_setup_error='Precondición de Fotos no disponible; se conserva el error observado: '+args.ios_photo_error_log.read_text()
            (results/'photo-setup.log').write_text(photo_setup_error)
        elif platform=='ios':
            try:
                imported=subprocess.run(['xcrun','simctl','addmedia',device,*map(str,photos)],check=True,capture_output=True,text=True,timeout=60)
                (results/'photo-setup.log').write_text(imported.stdout+imported.stderr)
            except (subprocess.CalledProcessError,subprocess.TimeoutExpired) as exc:
                photo_setup_error='No se pudieron preparar las fotos en la fototeca nativa del simulador iOS: '+str(exc)
                (results/'photo-setup.log').write_text(photo_setup_error)
        else:
            for photo in photos:
                remote='/sdcard/Pictures/MiCasitaE2E/'+photo.name
                subprocess.run([*adb,'push',str(photo),remote],check=True,stdout=subprocess.DEVNULL)
                subprocess.run([*adb,'shell','am','broadcast','-a','android.intent.action.MEDIA_SCANNER_SCAN_FILE','-d','file://'+remote],check=True,stdout=subprocess.DEVNULL)
    outcomes=[]
    def maestro(flow,**variables):
        cmd=['bash','e2e/run_flow.sh',flow]+[f'{k}={v}' for k,v in variables.items()]
        return subprocess.run(cmd,cwd=APP,env=env).returncode
    for case in selected:
        dest=results/case;dest.mkdir(exist_ok=True);start=time.monotonic();status='PASS';message=''
        print('\n'+case+' — '+next(c['title'] for c in CATALOG['cases'] if c['id']==case),flush=True)
        try:
            if case in ['CP024','CP025','CP026'] and photo_setup_error:
                status='BLOCKED';message=photo_setup_error
                synthetic_report(case,dest,status,message)
                print(case+' BLOCKED: fototeca iOS no disponible; ver photo-setup.log',flush=True)
                outcomes.append({'case':case,'status':status,'message':message,'seconds':0});continue
            if case=='CP043':
                if platform=='ios':
                    installed=subprocess.run(['xcrun','simctl','get_app_container',device,'net.whatsapp.WhatsApp','app'],capture_output=True).returncode==0
                else:
                    installed='package:com.whatsapp' in subprocess.check_output([*adb,'shell','pm','list','packages','com.whatsapp'],text=True)
                if not installed:
                    status='BLOCKED';message=f'Precondición del Excel: WhatsApp instalado y con sesión activa. No está instalado en el dispositivo {platform} {device}.'
                    synthetic_report(case,dest,status,message)
                    outcomes.append({'case':case,'status':status,'message':message,'seconds':0});continue
            if platform=='ios':
                subprocess.run(['xcrun','simctl','terminate',device,'pe.edu.upc.micasita'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            else:subprocess.run([*adb,'shell','am','force-stop','pe.edu.upc.micasita'],check=True)
            backend_script('db/case_state.py','prepare',case)
            if case=='CP001':
                email='nuevo-'+stamp+'-'+str(os.getpid())+'@e2e-micasita.com'
                if maestro('CP001_a',EMAIL=email):raise AssertionError('Falló el registro inicial')
                otp=backend_script('db/otp.py',email,capture=True).stdout.strip()
                if maestro('CP001_b',OTP=otp):raise AssertionError('Falló la verificación OTP')
                (dest/'subflujos.md').write_text('[Registro y capturas](../CP001_a/)\n\n[OTP y capturas](../CP001_b/)\n')
                synthetic_report(case,dest,'PASS','Registro y OTP completados')
            elif case in ['CP014','CP015']:
                if maestro('common/map-ready'):raise AssertionError('No se preparó el mapa')
                before_map=max((results/'common/map-ready').rglob('mapa-antes-de-tocar.png'),key=lambda p:p.stat().st_mtime)
                shutil.copyfile(before_map,dest/'mapa-antes-de-tocar.png')
                probe=backend_script('support/map_visual.py',dest/'mapa-antes-de-tocar.png',capture=True)
                detected=json.loads(probe.stdout);(dest/'deteccion-pin.json').write_text(json.dumps(detected,indent=2))
                baseline=json.loads((ROOT/'results/baseline-recommendations.json').read_text())
                before=baseline['results'][0]['property']['price']
                # El toque de UIAutomator no siempre llega a las anotaciones nativas de MapLibre.
                # input tap inyecta el evento físico en el mismo píxel detectado.
                detected['tap_method']='Maestro iOS proporcional' if platform=='ios' else 'adb shell input tap'
                (dest/'deteccion-pin.json').write_text(json.dumps(detected,indent=2))
                if platform=='ios':
                    x,y=detected['housing_pin_pixel'];width,height=detected['image_size']
                    point=f'{round(100*x/width)}%,{round(100*y/height)}%'
                else:
                    subprocess.run([*adb,'shell','input','tap',*map(str,detected['housing_pin_pixel'])],check=True)
                    point='0%,0%'
                if maestro(case,BEFORE_PRICE=before,PIN_POINT=point):raise AssertionError('Falló la interacción con el pin real')
            elif maestro(case,LISTING_TITLE='E2E Nuevo '+case):raise AssertionError('Falló el flujo Maestro; revisar captura y jerarquía')
            if case in ['CP003','CP013','CP014','CP015']:
                shot=max(dest.rglob(case+'-resultado.png'),key=lambda p:p.stat().st_mtime)
                visual=backend_script('support/verify_map.py',case,shot,capture=True)
                (dest/'verificacion-visual.json').write_text(visual.stdout)

            result=backend_script('db/case_state.py','verify',case,capture=True)
            (dest/'postcondiciones.log').write_text(result.stdout+result.stderr)
            print(case+' PASS',flush=True)
        except (AssertionError,subprocess.CalledProcessError,OSError,ValueError) as exc:
            status='FAIL';message=str(exc)
            if isinstance(exc,subprocess.CalledProcessError):message+='\n'+(exc.stdout or '')+(exc.stderr or '')
            (dest/'error.log').write_text(message);synthetic_report(case,dest,status,message)
            print(case+' FAIL: '+message[-600:],flush=True)
        finally:
            marker=ROOT/'results/active-case'
            if (ROOT/'results/api-events.jsonl').exists() and case!='CP043' and marker.exists() and marker.read_text().strip()==case:
                shutil.copyfile(ROOT/'results/api-events.jsonl',dest/'api-events.jsonl')
        outcomes.append({'case':case,'status':status,'message':message,'seconds':round(time.monotonic()-start,2)})
        (results/'results.json').write_text(json.dumps(outcomes,ensure_ascii=False,indent=2))
    all_reports=ET.Element('testsuites')
    for outcome in outcomes:
        report=results/outcome['case']/'report.xml'
        if report.exists():
            for suite in ET.parse(report).getroot():
                suite.set('name',outcome['case']);all_reports.append(suite)
    ET.indent(all_reports);ET.ElementTree(all_reports).write(results/'junit.xml',encoding='utf-8',xml_declaration=True)
    (results/'results.json').write_text(json.dumps(outcomes,ensure_ascii=False,indent=2))
    lines=['# Resultados de los casos del catálogo','',f'SHA256 del documento de origen del catálogo: `{CATALOG["sha256"]}`','', '| Caso | Resultado | Segundos | Detalle |','| --- | --- | --- | --- |']
    for o in outcomes:lines.append(f'| {o["case"]} | {o["status"]} | {o["seconds"]} | [Evidencias]({o["case"]}/) |')
    if CATALOG.get('excluded_cases'):
        lines+=['','Fuera de la suite de la app:','']
        for case in CATALOG['excluded_cases']:lines.append(f'- {case["id"]}: {case["exclusion_reason"]}')
    lines+=['','PASS: flujo y postcondiciones aprobados. FAIL: incumplimiento o fallo de ejecución. BLOCKED: precondición no disponible.','']
    for o in outcomes:
        if o['message']:lines += [f'## {o["case"]} — {o["status"]}','',o['message'],'']
    (results/'resumen.md').write_text('\n'.join(lines))
    counts={s:sum(o['status']==s for o in outcomes) for s in ['PASS','FAIL','BLOCKED']}
    print('\n'+json.dumps(counts)+'\nEvidencias: '+str(results),flush=True)
    return 1 if counts['FAIL'] or counts['BLOCKED'] else 0
if __name__=='__main__':sys.exit(main())
