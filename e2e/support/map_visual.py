"""Verifica el mapa realmente renderizado; MapLibre no expone sus anotaciones a UIAutomator.

Trabaja sobre capturas originales de Maestro. No dibuja ni altera imágenes.
La paleta se toma de Colors.markerWork/markerHousing y del modo auto.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

def inspect(path,require_housing=True,require_route=False):
    rgb=np.asarray(Image.open(path).convert('RGB')).astype(int)
    height,width=rgb.shape[:2]
    area=np.zeros((height,width),dtype=bool);area[int(height*.18):int(height*.77),:]=True
    def color(value):return np.max(np.abs(rgb-np.array(value)),axis=2)<=4
    red=color([231,76,60]) & area
    distance=ndimage.distance_transform_edt(red)
    y,x=np.unravel_index(np.argmax(distance),distance.shape)
    assert distance[y,x]>width*.011,'No se ve el pin rojo del trabajo en el mapa renderizado'
    report={'screenshot':str(path),'image_size':[width,height],'work_pin_pixel':[int(x),int(y)]}
    purple=color([52,33,107]) & area
    if require_housing:
        labels,count=ndimage.label(purple)
        candidates=[]
        for index,box in enumerate(ndimage.find_objects(labels),1):
            if box is None:continue
            sy,sx=box
            if sx.stop-sx.start>width*.06 and sy.stop-sy.start>height*.012 and np.count_nonzero(labels[box]==index)>width*.15:
                candidates.append((sy.start,sx.start,sy.stop,sx.stop))
        assert candidates,'No se ven las burbujas moradas de precio de las viviendas'
        top,left,bottom,right=min(candidates)
        report['housing_pin_pixel']=[int((left+right)/2),int(top+min(width*.04,(bottom-top)/3))]
        report['housing_components']=len(candidates)
    if require_route:
        outside=red.copy();radius=int(width*.075)
        outside[max(0,y-radius):y+radius,max(0,x-radius):x+radius]=False
        report['route_pixels_outside_pin']=int(np.count_nonzero(outside))
        assert report['route_pixels_outside_pin']>width*.2,'No se ve la línea roja de la ruta fuera del pin del trabajo'
    return report

def latest_screenshot(root,name):
    matches=sorted(Path(root).rglob(name+'.png'),key=lambda p:p.stat().st_mtime)
    assert matches,'No existe captura '+name
    return matches[-1]
if __name__=='__main__':
    import sys
    print(json.dumps(inspect(Path(sys.argv[1])),ensure_ascii=False))
