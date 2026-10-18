"""Build the 'ithings' wordmark as outlined SVG.

The tittle of the first i is the font's own tittle (coloured), and the two signal arcs are
concentric with it, centred on the measured stem axis of the dotless i.
"""
import json, math, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
import uharfbuzz as hb

SRC = "InstrumentSans.ttf"
WGHT = float(sys.argv[1]) if len(sys.argv) > 1 else 600
TRACK = -0.025          # em, matches the CSS letter-spacing of the mockups
SPAN = math.radians(48)
ROUND = len(sys.argv) > 2 and sys.argv[2] == "round"
SUF = "-round" if ROUND else ""
ROUND_D_MULT = 1.08  # optical compensation: a disc looks smaller than a square of the same width  # half-opening of each arc, measured from vertical

vf = TTFont(SRC)
font = instantiateVariableFont(vf, {"wght": WGHT, "wdth": 100})
font.save("inst.ttf")
upm = font["head"].unitsPerEm
gs = font.getGlyphSet()
cmap = font.getBestCmap()
os2 = font["OS/2"]
num = lambda v: f"{v:.1f}"

# --- stem of the dotless i
bp = BoundsPen(gs); gs[cmap[ord("ı")]].draw(bp)
sx0, _, sx1, _ = bp.bounds
stem_cx, stem_w = (sx0 + sx1) / 2, sx1 - sx0

# --- tittle of the regular i (its highest contour), kept as the font draws it
rp = DecomposingRecordingPen(gs); gs[cmap[ord("i")]].draw(rp)
contours, cur = [], []
for op, args in rp.value:
    cur.append((op, args))
    if op in ("closePath", "endPath"):
        contours.append(cur); cur = []
def cbounds(c):
    pts = [p for _, a in c for p in a]
    return min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts)
dot_c = max(contours, key=lambda c: cbounds(c)[1])
dx0, dy0, dx1, dy1 = cbounds(dot_c)
dot_cx, dot_cy, dot_half = (dx0 + dx1) / 2, (dy0 + dy1) / 2, max(dx1 - dx0, dy1 - dy0) / 2
dpen = SVGPathPen(None, ntos=num)
for op, args in dot_c:
    getattr(dpen, op)(*args)
dot_d = dpen.getCommands()

# --- shape "ıthings" with HarfBuzz (kerning) and outline it
hbfont = hb.Font(hb.Face(hb.Blob.from_file_path("inst.ttf")))
buf = hb.Buffer(); buf.add_str("ıthings"); buf.guess_segment_properties()
hb.shape(hbfont, buf, {"kern": True, "liga": False})
order = font.getGlyphOrder()
x, paths = 0, []
for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
    gname = order[info.codepoint]
    pen = SVGPathPen(gs, ntos=num)
    if ROUND and gname == cmap[ord("i")]:
        for c in contours:
            if c is dot_c: continue
            for op, args in c: getattr(pen, op)(*args)
        paths.append(f'<circle cx="{x + dot_cx:.1f}" cy="{dot_cy:.1f}" r="{dot_half * ROUND_D_MULT:.1f}"/>')
    else:
        gs[gname].draw(pen)
    paths.append(f'<path transform="translate({x + pos.x_offset:.1f} 0)" d="{pen.getCommands()}"/>')
    x += pos.x_advance + TRACK * upm
width = x - TRACK * upm
i_origin = 0.0  # first glyph
cx = i_origin + stem_cx
# the font's tittle is already centred on the stem (checked below); translate it onto our i
dot_dx = cx - dot_cx

def signal(sw_mult, gap_mult):
    """Font tittle + two arcs. Coordinates are font units, y up."""
    sw, gap = stem_w * sw_mult, stem_w * gap_mult
    r1 = dot_half * (ROUND_D_MULT if ROUND else 1) + gap + sw / 2
    r2 = r1 + gap + sw
    def arc(r):
        a0, a1 = math.pi / 2 + SPAN, math.pi / 2 - SPAN
        x0, y0 = cx + r * math.cos(a0), dot_cy + r * math.sin(a0)
        x1, y1 = cx + r * math.cos(a1), dot_cy + r * math.sin(a1)
        # y-up space: going from the left end over the top to the right end is clockwise -> sweep 0
        return f"M{x0:.1f} {y0:.1f}A{r:.1f} {r:.1f} 0 0 0 {x1:.1f} {y1:.1f}"
    tt = (f'<circle class="tt" cx="{cx:.1f}" cy="{dot_cy:.1f}" r="{dot_half * ROUND_D_MULT:.1f}"/>' if ROUND
          else f'<path class="tt" transform="translate({dot_dx:.1f} 0)" d="{dot_d}"/>')
    svg = (tt +
           f'<path class="arc a1" d="{arc(r1)}" stroke-width="{sw:.1f}"/>'
           f'<path class="arc a2" d="{arc(r2)}" stroke-width="{sw:.1f}"/>')
    return svg, r1, r2, sw

# --- wordmark
sig, r1, r2, sw = signal(0.30, 0.62)
top = dot_cy + r2 + sw / 2
asc, desc, pad = max(top, os2.sTypoAscender), os2.sTypoDescender, upm * 0.02
left = min(-pad, cx - r2 * math.sin(SPAN) - sw)
vb = (left, -(asc + pad), width + pad - left, asc - desc + 2 * pad)
open(f"wordmark{SUF}.svg", "w").write(
    f'<svg class="logo" viewBox="{vb[0]:.0f} {vb[1]:.0f} {vb[2]:.0f} {vb[3]:.0f}" role="img" aria-label="ithings">'
    f'<g transform="scale(1,-1)"><g fill="currentColor">{"".join(paths)}</g>{sig}</g></svg>')

# --- favicon mark: same i, heavier signal so it survives 16px, square box
fsig, fr1, fr2, fsw = signal(0.62, 0.55)
ftop = dot_cy + fr2 + fsw / 2
side = ftop + upm * 0.08
ipen = SVGPathPen(gs, ntos=num); gs[cmap[ord("ı")]].draw(ipen)
open(f"mark{SUF}.svg", "w").write(
    f'<svg class="mark" viewBox="{cx - side / 2:.0f} {-(ftop + upm * 0.04):.0f} {side:.0f} {side:.0f}">'
    f'<g transform="scale(1,-1)"><path fill="currentColor" d="{ipen.getCommands()}"/>{fsig}</g></svg>')

json.dump({"upm": upm, "wght": WGHT, "stem": [sx0, sx1], "stem_cx": stem_cx, "stem_w": stem_w,
           "dot_center": [dot_cx, dot_cy], "dot_size": dot_half * 2, "dot_offset_from_stem": dot_cx - stem_cx,
           "signal_cx": cx, "r1": r1, "r2": r2, "sw": sw, "fav": {"r1": fr1, "r2": fr2, "sw": fsw}},
          sys.stdout, indent=1)
