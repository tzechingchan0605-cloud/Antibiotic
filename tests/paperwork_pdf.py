"""Inspect every page of the actual ten PDFs; emit colour/greyscale review images."""
import json, re, hashlib, pathlib, html
import fitz
from PIL import Image, ImageOps, ImageDraw
from fontTools.ttLib import TTFont
ROOT=pathlib.Path(__file__).resolve().parents[1]
m=json.loads((ROOT/'paperwork/generated/manifest.json').read_text())
sources=json.loads((ROOT/'paperwork/generated/source.json').read_text())
review=ROOT/'artifacts/paper-review';review.mkdir(parents=True,exist_ok=True)
normal=lambda text: re.sub(r'\s+','',html.unescape(text))
font=TTFont(ROOT/m['font']['path']);cmap=font.getBestCmap()
expected={'A':3,'B':2,'C':2,'D':6,'all':13}
checked=0
for lang in ['zh','en']:
    texts={}
    for part,file in m['languages'][lang]['files'].items():
        path=ROOT/file['path'];data=path.read_bytes()
        assert data.startswith(b'%PDF-')
        assert hashlib.sha256(data).hexdigest()==file['sha256']
        doc=fitz.open(path);assert len(doc)==expected[part]==file['pages']
        all_text=''
        for i,page in enumerate(doc):
            checked+=1;layout=file['layout'][i]
            assert abs(page.rect.width-595.28)<1 and abs(page.rect.height-841.89)<1
            text=page.get_text();all_text+=text
            assert '\ufffd' not in text and '\x00' not in text
            identity='Name:' if lang=='en' else '姓名：'
            assert text.count(identity)==layout['identity'],(lang,part,i,'identity')
            assert layout['identity']==int(layout['part'] in ['A','C'] and layout['page']==1)
            assert not layout['overflow']
            assert all(n==2 for n in layout['writingLines'])
            lines=[d for d in page.get_drawings() if d.get('fill') and all(abs(x-.4)<.012 for x in d['fill'][:3]) and d['rect'].width>100 and 0<d['rect'].height<1.5]
            assert len(lines)==sum(layout['writingLines']),(lang,part,i,'actual writing lines',len(lines),layout['writingLines'])
            for char in text:
                if not char.isspace() and char not in '\u200b\ufeff':assert ord(char) in cmap,(lang,part,i,'missing glyph',char)
            for font_info in page.get_fonts(full=True):
                font_obj=doc.xref_object(font_info[0]);assert '/CharProcs' in font_obj or '/FontDescriptor' in font_obj,(lang,part,i,'font missing glyph resource')
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines',[]):
                    for span in line['spans']:
                        x0,y0,x1,y1=span['bbox'];assert x0>=22 and x1<=574 and y0>=20 and y1<=831,(lang,part,i,span['text'],'PDF text outside margins')
            if part in ['A','B','C']:
                assert not re.search(r'參考答案|參考有效樣本|能力分數|Teacher only|Reference answers|Current total|23.mark',text,re.I)
            if part=='all':
                pix=page.get_pixmap(matrix=fitz.Matrix(1.25,1.25),alpha=False)
                image=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
                image.save(review/f'{lang}-{i+1:02d}.png')
                if layout['part']=='B':ImageOps.grayscale(image).save(review/f'{lang}-B{layout["page"]}-grey.png')
        texts[part]=normal(all_text)
    s=sources[lang]
    checks={'A':['title','history','historyCopy','historyCaption','contextCopy','contextRemark','resistantRemark','methicillinRemark','mrsaRemark','researchQuestion','observation','observationPH','predictionPrefix','predictionSuffix','hypothesisReason','variableNote','assumptionQuestion','assumptionNote','assumptionDefinitionHint','controlPlan','controlHint','controlPurposeHint','design','designNote','drawingHint','designDescriptionPH','repeatNote','plannedReplicates','plannedReplicateReason'],
            'B':['classroomPlan','materialIncubator','measureDefinition','ruler','visible','diameter','hint4','mean','resultConclusion','conclusionContext','conclusionEffective','conclusionRanking','conclusionSelectHint','sourceNote']+[f'procedure{i}' for i in range(1,9)],
            'C':['learning','reflection','reflectionQuestion','sourceNote']}
    for part,keys in checks.items():
        for key in keys:assert normal(s['text'][key]) in texts[part],(lang,part,'missing shared text',key)
    for question in s['questions']:
        assert normal(question['text']) in texts['B']
        for choice in question['choices']:assert normal(choice['text']) in texts['B'],(lang,question['id'],choice['id'])
    for fragment in re.findall(r'<(?:li|figcaption)(?: [^>]*)?>(.*?)</(?:li|figcaption)>',s['learning'],re.S):
        plain=re.sub(r'<[^>]+>','',fragment)
        assert normal(plain) in texts['C'],(lang,'missing shared learning point/diagram caption',plain)
    data_page=fitz.open(ROOT/m['languages'][lang]['files']['B']['path'])[0]
    borders=[d['rect'] for d in data_page.get_drawings() if d.get('fill') and len(d['fill'])==3 and all(abs(x-221/255)<.002 for x in d['fill']) and abs(d['rect'].width-d['rect'].height)<.5 and d['rect'].width>100]
    assert len(borders)==3
    pixels=data_page.get_pixmap(matrix=fitz.Matrix(4,4),colorspace=fitz.csGRAY,alpha=False)
    gray=Image.frombytes('L',[pixels.width,pixels.height],pixels.samples)
    for border,plate in zip(borders,s['plates']):
        factor=border.width/320;cx=(border.x0+border.x1)/2;cy=(border.y0+border.y1)/2;luminance={}
        for sample in ['X','Y','Z','C']:
            pos=plate['discPositions'][sample];x=cx+(pos['x']-200)*factor+11*factor;y=cy+(pos['y']-200)*factor
            patch=gray.crop((round(x*4-1),round(y*4-1),round(x*4+2),round(y*4+2)))
            luminance[sample]=sum(patch.tobytes())/9
        assert luminance['X']>luminance['Y']+15 and luminance['Z']>luminance['C']+15,(lang,plate['id'],'greyscale zones indistinguishable')
    for field in ['variables','assumptions','prediction']:
        for choice in s[field]:assert normal(choice['text']) in texts['A'],(lang,field,choice['id'])
    for word in ['Invert','Nutrients','Diameter','Contamination','Forceps','Survival','Capsule','Cell wall','Cell membrane','Protein synthesis','Nucleic acid synthesis','Concentration','Hypothesis','Assumptions','Independent variable','Dependent variable','Controlled variables','Control group','Evidence','Cite','Mean','Variation','Random error','Assess','Effectiveness','Proportion']:
        if lang=='en':assert not re.search(re.escape(word)+r'（[\u3400-\u9fff]',texts['all'],re.I),(word,'unexpected gloss')
    if lang=='en':
        for phrase in ['Agarplate（瓊脂板）','Sterile（無菌的）','spreader（塗布器）','incubator（培養箱）']:
            assert phrase.lower() in texts['A'].lower(),phrase
for part,start,end in [('A',1,3),('B',4,5),('C',6,7),('D',8,13)]:
    thumbs=[]
    for lang in ['zh','en']:
        for i in range(start,end+1):
            image=Image.open(review/f'{lang}-{i:02d}.png');image.thumbnail((490,700));thumbs.append((lang,i,image))
    columns=end-start+1;contact=Image.new('RGB',(columns*510,2*730),'#ccc');draw=ImageDraw.Draw(contact)
    for k,(lang,i,image) in enumerate(thumbs):
        x=(k%columns)*510;y=(k//columns)*730;draw.text((x+10,y+5),f'{lang} pack page {i}',fill='black');contact.paste(image,(x+10,y+25))
    contact.save(review/f'contact-{part}.png')
print(f'PASS: all {checked} actual PDF pages, content/choices, fonts/glyphs, margins, two-line areas, identity positions, glossary and grayscale renderings.')
