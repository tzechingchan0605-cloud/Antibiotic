"""WS4: native editable DOCX, rendered from the same document to PDF."""
import json,re,subprocess,os,base64,html
from pathlib import Path
from docx import Document
from docx.shared import Pt,Cm,RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import cairosvg
from lxml import etree as E
from PIL import ImageFont
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT/'artifacts/ws4-build';WORK.mkdir(parents=True,exist_ok=True)
SRC=json.loads((ROOT/'paperwork/generated/source.json').read_text());FONT='Noto Sans CJK TC';TEAL='206B73';BLUE='165CA5';RED='BC2927'
PT_MM=72/25.4;PRINT_WIDTH=184*PT_MM
LABEL_FONT=ImageFont.truetype(subprocess.check_output(['fc-match','-f','%{file}',FONT],text=True),110)
def label_width(text):return LABEL_FONT.getlength(text)/10
def label_lines(text,width):
 lines=[];line=''
 for token in re.findall(r'[A-Za-z0-9.,]+(?:（[^）]*）)?|（[^）]*）|\([^)]*\)|\s+|.',text):
  if line and label_width(line+token)>width:lines.append(line.strip());line=token.lstrip()
  else:line+=token
 if line.strip():lines.append(line.strip())
 return lines
def xml(tag,**attrs):
 e=OxmlElement(tag)
 for k,v in attrs.items():e.set(qn(k),str(v))
 return e
class Sheet:
 def __init__(self,lang,answers=False,teacher=False):
  self.lang=lang;self.pending=False;self.m=SRC[lang];self.answers=answers;self.teacher=teacher;self.d=Document();s=self.d.sections[0]
  s.page_width=Cm(21);s.page_height=Cm(29.7);s.top_margin=Cm(1.0);s.bottom_margin=Cm(1.0);s.left_margin=Cm(1.3);s.right_margin=Cm(1.3);s.header_distance=Cm(.4);s.footer_distance=Cm(.4)
  st=self.d.styles['Normal'];st.font.name='Liberation Sans' if lang=='en' else FONT;st.font.size=Pt(12);st.element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),FONT);st.paragraph_format.line_spacing=1.5;st.paragraph_format.space_after=Pt(5)
  for name in ['Heading 1','Heading 2','Heading 3']:
   st=self.d.styles[name];st.font.name=FONT;st.font.size=Pt(16 if name=='Heading 1' else 13);st.font.color.rgb=RGBColor.from_string(TEAL);st.paragraph_format.space_before=Pt(4);st.paragraph_format.space_after=Pt(4)
  self.run(s.header.paragraphs[0],self.t('生物科｜抗生素與細菌生長','Biology | Antibiotics and bacterial growth')+self.t('｜參考答案' if answers else '',' | Reference answers' if answers else ''),11)
  p=s.footer.paragraphs[0];p.alignment=2;self.run(p,self.t(f'工作紙四 · v{self.m["version"]}｜',f'WS4 · v{self.m["version"]} | '),11);p._p.append(xml('w:fldSimple',**{'w:instr':'PAGE'}))
 def t(self,z,e):return e if self.lang=='en' else z
 def run(self,p,text,size=12,color=None,bold=False,concept=False):
  # Bracketed concepts are red in BOTH versions; choices are never concept-highlighted.
  for part in re.split(r'(\[[^\]]+\])',str(text)):
   emph=part.startswith('[') and part.endswith(']');textpart=part[1:-1] if emph else part
   for piece in re.split('(、)',textpart):
    if not piece:continue
    r=p.add_run(piece);font=FONT if piece=='、' or self.lang=='zh' else 'Liberation Sans';r.font.name=font
    rf=r._element.get_or_add_rPr().rFonts
    for script in ['eastAsia','ascii','hAnsi','cs']:rf.set(qn('w:'+script),FONT if piece=='、' else FONT if script=='eastAsia' else font)
    r.font.size=Pt(size);r.bold=bold or emph
    if color==BLUE and bold:r.font.underline=True
    if color or emph:r.font.color.rgb=RGBColor.from_string(RED if emph else color)

 def p(self,text='',size=12,color=None,bold=False,parent=None):
  p=(parent or self.d).add_paragraph();
  if self.pending:p.paragraph_format.page_break_before=True;self.pending=False
  self.run(p,text,size,color,bold);p.paragraph_format.line_spacing=1.5;p.paragraph_format.space_after=Pt(5);return p
 def h(self,text,level=2):
  p=self.d.add_paragraph('', 'Heading '+str(level));self.run(p,text,16 if level==1 else 13,TEAL,True);p.paragraph_format.line_spacing=Pt(24 if level==1 else 20)
  if self.pending:p.paragraph_format.page_break_before=True;self.pending=False
  return p
 def hint(self,text):
  p=self.p(text,11,'607D85');p.paragraph_format.line_spacing=1.2;return p
 def page(self):self.pending=True
 def lines(self,answer,n=2):
  for i in range(n):
   p=self.d.add_paragraph();p.paragraph_format.space_after=Pt(0);p.paragraph_format.line_spacing=Pt(26)
   if self.answers and i==0:p.paragraph_format.line_spacing=1.2;self.run(p,self.t('參考答案：','Reference answer: ')+answer,12,BLUE,True)
   else:self.run(p,' ')
   borders=xml('w:pBdr');borders.append(xml('w:bottom',**{'w:val':'single','w:sz':'8','w:color':'333333','w:space':'1'}));borders.append(xml('w:between',**{'w:val':'single','w:sz':'8','w:color':'333333','w:space':'1'}));p._p.get_or_add_pPr().append(borders)
   # Multi-line reference takes its natural space; no extra blank lines beyond the same area.
   if self.answers:break
 def table(self,rows,widths=None,marks=set(),size=12):
  t=self.d.add_table(rows=0,cols=len(rows[0]));t.autofit=False
  if widths:
   for c,w in zip(t.columns,widths):c.width=Cm(w)
  for i,row in enumerate(rows):
   cells=t.add_row().cells
   if widths:
    for c,w in zip(cells,widths):c.width=Cm(w)
   for j,text in enumerate(row):
    p=cells[j].paragraphs[0];p.paragraph_format.line_spacing=1.2;p.paragraph_format.space_after=Pt(3);self.run(p,text,size,BLUE if (i,j) in marks else TEAL if i==0 else None,(i,j) in marks or i==0)
    b=xml('w:tcBorders')
    for edge in ['top','left','bottom','right']:b.append(xml('w:'+edge,**{'w:val':'single','w:sz':'4','w:color':'BED0D2'}))
    cells[j]._tc.get_or_add_tcPr().append(b)
   t.rows[-1]._tr.get_or_add_trPr().append(xml('w:cantSplit'))
  return t
 def image(self,svg,name,width=18.4):
  p=WORK/(name+'.png');(WORK/(name+'.svg')).write_text(svg);cairosvg.svg2png(bytestring=svg.encode(),write_to=str(p),scale=4);para=self.d.add_paragraph();para.add_run().add_picture(str(p),width=Cm(width));para.paragraph_format.line_spacing=1;para.paragraph_format.space_after=Pt(0)
 def mc(self,q):
  self.h('2.'+str(q['number']+2)+'  '+q['text'],3)
  for i,o in enumerate(q['choices']):
   correct=self.answers and o['id']==q['correct'];p=self.p('');p.paragraph_format.keep_with_next=i<3;self.run(p,('☑ ' if correct else '□ ')+chr(65+i)+'. '+o['text'],12,BLUE if correct else None,correct)
 def save(self,name):self.d.save(WORK/(name+'.docx'))
def svgdoc(content,w=PRINT_WIDTH,h=90):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}pt" height="{h}pt" viewBox="0 0 {w} {h}" font-family="Noto Sans CJK TC">{content}</svg>'
def history(m):
 t=m['text'];data=base64.b64encode((ROOT/'assets/alexander-fleming-petri-dish-penicillin.jpg').read_bytes()).decode()
 en=m['language']=='en';extra=4 if en else 0;w=86*PT_MM;photo_w=w-8;photo_y=80+extra;photo_h=photo_w*347/352
 body=f'<image href="data:image/jpeg;base64,{data}" x="4" y="{photo_y}" width="{photo_w}" height="{photo_h}"/>'
 point=lambda x,y:(4+x*photo_w/352,photo_y+y*photo_h/347)
 mould=point(148,55);clear=point(221,75);colony=point(141.4,312.2)
 baseline=photo_y+photo_h+20;label_end=12+label_width(t['colonies'])+2
 # Each leader ends beside its label, including a short horizontal segment
 # directly beside "菌落" / "Colonies", rather than beside its definition.
 paths=[f'M16 38V64L{mould[0]} {mould[1]}',f'M166 {82 if en else 60}V{88 if en else 74}L{clear[0]} {clear[1]}',f'M{colony[0]} {colony[1]}L{label_end+14} {baseline-4}H{label_end}']
 for width,col in [(3,'white'),(1,'#15333b')]:
  body+=''.join(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{width}"/>' for d in paths)
 for x,y,key,bold in [(12,14,'mouldLabel',True),(12,31,'fungusRemark',False),(122 if en else 150,40 if en else 18,'clearAreaTerm',True),(122 if en else 150,57 if en else 35,'clearAreaLine1',False),(122 if en else 150,74 if en else 52,'clearAreaLine2',False),(12,baseline,'colonies',True)]:
  body+=f'<text x="{x}" y="{y}" font-size="11" font-weight="{700 if bold else 400}" fill="#15333b">{html.escape(t[key])}</text>'
 return svgdoc(body,w=w,h=baseline+9)
def principle(m):
 # Reuse the live VL's actual figure A, with a print layout and >=11pt labels.
 root=E.fromstring(m['principle']['svg'].encode());ns={'s':'http://www.w3.org/2000/svg'}
 labels=[' '.join(t.itertext()) for t in root.findall('.//s:text',ns)]
 targets=[re.findall(r'[-+]?[0-9]*\.?[0-9]+',path.get('d'))[-2:] for group in root.findall('s:g',ns) if group.get('font-size') for path in group.findall('s:path',ns)]
 for group in root.findall('s:g',ns):
  if group.get('font-size'):root.remove(group)
 body='<g transform="scale(.5)">'+''.join(E.tostring(n,encoding='unicode') for n in root)+'</g>'
 blocks=[labels[0],' '.join(labels[1:3]),' '.join(labels[3:])] if m['language']=='en' else [labels[0],labels[1],' '.join(labels[2:])]
 for j,text in enumerate(blocks):
  for k,label in enumerate(label_lines(text,148)):
   body+=f'<text x="118" y="{[20,62,98][j]+k*16.5}" font-size="11" fill="#15333b">{html.escape(label)}</text>'
 for j,(x,y) in enumerate(targets):body+=f'<path d="M111 {[25,67,103][j]}L{float(x)/2} {float(y)/2}" stroke="#698a87" fill="none"/>'
 return svgdoc(body,w=96*PT_MM,h=138)
def plates(m):
 s=''
 for i,p in enumerate(m['plates']):
  off=i*PRINT_WIDTH/3;cx=PRINT_WIDTH/6;cy=101
  s+=f'<g transform="translate({off} 0)"><text x="{cx}" y="13" font-size="12" text-anchor="middle">'+('瓊脂板 ' if m['language']=='zh' else 'Plate ')+str(i+1)+'</text>'
  s+=f'<defs><pattern id="growth{i}" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#ccc"/><circle cx="1" cy="1" r=".5" fill="#666"/></pattern></defs><circle cx="{cx}" cy="{cy}" r="{28.5*PT_MM}" fill="url(#growth{i})" stroke="#333"/>'
  for sample,(dx,dy) in zip(m['samples'],[(-6,-12.5),(14,-12.5),(-6,12.5),(14,12.5)]):
   x=cx+dx*PT_MM;y=cy+dy*PT_MM
   diameter=p['result'][sample]
   if diameter:s+=f'<circle class="zone" data-mm="{diameter}" cx="{x}" cy="{y}" r="{diameter/2*PT_MM}" fill="white" stroke="#555" stroke-width=".5"/>'
   s+=f'<circle class="disc" cx="{x}" cy="{y}" r="{m["discMM"]/2*PT_MM}" fill="white" stroke="#222"/><text x="{x}" y="{y+4}" text-anchor="middle" font-size="11">{sample}</text>'
  s+='</g>'
 return svgdoc(s,h=184)

def worksheet(lang,answers):
 s=Sheet(lang,answers);m=s.m;t=lambda key:m['text'][key];s.h(m['title'],1)
 s.p(s.t('姓名：________________　班別：________　學號：________','Name: ________________  Class: ________  No.: ________'))
 s.h(s.t('課題需知','Topic notes'))
 notes=s.d.add_table(rows=1,cols=2);notes.autofit=False;document=s.d
 for col,w in zip(notes.columns,[9,9.4]):col.width=Cm(w)
 for cell,w in zip(notes.rows[0].cells,[9,9.4]):cell.width=Cm(w);cell.paragraphs[0].paragraph_format.line_spacing=Pt(1)
 s.d=notes.cell(0,0);s.image(history(m),'history-'+lang,8.6)
 s.hint(t('colonyMeaningLine1')+t('colonyMeaningLine2'))
 s.d=notes.cell(0,1)
 for i in [0,2,3]:s.p('• '+m['concepts'][i])
 s.d=document
 s.p(m['principle']['title'],11,TEAL,True)
 diffusion=s.d.add_table(rows=1,cols=2);diffusion.autofit=False
 for col,w in zip(diffusion.columns,[10,8.4]):col.width=Cm(w)
 for cell,w in zip(diffusion.rows[0].cells,[10,8.4]):
  cell.width=Cm(w);cell.paragraphs[0].paragraph_format.line_spacing=Pt(1);cell._tc.get_or_add_tcPr().append(xml('w:shd',**{'w:fill':'F0F8F7'}))
 s.d=diffusion.cell(0,0);s.image(principle(m),'principle-'+lang,9.6)
 s.d=diffusion.cell(0,1);s.p('• '+m['concepts'][1]);s.d=document
 s.page();s.h(s.t('部分1｜研究情境與公平比較','Part 1 | Research context and fair comparison'))
 s.p(t('contextCopy'));s.p(s.t('MRSA 對甲氧西林有抗性，不代表對所有抗生素皆有抗性。','MRSA resists methicillin; this does not mean it resists all antibiotics.'));s.p(t('researchQuestion'))
 s.h('1.1  '+t('variables'))
 # Each of the three complete ordered lists is retained, never a forced single-category matrix.
 table=s.d.add_table(rows=2,cols=3);table.autofit=False
 for cell in [c for row in table.rows for c in row.cells]:
  borders=xml('w:tcBorders')
  for edge in ['top','left','bottom','right']:borders.append(xml('w:'+edge,**{'w:val':'single','w:sz':'8','w:color':TEAL}))
  cell._tc.get_or_add_tcPr().append(borders)
 for cell in table.rows[0].cells:cell.width=Cm(18.4/3)
 for col,field in enumerate(['iv','dv','cv']):
  c=table.cell(0,col);p=c.paragraphs[0];p.paragraph_format.line_spacing=1.2;s.run(p,t(field)+'（'+t(field+'Hint')+'）',12,TEAL,True);c=table.cell(1,col);c.paragraphs[0].paragraph_format.line_spacing=Pt(1)
  ref=m['variableReference'][field];ref=[ref] if isinstance(ref,str) else ref
  for o in m['variables']:
   p=c.add_paragraph();p.paragraph_format.space_after=Pt(3);p.paragraph_format.line_spacing=1.2;correct=answers and o['id'] in ref;s.run(p,('☑ ' if correct else '□ ')+o['text'],12,BLUE if correct else None,correct)
 s.page();s.h('1.2  '+t('assumptionQuestion'));s.hint(t('assumptionDefinitionHint'));s.p(t('assumptionNote'))
 for o in m['assumptions']:
  correct=answers and o['id'] in m['assumptionReference'];s.p(('☑ ' if correct else '□ ')+o['text'],color=BLUE if correct else None,bold=correct)
 s.h('1.3  '+t('controlPlan'));s.hint(t('controlPurposeHint'));s.lines(m['reference']['control'],2)
 s.h('1.4  '+m['repeatPrompt']);s.lines(s.t('可選合理次數；以獨立平板檢查一致性及變異，兼顧可行性，不以次數本身評分。','Accept a feasible number. Independent plates help examine consistency and variation; the number itself earns no ability mark.'),2)
 s.page();s.h(s.t('部分2｜實驗結果、量度、計算與分析','Part 2 | Results, measurement, calculation and analysis'))
 s.h('2.1  '+t('measureDefinition'));s.hint(s.t('三塊獨立瓊脂板｜共同模擬條件：30°C、24小時｜紙碟直徑6 mm','Three independent plates | Shared simulation: 30°C, 24 h | Disc diameter 6 mm'))
 s.hint(m['measurementHint'])
 s.image(plates(m),'plates-'+lang)
 rows=[['','']+[s.t('樣本','Sample ')+x for x in m['samples']]];marks=set()
 for i,plate in enumerate(m['plates']):
  presence=[s.t('清晰區存在','Clear zone present')];readings=[s.t('總直徑 (mm)','Total diameter (mm)')]
  for sample in m['samples']:
   value=plate['result'][sample]
   presence.append('✓ / ✗')
   readings.append(str(value) if answers else '')
  rows.append([s.t('瓊脂板','Plate ')+str(i+1)]+presence)
  rows.append(['']+readings)
  if answers:marks.update((i*2+2,col) for col in range(2,6))
 result_table=s.table(rows,[2,4.4]+[3]*4,marks)
 result_table.cell(0,0).merge(result_table.cell(0,1))
 for i in range(3):
  result_table.cell(i*2+1,0).merge(result_table.cell(i*2+2,0))
  if answers:
   for j,sample in enumerate(m['samples'],2):
    p=result_table.cell(i*2+1,j).paragraphs[0];p.clear();visible=bool(m['plates'][i]['result'][sample]);s.run(p,'✓',12,BLUE if visible else None,visible);s.run(p,' / ');s.run(p,'✗',12,BLUE if not visible else None,not visible)

 s.h('2.2  '+t('mean'));rows=[[t('meanLabel'+x) for x in m['samples']],[str(round(sum(p['result'][x] for p in m['plates'])/3,1)) if answers else '' for x in m['samples']]];s.table(rows,[4.1,4.1,4.1,6.1],{(1,i) for i in range(4)} if answers else set())
 s.mc(m['questions'][0])
 s.page();s.mc(m['questions'][1]);s.h('2.5  '+t('resultConclusion'));p=s.p(t('conclusionContext'));s.run(p,'（' if lang=='zh' else '(')
 for i,o in enumerate(m['effective']):
  correct=answers and o['id'] in ['X','Z'];s.run(p,('☑ ' if correct else '□ ')+('C' if o['id']=='C' else o['text'])+('    ' if i<len(m['effective'])-1 else ''),12,BLUE if correct else None,correct)
 s.run(p,('）' if lang=='zh' else ')')+t('conclusionEffective'))
 s.p(m['rankingPrompt'])
 s.p('Z > X > ／ > ／' if answers else '________ > ________ > ________ > ________',color=BLUE if answers else None,bold=answers)
 s.mc(m['questions'][2]);s.page()
 for q in m['questions'][3:]:s.mc(q)
 s.h(s.t('部分3｜整合解釋','Part 3 | Integrated explanation'));s.p(m['reflection'])
 vals=', '.join(str(p['result']['X']) for p in m['plates'])
 answer=s.t(f'例如 X 的讀數為 {vals} mm，顯示能抑制生長；Z 配合其讀數也可。群體原有少量抗性細菌，抗生素令敏感者較難存活；抗性者較易存活、繁殖並把抗性特徵傳給後代。其比例可能上升，令持續使用的效果可能下降；不表示每次必然完全失效。',f'For example, X has readings {vals} mm, supporting inhibition; accept Z with its readings too. A few resistant bacteria already exist. The antibiotic reduces survival of susceptible bacteria. Resistant bacteria are more likely to survive, reproduce and pass resistance traits to offspring. Their proportion may rise, so continued use may become less effective; complete failure is not inevitable.')
 s.lines(answer,4)
 s.save('WS4_'+('answers' if answers else 'student')+'_'+lang)
def teacher(lang):
 s=Sheet(lang,False,True);m=s.m;s.h(s.t('D · 教師指引、配對及評分','D · Teacher guide, alignment and marking'),1)
 s.p(s.t('學生先讀需知，自學作答；沒有課前概念講授，不操作VL。首次答案保存（收卷／掃描）後，才派完整答案版，用另一色修正並保留原答。','Students read the topic notes and study independently, without prior concept teaching or VL operation. Collect or scan first responses before giving the complete answer version. Correct in another colour without erasing originals.'))
 s.p(s.t('兩組共同目標15–20分鐘，建議同用20分鐘：需知4、研究比較5、量度與分析8、核對修正3。須試教核對，記錄實際用時、未完成項目及教師支援；不為湊時間刪核心任務。教師僅澄清紙本詞語、讀尺及作答程序，記錄額外概念支援。','Target the same 15–20 minutes for both groups, preferably 20: notes 4, fair comparison 5, measurement/analysis 8, checking 3. Pilot feasibility and record actual time, omissions and support. Do not remove core tasks to meet time. Clarify terms, scales and response procedures; document extra conceptual support.'))
 s.p(s.t('VL維持先探究、提交後開放學習重點／反思、反思提交後解鎖PDF。紙本前置教學不改變VL揭示時序。','The VL remains inquiry-first: learning points/reflection after inquiry submission, PDF after reflection submission. Paper concept-first sequencing does not change this.'))
 s.h(s.t('逐題配對及可接受表述','Item alignment and acceptable responses'))
 for number,key,prompt,points in sorted(m['mapping'],key=lambda r:float(r[0])):
  s.h(number+' · '+key+' · '+points+s.t(' 分',' marks'),3);s.p(prompt)
  kinds={
   'iv,dv,cv':('多選剔選／分類實驗因素，辨認公平比較的控制條件。','Multiple checkboxes / classify experimental factors and fair-comparison controls.'),
   'assumptions':('多選剔選／辨識有效比較所依賴的前提。','Multiple checkboxes / identify assumptions supporting a valid comparison.'),
   'controlPlan':('開放設計／設相同載體無抗生素的比較基準。','Open design / plan the matching carrier baseline without antibiotic.'),
   'plannedReplicates,plannedReplicateReason':('次數選擇及開放理由／規劃獨立重複、變異及可行性；次數本身不評能力。','Number choice and open reason / plan independent repeats, variation and feasibility; do not score the number itself.'),
   'measurements':('有無判讀及數值／觀察與量度包含紙碟的總直徑。','Presence classification and numeric readings / observe and measure total diameter including the disc.'),
   'means':('數值計算／依自身三次讀數處理數據。','Numeric calculation / process the learner’s own three readings.'),
   'zoneMeaning':('單選／推論無可見生長與全部死亡的區別。','Single choice / distinguish inhibited visible growth from complete killing.'),
   'zoneDiameterMeaning':('單選／解讀直徑範圍與擴散因素。','Single choice / interpret diameter extent and diffusion factors.'),
   'repeatPurpose':('單選／理解重複、偶然誤差及可靠性。','Single choice / understand repeats, random error and reliability.'),
   'repeatVariation':('單選／評估變異原因，不刪不合假說的資料。','Single choice / evaluate causes of variation without deleting disagreeing data.'),
   'controlPurpose':('單選／推論抗生素之外因素的比較基準。','Single choice / interpret the baseline for non-antibiotic factors.'),
   'effectiveSamples,rank1–4':('句內選擇／用資料辨識有效樣本並按自身均值排序。','Inline choices / identify effective samples and rank by own means.'),
   'reflection':('整合長答／以選定樣本讀數支持判斷並建立抗性選擇的科學因果。','Integrated response / support a chosen sample with readings and explain resistance selection causally.')}
  s.p(s.t('題型／共同技能：','Type / shared skill: ')+kinds[key][0 if lang=='zh' else 1])
  s.p(s.t('沿用原題／提示；重複次數與理由合併，樣本改剔選，手寫排序以／刪去空位，整合題以課題需知代學習重點。','Native questions/hints; repeats combine the number and reason prompts, samples use checkboxes, unused written ranks use a slash, and the final question substitutes “topic notes”.'))
 s.p(s.t('未提供紙本機會：初步歷史觀察、原始預測及理由、自主裝置圖、無菌操作、塗布、放碟及培養。記不適用，不作零分；紙本程序不能視為已展示實作能力。現行VL沒有棒形圖或紙碟含量延伸，不恢復。','No paper response opportunity: initial historical observation, initial predictions/reasons, independent setup drawing, aseptic handling, spreading, disc placement or incubation. Mark not applicable, not zero; paper responses do not demonstrate practical performance. The current VL has no bar chart or disc-content extension; neither is restored.'))
 s.h(s.t('完整答案與數值核對','Full answers and numeric checking'))
 s.p(s.t('完整學生題目、提示、選項及圖連答案見完整答案版；以下補充教師可接受表述。','See the complete answer worksheet for every prompt, hint, choice and diagram with answers. Additional acceptable responses follow.'))
 s.p(m['reference']['control']);s.p(m['reference']['reflection']);s.p(s.t('C是相同載體但不含抗生素；只有實際載體為水才稱水對照。重複理由須連結獨立平板、一致性或變異；不因選3次給分。','C is the same carrier without antibiotic; call it a water control only if water is the carrier. Repeat reasons connect independent plates to consistency/variation; choosing three itself earns no mark.'))
 for p in m['plates']:s.p(p['id']+': '+', '.join(x+' '+str(p['result'][x])+' mm' for x in m['samples']))
 s.p(s.t('X與Z有區；Y與C無區並記0。均值按本冊三板數據計算。MC依次B、C、C、D、C。結論選X與Z，固定資料次序Z＞X＞／＞／。排序及均值仍按學生有效自身讀數判斷，同值接受任一先後。','X and Z have zones; Y and C have none and are recorded as 0. Calculate means from the three printed plates. MC keys: B, C, C, D, C. Select X and Z; fixed-data order Z > X > / > /. Judge means/order from valid own readings; accept either order for ties.'))
 s.p(s.t('有區量度容差±1 mm；無區分類及0須正確。均值按自身三次讀數核對±0.1 mm，避免重複扣量度錯誤。三板使用原有seeds 1001/123456789/4294967及generateResult，不代表每次VL讀數都相同。清晰區與6 mm紙碟以1:1印刷尺寸繪製，沒有附設量尺。用實體毫米直尺量度，必須以100%／實際大小列印，勿選符合頁面，教師印前核對紙碟為6 mm。','External-zone tolerance ±1 mm; absence requires the correct category and exactly 0. Check means from own three readings within ±0.1 mm, avoiding repeated reading penalties. Plates use existing seeds 1001/123456789/4294967 and generateResult, not identical outcomes for every VL run. Clear zones and 6 mm discs are drawn at 1:1 print size, without an attached ruler. Use a physical millimetre ruler. Print at 100% / actual size, never fit to page; the teacher checks that a printed disc measures 6 mm before distribution.'))
 s.p(s.t('本冊平均值：','Printed model means: ')+', '.join(x+' '+format(sum(p['result'][x] for p in m['plates'])/3,'.1f')+' mm' for x in m['samples']))
 s.h(s.t('配分、缺答及整合題','Marks, omissions and reflection'))
 s.p(s.t('WS作業檢核共24分：變量4、假設1、對照1、重複理由1、量度2、均值1、五MC5、結論1、整合8。不是VL29分的等值量表，不直接比較活動總分；成效另用研究者選定的共同測驗，本次未捏造測驗或效度。','WS checking totals 24: variables 4, assumptions 1, control 1, repeat reason 1, readings 2, means 1, five MCs 5, conclusion 1, reflection 8. It is not equivalent to VL29; do not directly compare activity totals. Outcomes need researcher-selected common assessments; no test or validity evidence is invented here.'))
 for title,points,criterion in m['reflectionCriteria']:s.p(title+' (0–'+str(points)+'): '+criterion if lang=='zh' else {'樣本選擇及讀數證據':'Sample/readings: 2 for appropriate sample and supporting readings; 1 for one; 0 for neither.','原有抗性差異與選擇':'Existing variation/selection: 2 for pre-existing resistance and differential survival; 1 for one; 0 for neither or purposeful acquisition.','繁殖與遺傳':'Reproduction/inheritance: 2 for both causal links; 1 for one; 0 for neither.','比例及效果改變':'Proportion/effect: 2 for rising resistant proportion and possible reduced effect; 1 for one; 0 for neither.'}[title])
 s.p(s.t('整合題按概念及科學因果，不數關鍵字；依學生選的有效樣本及合理讀數接受等義說法，不另要求指定比較、限制或修訂原假說。缺答在學生已獲作答機會時可評0；未評保持空白，不適用記文字並排除閘門。','Assess concepts and scientific causal links, not keyword counts. Accept equivalent answers using the chosen effective sample and reasonable readings; require no extra prescribed comparison, limitations or hypothesis revision. An omitted applicable response may earn 0 after marking; unmarked stays blank. Inapplicable tasks are excluded from gates.'))
 s.p(s.t('其他判準：IV/DV各1（精確選項組）；CV五項各0.4，誤選非控制項本欄0。假設只選三正確項得1，錯漏0。對照及重複理由各0/1，以共同條件／獨立變異概念判斷。十二讀數各2/12，按容差及有無類別；四均值各0.25，依自身數據。MC各0/1；結論樣本0.5、依自身均值排序0.5。','Other criteria: IV/DV 1 each for exact sets; CVs 0.4 each for five correct controls, with 0 for inappropriate extras. Assumptions 1 for the exact three correct choices, otherwise0. Control/repeat reasons 0/1 for carrier/shared conditions or independent variation. Twelve readings 2/12 each for tolerance and category; four own-data means 0.25 each. MCs 0/1 each. Conclusion: samples0.5 and own-mean order0.5.'))
 s.h(s.t('VL與Excel版本','VL and Excel versions'))
 s.p(s.t('analysisVersion2題目範圍不變。新探究rubricVersion3／taskVersion VL4-multiselect-5：反思由2改8，其餘21分不變，共29；六人工欄為觀察2、假說1、重複1、對照1、設計2、反思8。R3人工欄僅接受0至上限整數，空白待評、0已評零分；公式亦檢查無效貼入，不因資料驗證可繞過而出有效總分。全部適用人工欄有效且反思已提交才出總分。','analysisVersion2 task scope remains unchanged. New inquiries have rubricVersion3/taskVersion VL4-multiselect-5: reflection rises from 2 to 8; other 21 unchanged; total 29. Six manual fields: observation2, hypothesis1, repeats1, control1, design2, reflection8. R3 accepts only integers within bounds; blank=pending, 0=marked zero. Formulas reject invalid pasted values too. All applicable manual fields plus submitted reflection are required.'))
 s.p(s.t('舊R2仍23分、舊歷史版32分及原規準，混合匯出分表，保留當時半分規則。欄尾標記題目／評分版本；原始／首次／最後答案、研究ID、圖像、事件及雲端佇列不改。人工分只在保存的Excel；舊下載檔不會自動更新，須重新匯出。','R2 remains23, earlier legacy32, with historical criteria and half-mark rules. Mixed exports use separate sheets and explicit assessment metadata. Original/first/latest responses, research IDs, images, events and cloud queues are retained. Manual marks live in saved Excel files; old downloads do not update—export again.'))
 s.p(s.t('科學界限：清晰區為無可見生長，不證明全死；不同抗生素擴散不同，最大圈不等於最佳臨床用藥，沒有臨床界值。原有抗性比例上升已可能影響效果，不必完全佔據群體。Fleming當時不是研究MRSA。','Scientific limits: no visible growth does not prove all dead. Different antibiotics diffuse differently; largest zone is not best clinical treatment, and no clinical breakpoint is supplied. Rising resistance proportion may affect effectiveness without complete takeover. Fleming did not study MRSA.'))
 s.p(s.t('歷史照片來源：CBS News · The discovery of penicillin；使用原圖重新標示。圖A直接取自VL學習重點，為解說示意，與第4頁按實際尺寸印刷的量度圖分開。','Historical photo: CBS News · The discovery of penicillin, relabelled from the source image. Figure A comes from the VL learning points; it is explanatory, separate from page 4’s measurement views printed at actual size.'))
 s.save('WS4_D_'+lang)
for lang in ['zh','en']:
 for ans in [False,True]:worksheet(lang,ans)
 teacher(lang)
paths=[str(WORK/('WS4_'+kind+'_'+lang+'.docx')) for lang in ['zh','en'] for kind in ['student','answers','D']]
subprocess.run([os.environ.get('SOFFICE_PATH','soffice'),'-env:UserInstallation=file://'+str(WORK/'lo'),'--headless','--convert-to','pdf','--outdir',str(WORK),*paths],check=True)
