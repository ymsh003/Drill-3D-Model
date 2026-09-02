# ボウリングボールのPAP・軸移動・オイルフレア技術資料

更新日: 2026-09-02  
対象: `outputs/bowling-drill-3d-prototype.html`

## 1. この資料の目的

本資料は、3Dモデルに実装した初期回転軸、ファーストトラック、軸移動、オイルフレアの物理的意味と、実測がなければ決定できない範囲を区別する。モデルは完成球の質量特性とPAPから球面上のフレア形状を可視化するものであり、レーン上のフック量や入射角を予測するシミュレータではない。

## 2. 座標と入力

- ボール固定座標: ドリル穴、PIN、CG、MB、PAPを記述する。
- レーン固定座標: 横方向、鉛直方向、進行方向を記述する。
- PAP: リリース直後の正の回転軸がボール表面と交わる点。
- NAP: PAPの対蹠点。
- 初期回転軸: ボール中心からPAPへ向かう単位ベクトル `u0`。

PAPは初期軸を定めるが、レーン座標に対する軸チルトと軸ローテーションを一意に求めるには、リリース時のボール姿勢または高速度映像が必要である。ボール表面上のフレア幾何だけを描く場合、レーン座標への変換は必須ではない。

## 3. 完成球の質量特性

未ドリル球の慣性テンソルから、各ドリル穴を円柱部と円すい先端部に分けて除去する。除去後の重心 `c` と、新重心まわりの慣性テンソル `I` は

```text
M' = M - sum(m_h)
c  = -sum(m_h r_h) / M'
I' = I_blank - sum(I_h) - M' (||c||^2 E - c c^T)
```

で求める。`I'` を固有値分解し、三主慣性モーメント `I1 <= I2 <= I3` と主軸を得る。各軸のRGは `RG_i = sqrt(I_i / M')` である。

## 4. ファーストトラック

理想化した初期回転軸を `u0`、ボール半径を `R` とすると、初期トラックは

```text
||r|| = R
u0 dot r = 0
```

を満たす球面上の大円である。これはPAPおよびNAPから球面距離90度、標準球では約6.75インチ離れた軌道になる。

オイルはフレアを発生させる原因ではない。完成球の動的不釣り合いによる軸移動で接触軌道が変わり、オイルがその履歴を可視化する。

## 5. 軸移動モデル

初期角速度を `omega(0) = 2 pi rpm / 60 * u0` とし、主軸座標でEulerの剛体回転方程式を積分する。

```text
dω1/dt = (I2 - I3) ω2 ω3 / I1
dω2/dt = (I3 - I1) ω3 ω1 / I2
dω3/dt = (I1 - I2) ω1 ω2 / I3
```

数値積分は4次Runge-Kutta法、最大時間刻み0.002秒で行う。USBCの実測では、通常の認証球の軸移動点は初期PAP軸のRGとおおむね同じRG領域を通り、高RG軸へ単純に収束するわけではない。このため計算軸は初期PAPのRG面付近へ射影する。

外力トルク、オイル膜、カバーストック摩擦、回転数の実測減衰は含まない。従って軸移動の方向と上限を示す幾何モデルであり、位置ごとの厳密な時間予測ではない。

## 6. Bowtieとリング方向

連続する油リングは通常、球面上の二つの対蹠点付近で収束し、Bowtie形状を作る。本モデルは表側だけを描画し、1回転につき最大1本の識別可能なリングを生成する。

### サムあり

初期トラック上で、サムホール中心から下方へ延長した着床側をBowtie近似点とする。Bowtie軸まわりに正負2度移動した候補を比較し、サム、中指、薬指からトラックまでの最小球面距離が増える方向へ扇を開く。これは通常のレイアウトで後続リングがグリップ穴へ接近する不自然な表示を避けるための幾何条件である。

### サムレス・ツーハンドのサム不使用

仮想サム位置は使用しない。PAP-PIN側をBowtieのレイアウト基準近似とする。サムレスの実際の着床側は、非投球手の支持位置、掌の接触、手首姿勢、軸チルトおよび軸ローテーションに依存するため、二穴とPAPだけでは一意に決まらない。正確な置換には、最初の油リングまたはリリース直後の高速度映像が必要である。

## 7. フレア幅

初期軸と現在軸の角度を `Δθ` [rad] とすると、球面上の最大リング間隔を

```text
s = R Δθ
```

で表示する。上限はUSBC Differential RG Studyの実測表を区分線形補間する。

| Total Diff | 実測総フレア幅 [in] |
|---:|---:|
| 0.000 | 0.1875 |
| 0.010 | 0.625 |
| 0.020 | 1.125 |
| 0.030 | 1.500 |
| 0.040 | 2.250 |
| 0.050 | 2.875 |
| 0.060 | 3.4375 |
| 0.070 | 3.875 |

この表は特定のUSBC試験条件によるため、個々の投球で保証される値ではない。PIN-PAP、PSA-PAP、回転数、表面、投球者によって実測値は変化する。

## 8. 60フィート区間

シミュレーションはファールラインからヘッドピンまでの60フィートで停止する。速度 `v` [km/h] を

```text
v_ft/s = v * 1000 / 3600 * 3.280839895
t_60   = 60 / v_ft/s
N      = rpm / 60 * t_60
```

へ変換する。移動速度とrpmは独立入力であり、滑走中に純転がり条件 `v = R omega` を強制しない。

## 9. モデルで断定できないこと

- 実際の着床点。特にサムレスではリリース映像が必要。
- レーン位置ごとの摩擦係数。
- オイル膜厚、粘度、温度、吸収、キャリーダウン。
- 並進速度とrpmの時間変化。
- フック量、ブレークポイント、入射角。
- 投球ごとのフレアリング本数と濃さ。

これらを予測するには、油量マップ、ボール表面特性、速度・rpm時系列、初期姿勢、接触力および実測校正が必要である。

## 10. 実装上の検証

- PAP左右・上下入力は1/16インチ刻み。
- PAP-NAP軸は球を貫通する直線として表示。
- 60フィート到達時に自動停止。
- 裏側のリングは深度判定で非表示。
- サムあり／サムレスのBowtie基準を自動分岐。
- 既存テスト: grip geometry 8件、profile workflow 59件、合計67件成功。

## 11. 主要資料

1. USBC, The Truth About Axis Migration and Core Dynamics  
   https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/articles/Thetruthaboutaxismigrationandcoredynamics.pdf
2. USBC, Differential RG Study  
   https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/TechnologyStudy/Core/1.pdf
3. USBC, RG and Differential RG Study - Bowler Profile  
   https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/TechnologyStudy/Core/4.pdf
4. USBC, Ball Motion Study Phase I and II Final Report  
   https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/08ballmotionstudy.pdf
5. USBC, Bowling Styles - Two-Handed Approach  
   https://bowl.com/welcome/bowling-styles
6. Storm, 2LS Drilling Instructions  
   https://www.stormbowling.com/medias/Storm_2LSDrillingInstructions_Mobile.pdf

## 12. 結論

PAPは初期回転軸を定め、完成球テンソルとrpmは軸移動の幾何的傾向を与える。油リングはその軸履歴に垂直な接触軌道として描ける。一方、着床点とレーン上の時間発展はリリースおよびレーン条件に依存する。本モデルはその境界を明示し、実測入力がない部分を近似として表示する。
