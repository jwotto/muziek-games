"""Zet een origineel plaatje uit img/bron/ om naar een klein webp in img/.

    python tools/plaatje.py kick.png --hoogte 700
    python tools/plaatje.py sequencer.png --breedte 480

Geef de maat op waarop het plaatje hooguit te zien is, keer twee (voor scherpe
schermen). Een png van ruim een megabyte wordt zo een paar tientallen kilobytes.
Het script print de width en height die in de <img> horen.

Nodig: Python met Pillow (pip install pillow).
"""
import argparse
import os
from PIL import Image

IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')

p = argparse.ArgumentParser()
p.add_argument('bestand', help='bestandsnaam in img/bron/')
p.add_argument('--breedte', type=int)
p.add_argument('--hoogte', type=int)
a = p.parse_args()

im = Image.open(os.path.join(IMG, 'bron', a.bestand))
b, h = im.size
schaal = min(a.breedte / b if a.breedte else 1, a.hoogte / h if a.hoogte else 1, 1)
if schaal < 1:
    im = im.resize((round(b * schaal), round(h * schaal)), Image.LANCZOS)

uit = os.path.splitext(a.bestand)[0] + '.webp'
pad = os.path.join(IMG, uit)
im.save(pad, 'WEBP', quality=86, method=6)
print(f'img/{uit}  width="{im.width}" height="{im.height}"  {os.path.getsize(pad) // 1024} KB')
