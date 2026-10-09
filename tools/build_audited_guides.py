from pathlib import Path
import math, json
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor, Color

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'outputs';OUT.mkdir(exist_ok=True)
pdfmetrics.registerFont(TTFont('JP',r'C:\Windows\Fonts\BIZ-UDGothicR.ttc',subfontIndex=0))
pdfmetrics.registerFont(TTFont('JPB',r'C:\Windows\Fonts\BIZ-UDGothicB.ttc',subfontIndex=0))
W,H=595.276,841.89
INK=HexColor('#17313D');TEAL=HexColor('#007F82');GOLD=HexColor('#BC671C');MUTED=HexColor('#52656B');PALE=HexColor('#EAF4F3')
sources=[
 ('S1','MoRich / Mo Pinel, Dual Angle Layout Technique', 'https://www.buddiesproshop.com/content/DualAngle.pdf'),
 ('S2','USBC, Ball Motion Study (2008)', 'https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/08ballmotionstudy.pdf'),
 ('S3','USBC, SOP-BALL-1 (2019)', 'https://images.bowl.com/bowl/media/assets/usbc/equipment%20specs/sop-ball-1-asymm_rg.pdf'),
 ('S4','USBC, The truth about axis migration and core dynamics', 'https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/articles/Thetruthaboutaxismigrationandcoredynamics.pdf'),
 ('S5','Radical, Results Plus Drilling Instructions', 'https://radicalbowling.com/uploads/downloads/Drilling-Instructions/Results-Plus-Drilling-Instructions.pdf'),
 ('S6','MIT OpenCourseWare, Classical Mechanics III (2014), 2.4', 'https://ocw.mit.edu/courses/8-09-classical-mechanics-iii-fall-2014/d9bac33f6c60b304dc0398e99b327102_MIT8_09F14_full.pdf')]

class Book:
 def __init__(self,name,title):
  self.c=canvas.Canvas(str(OUT/name),pagesize=(W,H));self.c.setTitle(title);self.c.setAuthor('Drill-3D-Model 理論検証');self.n=0;self.title=title
 def page(self,kicker,title,subtitle=''):
  if self.n:self.c.showPage()
  self.n+=1;c=self.c;c.setFillColor(TEAL);c.rect(0,H-12,W,12,fill=1,stroke=0)
  self.text(40, H-45,kicker,10,TEAL,True);self.text(40,H-86,title,24,INK,True)
  if subtitle:self.para(subtitle,40,H-109,515,10.5,MUTED)
  c.setStrokeColor(HexColor('#D3E0E1'));c.line(40,44,555,44)
  self.text(40,28,self.title+'  |  2026.09.20',8,MUTED);self.text(535,28,f'{self.n:02}',9,TEAL,True)
 def text(self,x,y,t,size=12,color=INK,bold=False):
  c=self.c;c.setFont('JPB' if bold else 'JP',size);c.setFillColor(color);c.drawString(x,y,t)
 def para(self,t,x,y,width=515,size=12,color=INK,bold=False):
  style=ParagraphStyle('p',fontName='JPB' if bold else 'JP',fontSize=size,leading=size*1.65,textColor=color,wordWrap='CJK')
  p=Paragraph(t,style);_,h=p.wrap(width,1000);p.drawOn(self.c,x,y-h);return y-h
 def block(self,y,title,body):
  self.text(40,y,title,15,TEAL,True);return self.para(body,40,y-18)-25
 def box(self,y,title,body,height=94):
  c=self.c;c.setFillColor(PALE);c.roundRect(40,y-height,515,height,9,fill=1,stroke=0)
  self.text(56,y-25,title,13,TEAL,True);self.para(body,56,y-39,482,11)
 def link(self,y,key,label,url):
  self.text(40,y,f'[{key}] {label}',9,TEAL);self.c.linkURL(url,(40,y-3,555,y+12),relative=0,thickness=0)
 def save(self):self.c.save()

import runpy
runpy.run_path(str(Path(__file__).with_name('build_decision_guide.py')), run_name='__main__')

# The detailed audit is authored separately as Markdown and typeset here.
audit=ROOT/'outputs/PHYSICS_MODEL_AUDIT.md'
if audit.exists():
 from reportlab.platypus import SimpleDocTemplate, Spacer, PageBreak
 from reportlab.lib.styles import getSampleStyleSheet
 from xml.sax.saxutils import escape
 styles={
  'body':ParagraphStyle('body',fontName='JP',fontSize=10,leading=16,wordWrap='CJK',spaceAfter=7,textColor=INK),
  'h1':ParagraphStyle('h1',fontName='JPB',fontSize=21,leading=29,spaceAfter=16,textColor=TEAL),
  'h2':ParagraphStyle('h2',fontName='JPB',fontSize=14,leading=21,spaceBefore=15,spaceAfter=8,textColor=TEAL,keepWithNext=True),
  'h3':ParagraphStyle('h3',fontName='JPB',fontSize=11,leading=17,spaceBefore=9,spaceAfter=5,textColor=INK,keepWithNext=True)}
 story=[]
 import re
 for line in audit.read_text(encoding='utf-8').splitlines():
  if not line.strip():continue
  kind='body';text=line
  for tag,k in [('### ','h3'),('## ','h2'),('# ','h1')]:
   if line.startswith(tag):kind=k;text=line[len(tag):];break
  text=escape(text)
  text=re.sub(r'\[([^\]]+)\]\((https://[^)]+)\)',r'<link href="\2" color="#007F82">\1</link>',text)
  text=re.sub(r'`([^`]+)`',r'\1',text)
  text=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',text)
  story.append(Paragraph(text,styles[kind]))
 def footer(c,doc):
  c.setFillColor(TEAL);c.rect(0,H-8,W,8,fill=1,stroke=0);c.setFont('JP',8);c.setFillColor(MUTED);c.drawString(40,27,'Drill-3D-Model | 理論整合性の監査 | 2026.09.20');c.drawRightString(555,27,str(doc.page))
 SimpleDocTemplate(str(OUT/'model-theory-audit.pdf'),pagesize=(W,H),rightMargin=40,leftMargin=40,topMargin=43,bottomMargin=52,title='Drill-3D-Model 理論整合性の監査',author='Drill-3D-Model 理論検証').build(story,onFirstPage=footer,onLaterPages=footer)
print('PDF generation complete')
