"""Audit sheet from explicit representative frames. Requires Pillow."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import sys
root=Path(__file__).resolve().parents[2]
folder=root/(sys.argv[1] if len(sys.argv)>1 else 'verification/candidate-preview')
samples=[1,20,40,60,80,100,120,140,160]
canvas=Image.new('RGB',(1440,900),'#e8e0d3')
draw=ImageDraw.Draw(canvas)
for i,n in enumerate(samples):
    image=Image.open(folder/f'frame-{n:04}.webp').convert('RGB')
    x=(i%3)*480+4;y=(i//3)*300+4
    canvas.paste(ImageOps.fit(image,(472,266)),(x,y))
    draw.text((x+8,y+274),f'{n:03}',fill='#302820')
out=root/'verification'/('candidate-contact.jpg' if 'candidate' in str(folder) else 'final-contact.jpg')
canvas.save(out,quality=94)
print(out)
