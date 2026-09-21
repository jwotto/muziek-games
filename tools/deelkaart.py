"""Maakt de deelkaartjes: het plaatje van 1200 x 630 dat je ziet als iemand een
link naar een les in WhatsApp, Teams of een tijdlijn plakt.

Elke les heeft een eigen kaartje, in de kleur van de les, met de titel en het
plaatje van de les erop. Komt er een les bij: zet hem onderaan in de lijst en
draai dit script opnieuw.

    python tools/deelkaart.py

Nodig: Python met Pillow (pip install pillow). De plaatjes komen uit img/bron/,
waar de originele png's staan; het kaartje zelf komt in img/.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HIER = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HIER, '..', 'img')
FONT = os.path.join(HIER, 'Fredoka.ttf')

INK = (26, 34, 51)
WIT = (255, 255, 255)
KORAAL = (255, 87, 87)
ZON = (255, 240, 105)
MINT = (56, 199, 137)
BUBBLEGUM = (249, 179, 213)


def font(grootte, dikte=600):
    f = ImageFont.truetype(FONT, grootte)
    f.set_variation_by_axes([dikte, 100])
    return f


def kaart(uit, kleur, reeks, regels, beeld):
    """uit: bestandsnaam in img/. regels: de titel, zelf in tweeen geknipt zodat
    hij links van het plaatje past. beeld: bestandsnaam in img/bron/."""
    b, h = 1200, 630
    im = Image.new('RGB', (b, h), kleur)
    d = ImageDraw.Draw(im)

    # Wit vlak met inktrand, zoals de panelen op de site. Daarin het plaatje.
    vak = (690, 60, 1140, 570)
    d.rounded_rectangle(vak, 36, fill=WIT, outline=INK, width=8)
    art = Image.open(os.path.join(IMG, 'bron', beeld)).convert('RGBA')
    art.thumbnail((vak[2] - vak[0] - 70, vak[3] - vak[1] - 70), Image.LANCZOS)
    im.paste(art, (vak[0] + (vak[2] - vak[0] - art.width) // 2,
                   vak[1] + (vak[3] - vak[1] - art.height) // 2), art)

    # De reeks als pilletje, daaronder de titel.
    fr = font(34)
    tb = d.textlength(reeks, font=fr)
    d.rounded_rectangle((60, 70, 60 + tb + 56, 134), 32, fill=WIT, outline=INK, width=5)
    d.text((88, 102), reeks, font=fr, fill=INK, anchor='lm')

    fk = font(84, 700)
    y = 175
    for regel in regels:
        d.text((60, y), regel, font=fk, fill=INK)
        y += 96

    logo = Image.open(os.path.join(IMG, 'bron', 'muziekfles.png')).convert('RGBA')
    logo.thumbnail((400, 140), Image.LANCZOS)
    im.paste(logo, (50, h - 50 - logo.height), logo)

    pad = os.path.join(IMG, uit)
    im.save(pad, optimize=True)
    print(uit, os.path.getsize(pad) // 1024, 'KB')


kaart('deelkaart-les1-drums.png', KORAAL, 'Ritme · les 1',
      ['Ontdek het', 'drumstel'], 'drumstel.png')
kaart('deelkaart-les2-drums.png', ZON, 'Ritme · les 2',
      ['Drumstel-', 'ritme maken'], 'sequencer.png')
kaart('deelkaart-bodypercussion.png', MINT, 'Body percussion · les 1',
      ['Maak muziek', 'met je lijf'], 'bodypercussion.png')
