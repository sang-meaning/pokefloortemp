import sys
from PIL import Image, ImageDraw
sheet, c0,c1,r0,r1,out = sys.argv[1], *map(int,sys.argv[2:6]), sys.argv[6]
im=Image.open(sheet).convert('RGBA'); S=4; cw=17*S+6; ch=17*S+14
o=Image.new('RGBA',((c1-c0+1)*cw,(r1-r0+1)*ch),(64,72,64,255)); d=ImageDraw.Draw(o)
for r in range(r0,r1+1):
  for c in range(c0,c1+1):
    t=im.crop((c*17,r*17,c*17+16,r*17+16)).resize((16*S,16*S),Image.NEAREST)
    x=(c-c0)*cw; y=(r-r0)*ch; o.alpha_composite(t,(x+2,y+2)); d.text((x+2,y+16*S+2),f'{c},{r}',fill='yellow')
o.save(out)
