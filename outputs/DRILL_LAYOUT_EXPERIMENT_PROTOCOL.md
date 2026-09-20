# Dual Angle・完成球慣性 実験プロトコル v2

## 今回のモデル修正

現行モデルを次の3層に分ける。

1. **幾何層** — ドリル角、PIN–PAP、VAL角から、PIN・PSA/CG・PAP・VAL・グリップ位置を球面上に配置する。
2. **質量特性層** — カタログRGと穴形状から、完成球の重心、3×3慣性テンソル、主RG、PAP軸RGを推定する。
3. **運動層** — 完成球テンソルと投球条件から回転・軸移動を扱う。現段階は無外力剛体回転とUSBC実測フレア幅による比較表示であり、レーン上のフック予測ではない。

一次資料との照合により、質量特性層の軸定義を修正した。

- PINを低RG（X）軸とする。
- PSAを高RG（Y）軸とする。
- 両軸に直交する軸を中間RG（Z）軸とする。
- Total Differential = 高RG − 低RG。
- Intermediate Differential = 高RG − 中間RG。

従って、カタログ値からは `RG_high = RG_low + Diff`、`RG_mid = RG_high − IntDiff` と復元する。

## 第1段階: 一因子スイープ

画面上の現在値を基準レイアウトとし、他の入力を固定したまま一因子ずつ変更する。既定の走査範囲は次の通りで、現在値が刻みに含まれない場合も基準行として追加する。

| 因子 | 比較水準 | 固定する主条件 |
|---|---|---|
| ドリル角 | 10–90°、10°刻み＋現在値 | PIN–PAP、VAL角、PAP、穴径・深さ・ピッチ |
| PIN–PAP | 1–6\"、1/2\"刻み＋現在値 | 両角度、PAP、穴仕様 |
| VAL角 | 20–70°、10°刻み＋現在値 | ドリル角、PIN–PAP、PAP、穴仕様 |

各条件で次を保存する。

- 完成球の低・中間・高RG
- 完成球のTotal Diff / IntDiff
- PAP–NAP軸RGと同軸まわりの慣性モーメント
- PAP軸とPIN低RG軸、PSA高RG軸との角度
- 除去質量、重心移動、コア接触深さ
- 同じ回転エネルギーを仮定した場合の相当RPM

UIの「Dual Angle 慣性比較」は、現在値に対してドリル角±5°、PIN–PAP±1/4インチ、VAL角±5°を一因子だけ変えた局所感度を表示する。「静的レイアウト実験」は上記の全走査を実行し、全行をCSVへ書き出す。

## 第2段階: 作用先の定量化

各因子について、各出力の最大値と最小値の差を「変化幅」とする。異なる単位の出力を同じ順位表で比較するため、UIの作用先カードでは次の基準比を使う。

`正規化変化幅 [%] = (最大値 − 最小値) / max(|基準値|, 指標別の下限尺度) × 100`

同時に、入力値を説明変数、出力値を目的変数とする単回帰の傾きとR²を記録する。

- R²が0.8以上で傾きが正: 「増加傾向」
- R²が0.8以上で傾きが負: 「減少傾向」
- R²が0.8未満: 「非線形」
- 全走査で数値差が丸め誤差相当: 「ほぼ一定」

これは因果を実証する統計検定ではない。ほかの2因子および穴仕様を固定した計算モデル内で、どの出力がどれだけ変わったかを整理する記述量である。

## 第3段階: 複合比較

現在値を中央水準として、原則として次の3水準を組み合わせる。

| 因子 | 低 / 中 / 高水準 |
|---|---|
| ドリル角 | 現在値 −20° / 現在値 / 現在値 ＋20° |
| PIN–PAP | 現在値 −1\" / 現在値 / 現在値 ＋1\" |
| VAL角 | 現在値 −20° / 現在値 / 現在値 ＋20° |

入力範囲端では3水準が範囲内に収まるよう片側へ寄せる。通常は `3 × 3 × 3 = 27` 条件となる。

2因子A・Bの相互作用は、第三因子を基準値へ固定し、基準から最も離れた比較水準について次で算出する。

`Interaction(A,B) = Y(A,B) − Y(A,基準) − Y(基準,B) + Y(基準,基準)`

相互作用が0に近ければ、その比較範囲では両因子の効果はおおむね加算的である。0から離れるほど、片方の作用量がもう片方の水準によって変わる。符号は「性能の良否」ではなく、対象出力に対する非加算成分の向きを示す。

## 記録形式

画面とCSVには、基準条件・固定条件・実行時刻に加え、全条件について次を保存する。

- Dual Angle 3入力
- 完成球重量、除去質量
- 重心移動量とXYZ成分
- PAP–NAP軸RG、同軸まわりの慣性モーメント
- 完成球の低・中間・高RG、Total Diff、IntDiff
- PAP→PIN軸角、PAP→PSA軸角
- 最初のコア接触深さ、穴同士の干渉数
- 基準PAP軸慣性との差、基準PAP軸RGとの差
- 同じ回転エネルギー・基準350 RPMとした場合の相当RPM差

CSVは実験結果の明示的な持ち出し手段とし、操作者やボウラーの個人情報を自動付加しない。

## 結果の読み方

- Dual Angleは未ドリルコアを回転させる入力ではなく、固定されたPIN・PSA/CGに対してPAPとグリップをどこへ置くかを定義する。
- PIN–PAPはPAP初期回転軸と低RG軸の関係を直接変える。ドリル角とVAL角はグリップ穴の位置を変え、除去質量を介して完成球の慣性テンソルにも影響する。
- `I = m RG²` なので、同じ回転エネルギーを与える仮定では、PAP軸慣性が大きい条件ほどRPMは低くなる。USBCの投球者試験でも、この傾向が報告されている。
- Diffとフレアには実測上の関係があるが、フック量はDiffだけで一意に決まらない。USBC試験ではRG、Diff、両者の相互作用、表面、レーン上摩擦、投球条件が結果へ影響した。

## 現時点で推定に留める部分

穴除去は球全体を一様密度とする近似である。実球はカバー、外核、内核で密度が異なるため、カタログの3つのRGだけでは穴が各材料から除去する質量と慣性を一意に復元できない。以下のいずれかが得られるまでは絶対値を保証しない。

- メーカーのコアCAD、各材料の密度と位置
- ドリル前後の実測重量、X/Y/Z軸RG、完成球PSA
- 実穴の径、深さ、先端形状、グリップ・スラグ・接着剤の質量と密度

レーン運動にはさらに次が必要である。

- リリース速度、RPM、軸回転角、軸傾斜角、初期位置・投射角
- ボール表面粗さと実測Ball-on-Lane CoF
- オイルパターンの位置別・時間変化する摩擦分布
- 接触モデル（滑り・スピン摩擦・転がり抵抗）

これらがない状態で、フック量、ブレイクポイント、入射角を数値予測として表示しない。

## 校正手順

1. 同一ボールを同一表面に調整し、完成球の重量と3軸RGを測定する。
2. モデルの完成球RG誤差を記録し、一様密度近似の系統誤差を確認する。
3. E.A.R.L.相当の固定条件または再現性の高い投球者で、速度・RPM・軸回転・軸傾斜を固定する。
4. フレアリング幅、ブレイクポイント、総フック、入射角を条件ごとに複数投測定する。
5. 静的質量特性層を先に校正し、その後にレーン摩擦・運動層を校正する。両者を同時に合わせ込まない。

## 一次資料

- MoRich, Mo Pinel, [Dual Angle Layout Technique](https://www.buddiesproshop.com/content/DualAngle.pdf) — 3入力の定義、推奨有効範囲、施工手順。
- USBC, [SOP-BALL-1: Radius of Gyration of Asymmetrical Bowling Balls](https://images.bowl.com/bowl/media/assets/usbc/equipment%20specs/sop-ball-1-asymm_rg.pdf) — PIN、PSA、直交3軸の測定配置。
- USBC, [Ball Motion Study: Phase I and II Final Report](https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/08ballmotionstudy.pdf) — Total/Intermediate Differentialの定義とボールモーション変数。
- USBC, [Differential RG Study](https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/TechnologyStudy/Core/1.pdf) — Diffとフレア幅・レーン結果のE.A.R.L.実測。
- USBC, [RPM vs Ball Moment of Inertia](https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/TechnologyStudy/Core/6.pdf) — PAP軸MOIと投球者RPMの関係。
- USBC, [Ball-on-Lane CoF SOP-BALL-31](https://images.bowl.com/bowl/media/assets/usbc/equipment%20specs/sops/sop-ball-31-ball-on-lane-cof-(web).pdf) — 現行のレーン上摩擦測定条件。
- Ji et al., [Using Physics Simulations to Find Targeting Strategies in Competitive Tenpin Bowling](https://doi.org/10.1063/5.0247761), AIP Advances 15, 045222 (2025) — 接触点速度、摩擦力・トルク、剛体Euler方程式を結合したレーン運動モデル。
- Banerjee and McPhee, [A Volumetric Contact Model to Study the Effect of Lane Friction and the Radii of Gyration on the Hook Shot](https://doi.org/10.1016/j.proeng.2014.06.075), Procedia Engineering 72 (2014) — 接触・摩擦分布とRGの比較、および摩擦が支配的というシミュレーション結果。
