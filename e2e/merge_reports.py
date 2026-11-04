"""Consolida ejecuciones por caso; conserva enlaces a todas las evidencias originales.

Uso: python3 e2e/merge_reports.py e2e/results/suite-... e2e/results/suite-repeticion-...
El orden de los directorios determina qué repetición es la más reciente.
"""
import datetime,json,os,sys,xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parent
catalog=json.loads((ROOT/'catalog.json').read_text())
expected={x['id'] for x in catalog['cases']}
excluded={x['id']:x for x in catalog.get('excluded_cases',[])}
excluded_history={}
latest={};history={}
platforms=set()
for argument in sys.argv[1:]:
    directory=Path(argument).resolve()
    environment=directory/'environment.json'
    platform=json.loads(environment.read_text()).get('platform','android') if environment.exists() else 'android'
    platforms.add(platform)
    if len(platforms)>1:raise SystemExit('No mezclar resultados de Android e iOS en un mismo informe.')
    for result in json.loads((directory/'results.json').read_text()):
        case=result['case']
        if case not in expected:
            if case not in excluded:raise SystemExit('Caso desconocido en los resultados: '+case)
            excluded_history.setdefault(case,[]).append({**result,'source':str(directory)})
            continue
        history.setdefault(case,[]).append({**result,'source':str(directory)})
        latest[case]={**result,'source':str(directory)}
missing=expected-set(latest)
if missing:raise SystemExit('Faltan casos ejecutados: '+', '.join(sorted(missing)))
platform=next(iter(platforms))
prefix='consolidado-ios-' if platform=='ios' else 'consolidado-'
output=ROOT/'results'/(prefix+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
output.mkdir(parents=True)
xml=ET.Element('testsuites')
lines=[f'# Resultados consolidados E2E de la app — {platform} ({len(expected)} casos)','',
       'Cada fila corresponde a la última ejecución indicada para ese caso. Las repeticiones no se presentan como una única pasada continua.',
       '',f'SHA256 del documento de origen del catálogo: `{catalog["sha256"]}`','',
       '| Caso | Nombre del caso | Resultado | Duración | Evidencias de la última ejecución |',
       '| --- | --- | --- | --- | --- |']
for case in sorted(expected):
    r=latest[case];directory=Path(r['source'])/case
    relative=os.path.relpath(directory,output)
    title=next(item['title'] for item in catalog['cases'] if item['id']==case)
    lines.append(f'| {case} | {title} | {r["status"]} | {r["seconds"]} s | [Informe y capturas]({relative}/) |')
    report=ET.parse(directory/'report.xml').getroot()
    for suite in report:
        suite.set('name',case);suite.set('time',str(r['seconds']))
        for test in suite.findall('testcase'):test.set('time',str(r['seconds']))
        xml.append(suite)
counts={s:sum(r['status']==s for r in latest.values()) for s in ['PASS','FAIL','BLOCKED']}
if excluded:
    lines+=['','## Fuera de la suite de la app','']
    for case,item in sorted(excluded.items()):
        lines.append(f'- {case}: {item["exclusion_reason"]} Los resultados históricos de este caso no se incluyen en los totales ni en JUnit.')
lines+=['','## Totales','',', '.join(f'{s}: **{n}**' for s,n in counts.items()),'']
for case in sorted(expected):
    r=latest[case]
    if r['message']:lines += [f'## {case} — {r["status"]}','',r['message'],'']
(output/'resumen.md').write_text('\n'.join(lines))
(output/'results.json').write_text(json.dumps([latest[k] for k in sorted(expected)],ensure_ascii=False,indent=2))
(output/'historial.json').write_text(json.dumps(history,ensure_ascii=False,indent=2))
(output/'excluded.json').write_text(json.dumps([
    {'case':case,'title':item['title'],'reason':item['exclusion_reason'],'source_sha256':item.get('source_sha256'),
     'historical_results':excluded_history.get(case,[])} for case,item in sorted(excluded.items())
],ensure_ascii=False,indent=2))
ET.indent(xml);ET.ElementTree(xml).write(output/'junit.xml',encoding='utf-8',xml_declaration=True)
print(json.dumps(counts)+'\n'+str(output/'resumen.md'))
sys.exit(1 if counts['FAIL'] or counts['BLOCKED'] else 0)
