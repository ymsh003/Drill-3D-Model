from pathlib import Path
import json, math, shutil
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'outputs';OUT.mkdir(exist_ok=True)
pdfmetrics.registerFont(TTFont('JP',r'C:\Windows\Fonts\BIZ-UDGothicR.ttc',subfontIndex=0))
pdfmetrics.registerFont(TTFont('JPB',r'C:\Windows\Fonts\BIZ-UDGothicB.ttc',subfontIndex=0))
W,H=595.276,841.89
INK=HexColor('#17313D');TEAL=HexColor('#007F82');GOLD=HexColor('#AD5915');MUTED=HexColor('#52656B');PALE=HexColor('#EAF4F3');LINE=HexColor('#CCDCDD')
SOURCES=[
 ('S1','MoRich / Mo Pinel：Dual Angle Layout Technique','https://www.buddiesproshop.com/content/DualAngle.pdf'),
 ('S2','Storm：PIN-to-PAP・PSA・Pin Buffer の役割','https://www.stormbowling.com/storm-pin-buffer-layout-guide'),
 ('S3','Radical：Results Plus 公式ドリル表','https://radicalbowling.com/uploads/downloads/Drilling-Instructions/Results-Plus-Drilling-Instructions.pdf'),
 ('S4','Storm：2LS ドリルガイド（サムレス用）','https://stormproducts.nyc3.cdn.digitaloceanspaces.com/web_page_content/DOWNLOADS/Storm_2LSDrillingInstructions_Pamphlet.pdf'),
 ('S5','USBC：Ball Motion Study','https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/08ballmotionstudy.pdf'),
 ('J1','みなみの島ボウリングガーデン：ドリルレイアウトについて','https://minami-isle.info/proshop/drill.html'),
 ('J2','サンブリッジ：ドリルレイアウト資料集','https://www.sunbridge-group.com/pc/download/advertising/sunbridge_information/2025/2504_dual_angle_layout_and_more.pdf')]
c=canvas.Canvas(str(OUT/'dual-angle-beginner-guide.pdf'),pagesize=(W,H))
c.setTitle('デュアルアングル実践ガイド：3値からレイアウト候補を決める');c.setAuthor('Drill-3D-Model')
page=0;records=[]
def text(x,y,s,size=12,color=INK,bold=False):
 c.setFont('JPB' if bold else 'JP',size);c.setFillColor(color);c.drawString(x,y,s);records.append(s)
def para(s,x,y,w=515,size=11,color=INK,bold=False):
 p=Paragraph(s,ParagraphStyle('p',fontName='JPB' if bold else 'JP',fontSize=size,leading=size*1.65,wordWrap='CJK',textColor=color));_,h=p.wrap(w,1500)
 assert y-h>49,(page,s,y-h)
 p.drawOn(c,x,y-h);records.append(s);return y-h
def start(k,title,sub):
 global page
 if page:c.showPage()
 page+=1;c.setFillColor(TEAL);c.rect(0,H-10,W,10,fill=1,stroke=0)
 text(40,799,k,10,TEAL,True);text(40,757,title,23,INK,True);para(sub,40,737,size=10.5,color=MUTED)
 c.setStrokeColor(LINE);c.line(40,43,555,43);text(40,27,'デュアルアングル実践ガイド  |  改訂3  |  2026.09.20',8,MUTED);text(535,27,f'{page:02}',9,TEAL,True)
def block(y,title,body):
 text(40,y,title,14,TEAL,True);return para(body,40,y-17)-24
def box(y,title,body,h=95):
 c.setFillColor(PALE);c.roundRect(40,y-h,515,h,8,stroke=0,fill=1);text(55,y-24,title,12.5,TEAL,True);bottom=para(body,55,y-37,485,10.5);assert bottom>=y-h+10
def table(y,heads,rows,widths,size=10):
 x0=40;headheight=35
 c.setFillColor(TEAL);c.rect(x0,y-headheight,sum(widths),headheight,fill=1,stroke=0)
 x=x0
 for h,w in zip(heads,widths):para(h,x+9,y-7,w-18,size,HexColor('#FFFFFF'),True);x+=w
 y-=headheight
 for ri,row in enumerate(rows):
  ps=[];mh=0
  for value,w in zip(row,widths):
   p=Paragraph(value,ParagraphStyle('cell',fontName='JP',fontSize=size,leading=size*1.6,wordWrap='CJK',textColor=INK));_,h=p.wrap(w-18,1000);ps.append((p,h));mh=max(mh,h);records.append(value)
  rh=mh+21;assert y-rh>55,(page,row)
  c.setFillColor(PALE if ri%2==0 else HexColor('#F7FAFA'));c.rect(x0,y-rh,sum(widths),rh,fill=1,stroke=0)
  x=x0
  for (p,h),w in zip(ps,widths):p.drawOn(c,x+9,y-10-h);x+=w
  y-=rh
 return y

start('01 / DECISION MAP','３つの数値で何を調整するのか','「フレアの大きさ」「曲がり始め」「バックエンドの曲がり」に分けて考えます。')
table(684,['値と意味','最初に判断すること','変更の方向'],[
 ('P：ピン-PAP距離<br/>ピンからPAPまで、<br/>ボール表面に沿って測る距離','フレアを大きくするか、<br/>小さく抑えるか','3～4″付近はフレアを大きくする候補。短くする場合と長くする場合では、狙う動きが異なる。'),
 ('D：ドリルアングル<br/>ピンの位置で測る角度','曲がり始めを<br/>早めるか、遅らせるか','小さく → 曲がり始めを早める<br/>大きく → 曲がり始めを遅らせる<br/>主に非対称コアでの目安。'),
 ('V：VALアングル<br/>PAPの位置で測る角度','レーン奥での曲がりを<br/>鋭くするか、穏やかにするか','小さく → キレを出す<br/>大きく → アーク状の曲がりに<br/>「キレ」は曲がり方の鋭さ。')],[145,151,219],10.5)
box(380,'この資料の比較基準：45° × 4″ × 45°','表記は D × P × V の順です。この数値は、変更による違いを説明するための比較基準です。実際に選ぶときは、そのボールのメーカー推奨レイアウトを出発点にしてください。',107)
block(237,'選ぶ順番：P → D → V → 組み合わせを確認','まずPでフレアの大きさを検討し、Dで曲がり始め、Vでバックエンドの曲がり方を調整します。最後に２つの角度の合計と、指穴・オイルトラックの位置を確認します。')
para('本表はメーカーの経験則に基づく選び方の目安です。[S1, S2] 主な数値例は、親指を入れて投げる非対称コアのボールを想定しています。対称コア・サムレスは7ページ、用語は9ページを参照してください。',40,117,size=10,color=MUTED)

start('02 / WHY THEY MATTER','３つの数値がボールに与える影響','それぞれに主な役割がありますが、１つの値を変えると、ほかの特性にも影響します。')
y=block(675,'P：リリース時の回転軸に対するコアの向き','ピンはコアの低RG軸を示す目印、PAPはリリース時の回転軸がボール表面と交わる点です。両者の距離を変えると、コアと回転軸の位置関係が変わり、フレアの大きさに影響します。フレアが大きいほど、回転ごとにレーンへ接触する部分が大きくずれます。')
y=block(y,'D：非対称コアのPSAとPAPの位置関係','非対称コアでは、ピンとPSAを結ぶ線を基準に、ピンとPAPを結ぶ線の角度を指定します。PSAは高RG軸の目印です。Pが同じでもDを変えるとPSAとPAPの位置関係が変わり、ボールの動きに影響します。')
y=block(y,'V：ピンに対するグリップと指穴の位置','PAPの位置で、ピン-PAP線とVALが作る角度を指定します。VALはPAPを通る縦の基準線です。測定したPAP座標からグリップ位置を割り出すため、Vを変えると指穴の位置が変わります。穴を開けて除去する部分が変わり、ドリル後の慣性特性にも影響します。')
box(320,'レイアウト選びで注目すること','Pはフレアの大きさ、Dは曲がり始め、Vはバックエンドの曲がり方を考える際の目安です。これらは互いに影響するため、投球では３点をまとめて確認します。',98)
y=block(187,'「どこから曲がるか」と「どう曲がるか」','「曲がり始め」は、手前から曲がるか、奥まで走ってから曲がるか。「曲がり方」は、短い区間で鋭く曲がるか、緩やかに弧を描くかです。キレがあることと、曲がり幅が大きいことは同じではありません。')
para('２つのアングルは、穴を開ける刃の傾きとは別です。穴の傾きは「ピッチ」、フィンガーホールとサムホールの間隔は「スパン」として指定します。角度の定義：[S1]。',40,83,size=9.5,color=MUTED)

start('03 / SELECT PIN-TO-PAP','ピン-PAP距離とフレアの関係','数値が大きいほど曲がる、という関係ではありません。4″前後を基準に考えます。')
table(682,['距離の目安','狙いと使う場面','4″基準からの選び方'],[
 ('3～4″付近','フレアを大きくしたいとき。<br/>オイルの付いていない面を<br/>レーンに接触させやすくする。','現在5 1/2″なら4″へ。<br/>現在2″なら3 1/2～4″へ。'),
 ('5～6″付近','ロングピンの候補。<br/>手前の走りを出し、レーン奥で曲がらせたいとき。','まず5″程度と比較する。<br/>非対称コアではフレアが小さくなるとは限らない。'),
 ('0～2″付近','ショートピンの候補。<br/>フレアを抑え、オイルの薄い部分での急な曲がりを抑えたいとき。','メーカーのショートピン用レイアウトを確認する。<br/>4″からの微調整とは分ける。')],[101,213,201],10.5)
box(387,'フレアを大きくするには、現在の距離を確認する','45° × 5 1/2″ × 45° → 45° × 4″ × 45°<br/>45° × 2″ × 45° → 45° × 3 1/2″ × 45°<br/>どちらもフレアを大きくする候補です。２つの角度は変えずに比較します。',111)
y=block(240,'ショートピンとロングピンは、目的が異なる','手前の走りが欲しいならロングピン、オイルの薄い部分で曲がり過ぎるのを抑えたいならショートピンが候補です。「ピン」はここではピン-PAP距離を指し、どちらも単に曲がりを弱める方法とは言い切れません。')
para('距離ごとの傾向はStormの説明 [S2] に基づきます。特に非対称コアでは、PSAや指穴の位置によって結果が変わります。Pを変えると、Dが同じでもPSA-PAP距離が変わります。フレアの大小だけで曲がり幅は決まりません。',40,123,size=10,color=MUTED)

start('04 / ADJUST ONE VALUE','曲がり始めと曲がり方を調整する','基準の45° × 4″ × 45°から、まず１つの数値を変えて比較します。')
table(682,['変えたいこと','最初の比較候補','固定する値'],[
 ('曲がり始めが遅い<br/>→ もう少し手前から曲げたい','30° × 4″ × 45°<br/>D：45° → 30°','P＝4″、V＝45°'),
 ('曲がり始めが早い<br/>→ もう少し奥まで走らせたい','60° × 4″ × 45°<br/>D：45° → 60°','P＝4″、V＝45°'),
 ('曲がりが緩やか<br/>→ バックエンドにキレが欲しい','45° × 4″ × 30°<br/>V：45° → 30°','D＝45°、P＝4″'),
 ('奥で急激に曲がる<br/>→ アーク状の曲がりにしたい','45° × 4″ × 60°<br/>V：45° → 60°','D＝45°、P＝4″')],[172,199,144],11)
box(336,'15°刻みは、違いを比較するための例','「15°変えると何フィート・何枚変わる」という換算値ではありません。メーカーの基準案が違う場合は、その案から同じ方向の候補を作ります。',100)
y=block(199,'曲がり始めと曲がり方を、両方確認する','Dだけを小さくした場合も、Vだけを大きくした場合も、２つの角度の合計が変わります。狙った変化が出たかを見ながら、曲がり始めとバックエンドの曲がり方の両方を確認してください。')
para('変化の傾向はDual Angle原典の経験則 [S1]、数値例は本資料で設定した比較案です。Dで曲がり始めを調整する説明は、主に非対称コアを対象としています。',40,95,size=10,color=MUTED)

start('05 / COMBINE THE ANGLES','２つの角度を組み合わせて仕上げる','手持ちのボールと役割を分けたいときは、角度の合計と比率も確認します。P＝4″の例です。')
table(682,['レイアウト例','角度の合計と比率','狙うボールの動き'],[
 ('30° × 4″ × 30°','合計60°・1：1','走りから曲がりへの移行を早め、摩擦に素早く反応させたい。'),
 ('45° × 4″ × 45°','合計90°・1：1','この資料での比較基準。'),
 ('60° × 4″ × 60°','合計120°・1：1','走りを長くし、曲がりへの移行を穏やかにしたい。'),
 ('30° × 4″ × 60°','合計90°・D＜V','ミッドレーンから曲がり始め、緩やかな弧を描かせたい。'),
 ('60° × 4″ × 30°','合計90°・D＞V','手前の走りを出し、バックエンドで鋭く曲げたい。')],[177,139,199],10.5)
box(290,'角度の合計で移行の傾向、比率で曲がり方を考える','球速に対して回転数が少なく、曲がり始めが遅い場合は、合計を小さくする案を検討します。回転数が多く、手前から曲がり過ぎる場合は大きくする案が候補です。同じ合計でも、DとVの比率が違えば曲がり方は変わります。',121)
para('原典 [S1] の経験則を整理した比較表です。角度の合計から、曲がり始めの距離や曲がり幅は計算できません。現在のボールの不満を改善したいときは、まず4ページのように１つの数値を変えて検討します。',40,120,size=10,color=MUTED)

start('06 / TROUBLESHOOT','曲がりが足りないときの見分け方','ピンに届く直前だけでなく、手前から奥まで、ボールの動きを追って判断します。')
table(680,['観察したこと','まず狙う変更','基準からの候補'],[
 ('奥まで滑り、曲がり始めが遅い','曲がり始めを早める。<br/>まずDを小さくする。','30° × 4″ × 45°'),
 ('手前から曲がり始めるが、ピン手前で曲がりが弱くなる','手前の走りを出す。<br/>Dを大きくする。','60° × 4″ × 45°'),
 ('曲がり始めはよいが、オイルの薄い部分で急激に曲がる','曲がり方を穏やかにする。<br/>まずVを大きくする。','45° × 4″ × 60°'),
 ('曲がり始めはよいが、バックエンドのキレが足りない','バックエンドのキレを出す。<br/>まずVを小さくする。','45° × 4″ × 30°'),
 ('現在の5 1/2″より、フレアを大きくしたい','Pを3～4″に近づける。<br/>まずDとVは変えずに比較。','45° × 4″ × 45°')],[201,180,134],10.5)
box(298,'変更を確定する前に見ること','銘柄・重量・表面仕上げが違うと、レイアウトだけの効果は比較できません。投球ライン、球速、表面仕上げ、オイルの状態を記録し、同じ傾向が続くか確認してから、新しく開けるボールのレイアウトを検討します。',118)
para('ボールの種類や表面仕上げがレーンに合わない場合は、先にそちらを見直します。「滑り過ぎて曲がらない」と「手前で曲がり過ぎて奥の動きが弱い」では対策が逆になるため、実際の軌道を確認することが大切です。[S5]',40,127,size=10,color=MUTED)

start('07 / CORE & GRIP','対称コア・サムレスでの選び方','コアの種類やサムホールの有無が違うと、同じレイアウトでも効果が変わります。')
y=block(675,'対称コア：ピン-PAP距離とVALアングルを中心に','穴を開ける前の理想的な対称コアには、非対称コアのように特定のPSA方向がありません。PとVを固定してDだけを変えても、曲がり始めの調整に同じようには使えません。メーカー指定の基準線と穴の配置を確認し、PとVを中心に検討します。')
box(544,'対称コアでバックエンドの曲がりを穏やかにする例','メーカーの基準が45° × 4″ × 45°なら、45° × 4″ × 60°が比較候補です。手前の走りが欲しい場合は、Pを4″から5″にする案と、表面仕上げやボールの種類の変更を検討します。',109)
y=block(398,'サムレス：メーカーの専用レイアウトを出発点に','サムホールがないため、同じ３値でもドリル後の慣性特性が異なります。まずサムレス用の推奨レイアウトを確認し、自分のPAPとフィンガーホールの位置・深さに合わせて検討します。親指を使う投げ方の数値例を、そのまま流用しないようにします。')
y=block(y,'2LSの３値は、デュアルアングルと単位が違う','Stormの2LSには5″ × 4″ × 3 1/2″という基準例があります。順にピン-PAP、PSA-PAP、ピン-グリップ中心の距離を表し、３値とも長さです。デュアルアングルとは読み方が違うため、配置を比較したいときはドリラーに確認してください。[S4]')
para('対称コアの説明は理想的な慣性モデルに基づきます。実際のボールでは内部構造やメーカー指定も確認してください。基準線の定義：[S1]。サムレス用レイアウト：[S4]。',40,116,size=10,color=MUTED)

start('08 / CHOOSE & RECORD','ドリラーに相談するための記入シート','希望する動きと変更する数値を整理してから、プロショップで相談しましょう。')
table(682,['項目','記入する内容'],[
 ('使用するボール','銘柄・重量・表面：＿＿＿＿＿＿＿＿＿＿<br/>コア：対称／非対称　親指：使う／使わない<br/>PAP：横＿＿″・上下＿＿″'),
 ('現状 → 目標','改善したい点：曲がり始め／曲がり方／フレア<br/>目標：＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿'),
 ('基準 → 比較候補','基準：＿＿° × ＿＿″ × ＿＿°<br/>候補：＿＿° × ＿＿″ × ＿＿°<br/>最初に変える値：P／D／V　理由：＿＿＿＿＿'),
 ('確認','固定する条件：＿＿＿＿＿＿＿＿＿＿＿<br/>曲がり始め：＿＿＿　バックエンドの曲がり：＿＿＿<br/>ドリラーへの確認：指穴・トラックの位置／メーカー指定')],[105,410],10.5)
text(40,312,'メーカーの推奨例も確認する',13,TEAL,True)
para('Radical Results Plusでは、45° × 4″ × 35°が汎用的な動き、70° × 3 1/2″ × 20°が鋭い曲がりを狙う例として示されています。特定のボールとPAP条件に対する推奨で、どのボールにも同じ結果を保証するものではありません。[S3]',40,294,size=10)
box(209,'相談するときの伝え方の例','「今のボールは曲がり始めは合っていますが、オイルの薄い部分で急に曲がります。PとDは変えず、Vを45°から60°にする案を考えています。指穴やオイルトラックの位置に問題がないか確認してください。」',117)

start('09 / TERMS & SOURCES','用語と参考資料','言葉だけで判断せず、レーン上のどのような動きを指すのか確認しましょう。')
table(682,['用語','この資料での意味'],[
 ('走り（スキッド）','ボールが大きく曲がり始める前に、滑りながら進むこと。'),
 ('ミッドレーン／バックエンド','ミッドレーンはレーン中盤、バックエンドはレーン奥の部分。'),
 ('キレ／アーク状の曲がり','キレは、短い区間で鋭く曲がる様子。アーク状は、緩やかな弧を描く曲がり方。曲がり幅の大小とは分けて考える。'),
 ('トラックフレア','回転軸の移動に伴い、回転ごとの接触軌道がずれる現象。投球後、ボールに複数のオイルリングとして現れる。'),
 ('ドリラー','プロショップなどで、指穴の位置・寸法を決め、穴を開ける担当者。')],[161,354],10)
para('インチ記号は ″ です。長さに端数がある場合は帯分数で表し、3 1/2″は「３と２分の１インチ」と読みます。整数の長さは4″のように表します。',40,354,size=10)
text(40,292,'参考資料（各項目をクリック）',12,TEAL,True)
for i,(key,label,url) in enumerate(SOURCES):
 y=269-i*22;text(40,y,f'[{key}] {label}',9,TEAL);c.linkURL(url,(40,y-3,555,y+12),relative=0,thickness=0)
para('S1～S5は定義・経験則・メーカー推奨例の根拠、J1・J2は日本語の用語・表現の参考です。45° × 4″ × 45°の比較基準、15°刻み、症状別の候補は本資料の説明用です。シミュレーションの独自指標から推奨値を算出したものではありません。',40,108,size=9,color=MUTED)
c.save()
import re
markdown='# デュアルアングル実践ガイド（改訂3）\n\n'
markdown+='\n\n'.join(re.sub('<[^>]+>',' ',s) for s in records if 'デュアルアングル実践ガイド  |' not in s)
markdown+='\n\n## 出典\n\n'+'\n'.join(f'- [{k} {label}]({url})' for k,label,url in SOURCES)+'\n'
(OUT/'dual-angle-decision-guide.md').write_text(markdown,encoding='utf-8')
print(json.dumps({'pages':page,'file':str(OUT/'dual-angle-beginner-guide.pdf')},ensure_ascii=True))
