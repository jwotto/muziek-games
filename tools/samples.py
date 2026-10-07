"""Zet de geluiden in snd/samples/ in de lijst van ritmeles 3.

    python tools/samples.py

Zet een geluid in snd/samples/ (wav, mp3, ogg, m4a of flac) en draai dit
script. Het schrijft snd/samples/lijst.json, en daaruit haalt de les de
keuzelijst bij elk sample. Een website kan zelf niet in een map kijken, dus
zonder dit script ziet de les een nieuw geluid niet.

De naam in de lijst komt uit de bestandsnaam: koe-boe.wav wordt "Koe boe".
Een geluid langer dan tien seconden wordt in de les afgeknipt; houd ze kort,
dan laden ze ook snel op het bord.

Nodig: alleen Python.
"""
import json
import os

MAP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'snd', 'samples')
SOORTEN = ('.wav', '.mp3', '.ogg', '.m4a', '.flac')

lijst = []
for bestand in sorted(os.listdir(MAP), key=str.lower):
    stam, soort = os.path.splitext(bestand)
    if soort.lower() not in SOORTEN:
        continue
    naam = stam.replace('-', ' ').replace('_', ' ').strip()
    lijst.append({'bestand': bestand, 'naam': naam[:1].upper() + naam[1:]})

with open(os.path.join(MAP, 'lijst.json'), 'w', encoding='utf-8') as f:
    json.dump(lijst, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(f'{len(lijst)} geluiden in snd/samples/lijst.json')
for g in lijst:
    print(f"  {g['naam']}  ({g['bestand']})")
