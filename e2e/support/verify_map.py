import json,sys
from pathlib import Path
from map_visual import inspect
case=sys.argv[1]
print(json.dumps(inspect(Path(sys.argv[2]),require_housing=case!='CP003',require_route=case=='CP015'),ensure_ascii=False,indent=2))
