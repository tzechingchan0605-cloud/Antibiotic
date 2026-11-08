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
    tables=tree.findall('.//w:body/w:tbl',ns)
    table_text=lambda table:norm(''.join(n.text or '' for n in table.findall('.//w:t',ns)))
    concept=lambda i:norm(sources[lang]['concepts'][i].replace('[','').replace(']',''))
    assert all(concept(i) in table_text(tables[0]) for i in [0,2,3])
    assert concept(1) not in table_text(tables[0]) and concept(1) in table_text(tables[1]),(lang,key,'diffusion paragraph must be beside lower diagram')
    assert tree.findall('.//w:color[@w:val="BC2927"]',ns)
    if key=='answersWord':assert tree.findall('.//w:color[@w:val="165CA5"]',ns)
    identity=[p for p in tree.findall('.//w:body/w:p',ns) if ('姓名：' if lang=='zh' else 'Name:') in ''.join(p.itertext())];assert len(identity)==1
    # WS1 uses true 1.5-multiple line spacing plus 5pt paragraph spacing,
    # rather than a fixed 18pt line. Check actual editable choice paragraphs.
    choices=[p for p in tree.findall('.//w:p',ns) if ''.join(n.text or '' for n in p.findall('.//w:t',ns)).startswith('□ A.')]
    assert len(choices)==5
    for choice in choices:
     spacing=choice.find('w:pPr/w:spacing',ns);assert spacing.get('{'+ns['w']+'}line')=='360' and spacing.get('{'+ns['w']+'}lineRule')=='auto' and spacing.get('{'+ns['w']+'}after')=='100'
    lines=tree.findall('.//w:bottom[@w:color="333333"]',ns);assert lines and all(e.get('{'+ns['w']+'}sz')=='8' for e in lines)
   continue
  d=fitz.open(stream=data,filetype='pdf');assert len(d)==f['pages'];assert key=='D' or len(d)==sources[lang]['worksheetPages']
  text=''.join(p.get_text() for p in d);texts[key]=norm(text)
  for i,p in enumerate(d):
   count+=1
   spans=[s for b in p.get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans']]
   assert all(s['size']>=10.9 for s in spans),(lang,key,i,'font too small')
   assert all(s['bbox'][0]>=20 and s['bbox'][2]<=578 and s['bbox'][1]>=8 and s['bbox'][3]<=835 for s in spans),(lang,key,i,'margin overflow')
   if key!='D':
    identity=[s for s in spans if ('姓名：' if lang=='zh' else 'Name:') in s['text']];assert len(identity)==int(i==0)
    if i==0:
     photo=max([r for img in p.get_images() for r in p.get_image_rects(img[0])],key=lambda r:r.height)
     assert photo.width>240 and photo.height>330,(lang,key,'photo was not enlarged')
     diffusion=[s for s in spans if ('抗生素由紙碟' if lang=='zh' else '• Antibiotic ') in s['text']]
     assert diffusion and diffusion[0]['bbox'][0]>300 and diffusion[0]['bbox'][1]>photo.y1,(lang,key,'diffusion paragraph not below photo')
     assert any(s['color']==int('BC2927',16) for s in spans)
     # Identity labels and lines remain on one printed line.
     row=[s for s in spans if abs(s['bbox'][1]-identity[0]['bbox'][1])<1];whole=''.join(s['text'] for s in row);assert ('學號' if lang=='zh' else 'No.') in whole
    if i in [0,sources[lang]['pageMap']['results']-1]:
     rects=[r for img in p.get_images() for r in p.get_image_rects(img[0])];assert any(r.height>(280 if i==0 else 125) and r.width>=(195 if i==0 else 520) for r in rects),(lang,key,i,'diagram clipped')
    if i==sources[lang]['pageMap']['results']-1:
     image_rect=max(rects,key=lambda r:r.width);assert abs(image_rect.width-184*72/25.4)<.1 and abs(image_rect.height-184)<.2,(lang,key,'print image resized');pix=p.get_pixmap(matrix=fitz.Matrix(3,3),colorspace=fitz.csGRAY,alpha=False);im=Image.frombytes('L',[pix.width,pix.height],pix.samples)
     def gray(x,y):
      px=round((image_rect.x0+x*image_rect.width/(184*72/25.4))*3);py=round((image_rect.y0+y*image_rect.height/184)*3);box=im.crop((px-1,py-1,px+2,py+2));return sum(box.tobytes())/9
     ptmm=72/25.4;stride=184*ptmm/3
     for j in range(3):
      cx=stride*(j+.5);cy=101
      assert gray(cx-6*ptmm+16,cy-12.5*ptmm)>gray(cx+14*ptmm+16,cy-12.5*ptmm)+12,(lang,key,'missing/indistinct gray zones')
     # Measure the actual rendered PDF in physical millimetres, including the
     # 6mm no-zone discs. This detects SVG/DOCX/PDF resizing, not just metadata.
     scale=4;pix=p.get_pixmap(matrix=fitz.Matrix(scale,scale),colorspace=fitz.csGRAY,alpha=False);physical=Image.frombytes('L',[pix.width,pix.height],pix.samples)
     for j,plate in enumerate(sources[lang]['plates']):
      for sample,(dx,dy) in zip(sources[lang]['samples'],[(-6,-12.5),(14,-12.5),(-6,12.5),(14,12.5)]):
       value=plate['result'][sample] or sources[lang]['discMM'];cx=image_rect.x0+stride*(j+.5)+dx*ptmm;cy=image_rect.y0+101+dy*ptmm;r=value*ptmm/2
       y=round(cy*scale)
       edge=lambda x:[i for i in range(round((x-2)*scale),round((x+2)*scale)+1) if physical.getpixel((i,y))>240]
       left=edge(cx-r);right=edge(cx+r);assert left and right,(lang,key,j,sample,'missing print edges')
       # Raster threshold finds the inside of the outline; restore its
       # known stroke width to measure the mathematical circle diameter.
       measured=((max(right)-min(left))/scale+(.5 if plate['result'][sample] else 1))/ptmm
       assert abs(measured-value)<.35,(lang,key,j,sample,'physical mm mismatch',measured,value)
     assert ('2.5' not in p.get_text()) and ('2.5' in d[sources[lang]['pageMap']['conclusion']-1].get_text()),(lang,key,'conclusion must stay on its assigned page')
    if lang=='zh' and i==sources[lang]['pageMap']['conclusion']-1:
     a=next(s for s in spans if s['text'].startswith('□ A.'))
     b=next(s for s in spans if s['text'].startswith('□ B.'))
     assert b['bbox'][1]-a['bbox'][1]>37,(lang,key,'WS1 paragraph spacing not present in actual PDF')
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
  assert norm('CBS News') not in texts[key]
  assert norm(s['principle']['title']) in texts[key]
  if key=='studentPDF':assert norm('（□ X    □ Y    □ Z    □ C    □ 沒有樣本）' if lang=='zh' else '(□ X    □ Y    □ Z    □ C    □ No samples)') in texts[key]
  assert norm(s['measurementHint']) in texts[key]
  assert '100%' not in texts[key] and '20mm' not in texts[key]
  assert ('±1mm' in texts[key])
  for c in s['concepts']:assert norm(c.replace('[','').replace(']','')) in texts[key],(lang,key,'concept truncated')
  for options in ['variables','assumptions']:
   for o in s[options]:assert norm(o['text']) in texts[key],(lang,key,o)
  for q in s['questions']:
   assert norm(q['text']) in texts[key]
   for o in q['choices']:assert norm(o['text']) in texts[key],(lang,key,q['id'],o)
 for key in ['studentPDF','answersPDF']:
  ims=[]
  for i in range(1,sources[lang]['worksheetPages']+1):
   im=Image.open(out/f'{lang}-{key}-{i}.png');im.thumbnail((500,710));ims.append(im)
  canvas=Image.new('RGB',(1000,710*((len(ims)+1)//2)),'#ddd')
  for i,im in enumerate(ims):canvas.paste(im,((i%2)*500,(i//2)*710))
  canvas.save(out/f'{lang}-{key}-contact.jpg',quality=90)
print('PASS:',count,'actual PDF pages; ten checksums, matched Word/PDF pagination, hints, complete options, red/blue, identity, fonts and margins.')

print('PASS: all twelve diameters measured from each actual PDF within 0.35mm of model/disc size; physical ruler tolerances remain ±1mm.')
