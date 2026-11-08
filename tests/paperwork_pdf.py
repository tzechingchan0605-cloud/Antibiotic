"""Inspect every actual WS4 PDF and the editable DOCX used to render it."""
import json,re,hashlib,zipfile,subprocess
from pathlib import Path
import fitz
from lxml import etree as E
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];subprocess.run(['npm','run','paper:check'],cwd=ROOT,check=True);m=json.loads((ROOT/'paperwork/generated/manifest.json').read_text());sources=json.loads((ROOT/'paperwork/generated/source.json').read_text());out=ROOT/'artifacts/ws4-review';out.mkdir(parents=True,exist_ok=True)
norm=lambda s:re.sub(r'[\s☑□]+','',s);count=0
for lang in ['zh','en']:
 texts={}
 for key,f in m['languages'][lang]['files'].items():
  data=(ROOT/f['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==f['sha256']
  if key.endswith('Word'):
   with zipfile.ZipFile(ROOT/f['path']) as z:
    tree=E.fromstring(z.read('word/document.xml'));ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    assert len(tree.findall('.//w:tbl',ns))>=3
    assert tree.findall('.//w:color[@w:val="BC2927"]',ns)
    if key=='answersWord':assert tree.findall('.//w:color[@w:val="165CA5"]',ns)
    identity=[p for p in tree.findall('.//w:body/w:p',ns) if ('姓名：' if lang=='zh' else 'Name:') in ''.join(p.itertext())];assert len(identity)==1
    lines=tree.findall('.//w:bottom[@w:color="333333"]',ns);assert lines and all(e.get('{'+ns['w']+'}sz')=='8' for e in lines)
   continue
  d=fitz.open(stream=data,filetype='pdf');assert len(d)==f['pages'];assert key=='D' or len(d)==4
  text=''.join(p.get_text() for p in d);texts[key]=norm(text)
  for i,p in enumerate(d):
   count+=1
   spans=[s for b in p.get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans']]
   assert all(s['size']>=10.9 for s in spans),(lang,key,i,'font too small')
   assert all(s['bbox'][0]>=20 and s['bbox'][2]<=578 and s['bbox'][1]>=8 and s['bbox'][3]<=835 for s in spans),(lang,key,i,'margin overflow')
   if key!='D':
    identity=[s for s in spans if ('姓名：' if lang=='zh' else 'Name:') in s['text']];assert len(identity)==int(i==0)
    if i==0:
     assert any(s['color']==int('BC2927',16) for s in spans)
     # Identity labels and lines remain on one printed line.
     row=[s for s in spans if abs(s['bbox'][1]-identity[0]['bbox'][1])<1];whole=''.join(s['text'] for s in row);assert ('學號' if lang=='zh' else 'No.') in whole
    if i in [0,2]:
     rects=[r for img in p.get_images() for r in p.get_image_rects(img[0])];assert any(r.height>(280 if i==0 else 125) and r.width>=(195 if i==0 else 520) for r in rects),(lang,key,i,'diagram clipped')
    if i==2:
     image_rect=max(rects,key=lambda r:r.width);pix=p.get_pixmap(matrix=fitz.Matrix(3,3),colorspace=fitz.csGRAY,alpha=False);im=Image.frombytes('L',[pix.width,pix.height],pix.samples)
     def gray(x,y):
      px=round((image_rect.x0+x*image_rect.width/522)*3);py=round((image_rect.y0+y*image_rect.height/130)*3);box=im.crop((px-1,py-1,px+2,py+2));return sum(box.tobytes())/9
     for offset in [0,174,348]:assert gray(offset+21.75+64*.75,64*.75)>gray(offset+21.75+120*.75,64*.75)+12,(lang,key,'missing/indistinct gray zones')
    if key=='studentPDF':
     for value in {v for plate in sources[lang]['plates'] for v in plate['result'].values() if v}:assert str(value) not in p.get_text(),(lang,'reading leaked')
    pix=p.get_pixmap(matrix=fitz.Matrix(1.2,1.2),alpha=False);pix.save(out/f'{lang}-{key}-{i+1}.png')
  if key=='answersPDF':assert '參考答案' in text if lang=='zh' else 'Reference answer:' in text
 s=sources[lang]
 for key in ['studentPDF','answersPDF']:
  for name in ['assumptionDefinitionHint','controlPurposeHint','contextCopy']:
   assert norm(s['text'][name]) in texts[key],(lang,key,name)
  assert norm(s['reflection']) in texts[key]
  assert norm(s['repeatPrompt']) in texts[key]
  assert norm(s['rankingPrompt']) in texts[key]
  assert norm('（包含第一次）') not in texts[key]
  assert norm('1 / 2 / 3 / 4 / 5 / 6') not in texts[key]
  for options in ['variables','assumptions']:
   for o in s[options]:assert norm(o['text']) in texts[key],(lang,key,o)
  for q in s['questions']:
   assert norm(q['text']) in texts[key]
   for o in q['choices']:assert norm(o['text']) in texts[key],(lang,key,q['id'],o)
 for key in ['studentPDF','answersPDF']:
  ims=[]
  for i in range(1,5):
   im=Image.open(out/f'{lang}-{key}-{i}.png');im.thumbnail((500,710));ims.append(im)
  canvas=Image.new('RGB',(1000,1420),'#ddd')
  for i,im in enumerate(ims):canvas.paste(im,((i%2)*500,(i//2)*710))
  canvas.save(out/f'{lang}-{key}-contact.jpg',quality=90)
print('PASS:',count,'actual PDF pages; ten checksums, four-page Word/PDF, hints, complete options, red/blue, identity, fonts and margins.')
