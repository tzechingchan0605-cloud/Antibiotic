"""Inspect every actual v2 PDF page, answer staging, rulers, glyphs and grayscale evidence."""
import json,re,hashlib,pathlib,html
import fitz
from PIL import Image,ImageOps,ImageDraw
from fontTools.ttLib import TTFont
ROOT=pathlib.Path(__file__).resolve().parents[1]
m=json.loads((ROOT/'paperwork/generated/manifest.json').read_text());sources=json.loads((ROOT/'paperwork/generated/source.json').read_text())
review=ROOT/'artifacts/paper-review-v2';review.mkdir(parents=True,exist_ok=True)
normal=lambda text:re.sub(r'\s+','',html.unescape(text))
font=TTFont(ROOT/m['font']['path']);cmap=font.getBestCmap();expected={'A':2,'B':7,'C':2,'D':8,'all':19};checked=0
assert m['materialVersion']==2 and m['taskVersion']=='VL4-WS-concept-first-2'
for lang in ['zh','en']:
    texts={}
    for part,file in m['languages'][lang]['files'].items():
        data=(ROOT/file['path']).read_bytes();assert data.startswith(b'%PDF-');assert hashlib.sha256(data).hexdigest()==file['sha256'];doc=fitz.open(stream=data,filetype='pdf');assert len(doc)==expected[part]==file['pages'];all_text=''
        for i,page in enumerate(doc):
            checked+=1;layout=file['layout'][i];text=page.get_text();all_text+=text
            assert abs(page.rect.width-595.28)<1 and abs(page.rect.height-841.89)<1
            assert '\ufffd' not in text and '\x00' not in text
            identity='Name:' if lang=='en' else '姓名：'
            assert text.count(identity)==layout['identity'];assert layout['identity']==int(layout['part'] in ['A','C'] and layout['page']==1)
            assert not layout['overflow'];assert all(n==2 for n in layout['writingLines'])
            lines=[d for d in page.get_drawings() if d.get('fill') and all(abs(x-.4)<.012 for x in d['fill'][:3]) and d['rect'].width>100 and 0<d['rect'].height<1.5]
            assert len(lines)==sum(layout['writingLines']),(lang,part,i,'actual writing lines',len(lines),layout['writingLines'])
            for char in text:
                if not char.isspace() and char not in '\u200b\ufeff':assert ord(char) in cmap,(lang,part,i,'missing glyph',char)
            for info in page.get_fonts(full=True):
                obj=doc.xref_object(info[0]);assert '/CharProcs' in obj or '/FontDescriptor' in obj
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines',[]):
                    for span in line['spans']:
                        x0,y0,x1,y1=span['bbox'];assert x0>=22 and x1<=574 and y0>=20 and y1<=831,(lang,part,i,span['text'],'PDF text outside margins')
            for ruler in layout['rulers']:
                assert ruler['ticks']==41 and ruler['scale']==9 and ruler['discDiameter']==6 and not ruler['textClipped']
                if ruler['id'].startswith('plate-'):
                    _,plate_number,sample=ruler['id'].split('-');ref=sources[lang]['plates'][int(plate_number)-1]['result'][sample];assert abs(ruler['zoneDiameter']-ref)<1e-8
            if layout['part'] in ['A','B']:
                assert not re.search(r'38\s*(?:分|marks)|23\s*(?:分|marks)|Reference answers|Teacher only|參考答案',text,re.I)
                assert not re.search(r'18\.7|26\.1|26\.3|26\.5',text),'Independent measurement answer leaked'
            if part=='all':
                pix=page.get_pixmap(matrix=fitz.Matrix(1.25,1.25),alpha=False);im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples);im.save(review/f'{lang}-{i+1:02d}.png')
                if layout['part']=='B':ImageOps.grayscale(im).save(review/f'{lang}-B{layout["page"]}-grey.png')
        texts[part]=normal(all_text)
    s=sources[lang]
    for concept in s['concepts']:assert normal(concept) in texts['A'],(lang,'missing core concept',concept)
    for key in ['hypothesis','variables','control','measurement','mean']:assert normal(s['examples'][key]) in texts['A'],(lang,'missing worked example',key)
    for key in ['historyCopy','historyCaption','colonyMeaningLine1','colonyMeaningLine2']:assert normal(s['text'][key]) in texts['A'],key
    assert normal(s['labels']['scenario']) in texts['A'];assert normal(s['labels']['ranking']) in texts['B'];assert normal(s['labels']['reflectionPrompt']) in texts['B']
    assert normal(s['labels']['checkingGate']) in texts['C'];assert normal(s['labels']['notEquivalent']) in texts['D']
    for q in s['questions']:
        assert normal(q['text']) in texts['B']
        for c in q['choices']:assert normal(c['text']) in texts['B'],(lang,q['id'],c['id'])
    for field in ['variables','assumptions']:
        for c in s[field]:assert normal(c['text']) in texts['B']
    for row in s['alignment']:
        for key in ['original','treatment','newQuestion','goal','reason']:assert normal(row[key]) in texts['D'],(lang,'missing alignment',row['originalKeys'],key)
    for value in ['18.7','26.1','26.3','26.5']:assert value in texts['C']
    assert len(m['languages'][lang]['files']['B']['layout'][2]['rulers'])==4
    # Compare actual 288 dpi grey pixels inside an external zone and outside a bare disc.
    bdoc=fitz.open(ROOT/m['languages'][lang]['files']['B']['path'])
    for i,plate in enumerate(s['plates']):
        page=bdoc[i+2];pix=page.get_pixmap(matrix=fitz.Matrix(4,4),colorspace=fitz.csGRAY,alpha=False);gray=Image.frombytes('L',[pix.width,pix.height],pix.samples)
        discs=[d['rect'] for d in page.get_drawings() if d.get('fill') and all(abs(x-1)<.002 for x in d['fill'][:3]) and abs(d['rect'].width-d['rect'].height)<.5 and 27<d['rect'].width<31]
        assert len(discs)==4,(lang,i,'magnified discs',len(discs))
        lum={}
        for rect,sample in zip(discs,s['samples']):
            factor=rect.width/54;cx=(rect.x0+rect.x1)/2;cy=(rect.y0+rect.y1)/2;x=cx+40*factor;y=cy+12*factor
            patch=gray.crop((round(x*4-1),round(y*4-1),round(x*4+2),round(y*4+2)));lum[sample]=sum(patch.tobytes())/9
        assert lum['X']>lum['Y']+15 and lum['Z']>lum['C']+15,(lang,i,'greyscale zones indistinguishable',lum)
    if lang=='en':
        for word in ['Survival','Capsule','Cell wall','Cell membrane','Protein synthesis','Nucleic acid synthesis','Concentration','Hypothesis','Assumptions','Independent variable','Dependent variable','Controlled variables','Control group','Evidence','Cite','Mean','Variation','Random error','Assess','Effectiveness','Proportion','Invert','Nutrients','Diameter','Contamination','Forceps']:
            assert not re.search(re.escape(word)+r'（[\u3400-\u9fff]',texts['all'],re.I),(word,'unexpected gloss')
for part,(start,end) in m['languages']['zh']['ranges'].items():
    # Small batches remain readable when visually inspecting every actual page.
    for offset in range(start,end+1,3):
        nums=list(range(offset,min(end+1,offset+3)));contact=Image.new('RGB',(len(nums)*510,1460),'#ccc');draw=ImageDraw.Draw(contact)
        for row,lang in enumerate(['zh','en']):
            for col,n in enumerate(nums):
                im=Image.open(review/f'{lang}-{n:02d}.png');im.thumbnail((490,700));draw.text((col*510+10,row*730+5),f'{lang} pack page {n}',fill='black');contact.paste(im,(col*510+10,row*730+25))
        contact.save(review/f'contact-{part}-{offset}.jpg',quality=88)
print(f'PASS: all {checked} actual v2 PDF pages, 12 independent rulers per language, staged answers, concepts, alignment, fonts, two-line writing and grey evidence.')
