"""Zet de sprite sheet van de ritme skater om naar een nette strook voor de site.

    python tools/sprites.py

Leest img/bron/renner-sprites.png: AANTAL figuurtjes in rijen, van links naar
rechts en van boven naar onder gelezen, op een doorzichtige achtergrond. Nu
zijn dat er vijf, op een skateboard: rijden, rijden door de knieën, springen,
bukken en klappen. Welk beeldje waarvoor is staat in renner.js (RN_BEELDJES).

Staan er rasterlijnen omheen, dan gumt het script die eerst weg: een rechte
lijn die bijna het hele plaatje over loopt is geen figuurtje. Daarna zoekt het
de figuurtjes zelf op als losse eilanden van pixels, want ze staan niet altijd
netjes in hun vak. Kleine stukjes (de sterretjes bij het klappen) gaan naar het
figuurtje dat het dichtstbij staat.

Daarna komen ze naast elkaar in één strook van even grote vakjes, met de
voeten allemaal op de onderrand en in het midden. Zo kan de site een beeldje
kiezen door de achtergrond op te schuiven. Uit: img/renner-sprites.webp. Het
script print ook hoe hoog elk beeldje is; daar hangen de maten in renner.js
(RN_MATEN) van af, zodat de balk op de goede hoogte hangt.

Nodig: Python met Pillow (pip install pillow).
"""
import os
from collections import deque
from PIL import Image

HIER = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HIER, '..', 'img')
HOOGTE = 300          # hoe hoog elk vakje in de strook wordt, in pixels
KLEIN = 2             # zoeken op de helft van de maat, dat is snel genoeg
AANTAL = 5            # hoeveel figuurtjes er op de sheet staan

im = Image.open(os.path.join(IMG, 'bron', 'renner-sprites.png')).convert('RGBA')

# Rasterlijnen weggummen: kolommen en rijen die over (bijna) de hele breedte of
# hoogte dekkend zijn, met een paar pixels marge voor hun zachte rand.
alfa = im.split()[3]
ap = alfa.load()
def lijn(n, lengte, dekkend):
    return sum(1 for i in range(lengte) if dekkend(n, i)) > lengte * 0.95

kolommen = [x for x in range(im.width) if lijn(x, im.height, lambda x, y: ap[x, y] > 100)]
rijen = [y for y in range(im.height) if lijn(y, im.width, lambda y, x: ap[x, y] > 100)]
bp = im.load()
for x in kolommen:
    for dx in range(-3, 4):
        if 0 <= x + dx < im.width:
            for y in range(im.height):
                bp[x + dx, y] = (0, 0, 0, 0)
for y in rijen:
    for dy in range(-3, 4):
        if 0 <= y + dy < im.height:
            for x in range(im.width):
                bp[x, y + dy] = (0, 0, 0, 0)
if kolommen or rijen:
    print('rasterlijnen weg:', len(kolommen), 'kolommen en', len(rijen), 'rijen pixels')
alfa = im.split()[3]

# Eilanden zoeken op een kleinere versie.
m = alfa.resize((im.width // KLEIN, im.height // KLEIN))
w, h = m.size
px = m.load()
label = [[-1] * w for _ in range(h)]
eilanden = []
for y in range(h):
    for x in range(w):
        if px[x, y] > 60 and label[y][x] < 0:
            nr = len(eilanden)
            q = deque([(x, y)])
            label[y][x] = nr
            bb = [x, y, x, y]
            n = 0
            while q:
                cx, cy = q.popleft()
                n += 1
                bb = [min(bb[0], cx), min(bb[1], cy), max(bb[2], cx), max(bb[3], cy)]
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny] > 60 and label[ny][nx] < 0:
                        label[ny][nx] = nr
                        q.append((nx, ny))
            eilanden.append({'n': n, 'bb': bb})

groot = sorted(range(len(eilanden)), key=lambda i: -eilanden[i]['n'])[:AANTAL]
if len(groot) < AANTAL or eilanden[groot[-1]]['n'] < 1000:
    raise SystemExit('Geen ' + str(AANTAL) + ' figuurtjes gevonden')

# Elk klein stukje bij het dichtstbijzijnde figuurtje.
def afstand(a, b):
    dx = max(0, a[0] - b[2], b[0] - a[2])
    dy = max(0, a[1] - b[3], b[1] - a[3])
    return dx * dx + dy * dy

hoort = {}
for i, e in enumerate(eilanden):
    hoort[i] = i if i in groot else min(groot, key=lambda g: afstand(e['bb'], eilanden[g]['bb']))

# De figuurtjes op volgorde: rij voor rij, van links naar rechts.
def midden(g):
    bb = eilanden[g]['bb']
    return ((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2)

# Een nieuwe rij begint waar het midden een flink stuk lager ligt dan het vorige.
hoogte_fig = sorted(eilanden[g]['bb'][3] - eilanden[g]['bb'][1] for g in groot)[AANTAL // 2]
op_y = sorted(groot, key=lambda g: midden(g)[1])
rij_lijst = [[op_y[0]]]
for g in op_y[1:]:
    if midden(g)[1] - midden(rij_lijst[-1][-1])[1] > hoogte_fig / 2:
        rij_lijst.append([])
    rij_lijst[-1].append(g)
volgorde = []
for rij in rij_lijst:
    volgorde += sorted(rij, key=lambda g: midden(g)[0])

# Per figuurtje een eigen plaatje, met alleen zijn eigen pixels. Randpixels
# die op het kleine masker geen label kregen (de zachte rand) nemen het label
# van een buur over.
def label_bij(x, y):
    kx, ky = x // KLEIN, y // KLEIN
    for r in range(3):
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                nx, ny = kx + dx, ky + dy
                if 0 <= nx < w and 0 <= ny < h and label[ny][nx] >= 0:
                    return hoort[label[ny][nx]]
    return -1

bron = im.load()
beelden = []
for g in volgorde:
    leden = [i for i in hoort if hoort[i] == g]
    bb = [min(eilanden[i]['bb'][0] for i in leden), min(eilanden[i]['bb'][1] for i in leden),
          max(eilanden[i]['bb'][2] for i in leden), max(eilanden[i]['bb'][3] for i in leden)]
    x0, y0 = max(0, bb[0] * KLEIN - 4), max(0, bb[1] * KLEIN - 4)
    x1, y1 = min(im.width, (bb[2] + 1) * KLEIN + 4), min(im.height, (bb[3] + 1) * KLEIN + 4)
    uit = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    up = uit.load()
    som = tel = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = bron[x, y]
            if p[3] and label_bij(x, y) == g:
                up[x - x0, y - y0] = p
                if p[3] > 60:
                    som += x - x0
                    tel += 1
    rand = uit.getbbox()
    beelden.append({'im': uit.crop(rand), 'mx': som / tel - rand[0]})

# Allemaal even groot, met de voeten op de onderrand. Het midden is het
# zwaartepunt van het figuurtje, zodat hij niet heen en weer schuift als zijn
# paardenstaart wappert.
hoogst = max(b['im'].height for b in beelden)
schaal = HOOGTE / hoogst
links = max(b['mx'] for b in beelden)
rechts = max(b['im'].width - b['mx'] for b in beelden)
vak = round((2 * max(links, rechts)) * schaal) + 4

strook = Image.new('RGBA', (vak * AANTAL, HOOGTE), (0, 0, 0, 0))
for i, b in enumerate(beelden):
    bi = b['im'].resize((max(1, round(b['im'].width * schaal)), max(1, round(b['im'].height * schaal))), Image.LANCZOS)
    x = i * vak + round(vak / 2 - b['mx'] * schaal)
    strook.paste(bi, (x, HOOGTE - bi.height), bi)

pad = os.path.join(IMG, 'renner-sprites.webp')
strook.save(pad, 'WEBP', quality=88, method=6)
print('renner-sprites.webp', strook.size, os.path.getsize(pad) // 1024, 'KB')
print('vak', vak, 'x', HOOGTE, '  verhouding breedte/hoogte', round(vak / HOOGTE, 3))
for i, b in enumerate(beelden):
    print(i, 'hoogte', round(b['im'].height * schaal / HOOGTE, 3))
