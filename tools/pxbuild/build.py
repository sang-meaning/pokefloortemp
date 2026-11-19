import sys, json, os, colorsys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from specs import *
OUT = sys.argv[1] if len(sys.argv)>1 else '/tmp/props'
os.makedirs(OUT, exist_ok=True)
sheets = {'rl': Image.open(RL).convert('RGBA'), 'cv': Image.open(CV).convert('RGBA')}

def cell(c):
    if c is None: return None
    flip = c[-1] == 'flip'
    if flip: c = c[:-1]
    im = crop((c[0], c[1])) if c[0] in ('tt','td') else crop((c[0], c[1], c[2], 1, 1))
    return im.transpose(Image.FLIP_LEFT_RIGHT) if flip else im

def crop(src):
    kind = src[0]
    if kind == 'cluster':
        parts = [(trim(cell(c)), dx) for c, dx in src[1]]
        W = max(dx + p.width for p, dx in parts); H = max(p.height for p, dx in parts)
        out = Image.new('RGBA', (W, H))
        for p, dx in parts: out.alpha_composite(p, (dx, H - p.height))
        return out
    if kind == 'grid':
        g = src[1]; out = Image.new('RGBA', (len(g[0])*16, len(g)*16))
        for r,row in enumerate(g):
            for c,cl in enumerate(row):
                t = cell(cl)
                if t is not None: out.alpha_composite(t, (c*16, r*16))
        return out
    if kind in ('tt','td'):
        return Image.open((TT if kind=='tt' else TD).format(src[1])).convert('RGBA')
    _, c, r, w, h = src
    out = Image.new('RGBA', (w*16, h*16))
    for dy in range(h):
        for dx in range(w):
            t = sheets[kind].crop(((c+dx)*17, (r+dy)*17, (c+dx)*17+16, (r+dy)*17+16))
            out.alpha_composite(t, (dx*16, dy*16))
    return out

def trim(im):
    bb = im.getbbox()
    return im.crop(bb) if bb else im

def recolor(im, how):
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a = px[x,y]
            if a == 0: continue
            h,l,s = colorsys.rgb_to_hls(r/255,g/255,b/255)
            top = y < im.height * 0.45
            if how == 'volcanic':
                nr,ng,nb = colorsys.hls_to_rgb(0.0, l*0.55, 0.15)
            elif how == 'magma':
                if l > 0.55: nr,ng,nb = colorsys.hls_to_rgb(0.07, 0.55, 1.0)
                else: nr,ng,nb = colorsys.hls_to_rgb(0.02, l*0.5, 0.35)
            elif how == 'fire_crystal':
                nr,ng,nb = colorsys.hls_to_rgb(0.05, min(0.85, l*1.05), 0.95)
            elif how == 'ice':
                nr,ng,nb = colorsys.hls_to_rgb(0.55, min(0.92, l*1.15+0.1), 0.75)
            elif how == 'amethyst':
                nr,ng,nb = colorsys.hls_to_rgb(0.78, l*0.95, 0.65)
            elif how == 'snow':
                woody = 0.03 < h < 0.13 and s > 0.25
                if woody: nr,ng,nb = r/255,g/255,b/255
                elif y < im.height*0.4 or (l > 0.5 and y < im.height*0.7):
                    nr,ng,nb = colorsys.hls_to_rgb(0.58, min(0.97, 0.78 + l*0.2), 0.35)
                else:
                    nr,ng,nb = colorsys.hls_to_rgb(0.47, l*0.85, 0.3)
            elif how == 'sea':
                nr,ng,nb = colorsys.hls_to_rgb((h+0.25)%1 if s>0.2 else 0.55, l, max(s,0.25))
            elif how == 'dry':
                woody = 0.03 < h < 0.13 and s > 0.25
                nr,ng,nb = (r/255,g/255,b/255) if woody else colorsys.hls_to_rgb(0.12, l*0.95, 0.45)
            elif how == 'emerald':
                nr,ng,nb = colorsys.hls_to_rgb(0.38, l*0.95, 0.7)
            elif how == 'aqua':
                nr,ng,nb = colorsys.hls_to_rgb(0.5, min(0.85, l*1.05), 0.7)
            elif how == 'snow_roof':
                # 지붕(위쪽 2/3)만 눈 덮기
                if y < im.height*0.62 and a > 0 and l > 0.15 and not (y < 2):
                    nr,ng,nb = colorsys.hls_to_rgb(0.58, min(0.97, 0.72 + l*0.3), 0.3)
                else: nr,ng,nb = r/255,g/255,b/255
            elif how == 'ghost':
                nr,ng,nb = colorsys.hls_to_rgb(0.76, l*0.85, min(1, s*0.8+0.2))
            else:
                nr,ng,nb = r/255,g/255,b/255
            px[x,y] = (int(nr*255), int(ng*255), int(nb*255), a)
    return im

images, meta, fps = {}, [], {}
for key, name, biomes, src, *opt in SPECS:
    images[key] = trim(crop(src)); meta.append((key, name, biomes))
    fps[key] = (opt[0] if opt else {}).get('fp', (1, 1))
for key, name, biomes, base, how in RECOLOR:
    images[key] = recolor(images[base], how); meta.append((key, name, biomes)); fps[key] = fps[base]

manifest = []
for key, name, biomes in meta:
    im = images[key]; im.save(f'{OUT}/{key}.png')
    e = {'key': key, 'name': name, 'biomes': biomes, 'w': im.width, 'h': im.height}
    if fps[key] != (1, 1): e['fw'], e['fh'] = fps[key]   # 바닥에서 차지하는 칸 수
    manifest.append(e)
json.dump(manifest, open(f'{OUT}/props.json','w'), ensure_ascii=False, indent=0)

# 미리보기 시트
S=3; cols=12; cw=50*S; ch=54*S
sheet = Image.new('RGBA', (cols*cw, ((len(manifest)+cols-1)//cols)*ch), (110,150,95,255)); d=ImageDraw.Draw(sheet)
for i,m in enumerate(manifest):
    im = images[m['key']].resize((m['w']*S, m['h']*S), Image.NEAREST)
    x=(i%cols)*cw; y=(i//cols)*ch
    sheet.alpha_composite(im, (x+(cw-im.width)//2, y+ch-24-im.height))
    d.text((x+4, y+ch-18), m['key'][:18], fill='white')
sheet.save('/tmp/props_preview.png'); print(len(manifest), sheet.size)
