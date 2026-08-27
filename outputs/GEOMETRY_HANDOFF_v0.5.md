# ボウリング・ドリルレイアウト3Dモデル 引き継ぎ資料 v0.5

最終更新: 2026-08-27

## 1. 目的

本アプリケーションの本流は、メジャーリング値から数学的に一貫したボール表面レイアウトと穴軸を構成し、スパン、ホール径、ピッチ、穴深さおよびドリルレイアウトを3Dで同時に検証できる状態へ到達することである。ドリルマシン外観モデルは、機械設定値と穴軸の対応を検証する補助モデルとして扱う。

## 2. データ処理の境界

次の四層を混同しないこと。

```text
MeasureSheetInput
  -> IdealGripGeometry
  -> MachineKinematics
  -> AsDrilledMeasurement
```

- `MeasureSheetInput`: スパン、ホール径、ピッチ、穴深さ、PAP、Dual Angle値などの入力。
- `IdealGripGeometry`: 真球と円筒で構成する理想形状。
- `MachineKinematics`: 機械目盛を治具姿勢と固定ドリル軸へ変換する機種固有層。
- `AsDrilledMeasurement`: 三次元測定された入口輪郭、穴軸、径、深さ。

## 3. 座標系とTeXによる基礎式

ボール中心を $\mathbf{c}=\mathbf{0}$、半径を $r_{\mathrm B}$ とする。穴 $i$ の球面上の基準点を $\mathbf{q}_i$ とし、外向き法線を

```tex
\mathbf n_i=\frac{\mathbf q_i-\mathbf c}{r_{\mathrm B}}
```

とする。局所接平面上の横方向単位ベクトルを $\mathbf e_i^{\mathrm L}$、フォワード／リバース方向単位ベクトルを $\mathbf e_i^{\mathrm V}$ とする。これらはグリップ中心で定義した基底を各穴位置へ射影し、正規直交化して得る。

ピッチベクトルは

```tex
\mathbf p_i=p_i^{\mathrm L}\mathbf e_i^{\mathrm L}+p_i^{\mathrm V}\mathbf e_i^{\mathrm V}
```

である。中心深さ平面上の照準点を

```tex
\mathbf a_i=\mathbf c+\mathbf p_i
```

とし、穴軸を

```tex
\mathbf d_i=\frac{\mathbf a_i-\mathbf q_i}{\lVert\mathbf a_i-\mathbf q_i\rVert}
```

と定義する。穴深さ $h_i$ に対する終点は

```tex
\mathbf t_i=\mathbf q_i+h_i\mathbf d_i
```

である。この順序により、$h_i$ を変更しても $\mathbf d_i$ は変化しない。

総ピッチ量と中心方向からの傾斜角は

```tex
\rho_i=\sqrt{\left(p_i^{\mathrm L}\right)^2+\left(p_i^{\mathrm V}\right)^2},
\qquad
\theta_i=\arctan\left(\frac{\rho_i}{r_{\mathrm B}}\right)
```

である。

### 3.1 Forward／Reverseの恒久仕様

- UIでは親指・フィンガーともに正値をForward、負値をReverseとする。
- 親指のForward基底は、親指からフィンガー対へ向かう方向とする。
- フィンガーホールのForward基底は、フィンガー対からグリップ中心へ向かう方向とする。
- フィンガーホールでは、グリップ中心からフィンガー対へ向かう局所 `up` の反対方向がForwardである。
- 入力値を表示層や穴ごとの例外処理で反転してはならない。`pitchRole` から解剖学的基底の向きを決定する。
- この仕様は `test_grip_geometry.mjs` の回帰テストで固定する。

## 4. 穴入口とスパン

穴円筒を

```tex
\mathcal C_i=
\left\{
\mathbf x\in\mathbb R^3\ \middle|\
\left\|
\left(\mathbf I-\mathbf d_i\mathbf d_i^{\mathsf T}\right)
\left(\mathbf x-\mathbf q_i\right)
\right\|=a_i
\right\}
```

とし、球面との交線

```tex
\Gamma_i=\mathcal C_i\cap\mathcal S_{\mathrm B}
```

を入口輪郭とする。実効スパンは中心間距離ではなく、指定された測定方向に対する入口輪郭上のグリッピングエッジ間距離として解く。現行コードの `openingBoundaryPoints()` と数値二分探索は、この目的に継続利用できる。

## 5. 今回修正した実装

対象: `outputs/bowling-drill-3d-prototype.html`

- UIの横ピッチ値と垂直ピッチ値を内部で入れ替える処理を廃止した。
- 中指・薬指だけに入っていた符号反転を廃止した。
- `drillSegment()` から、`inward * drillDepth + pitch` により軸を作る誤った処理を除去した。
- `transportedPitchBasis()` を追加し、Dual Angleで回転したグリップ基底を各穴位置へ移送するようにした。
- `pitchAimPoint()` を追加し、中心深さ平面上の照準点から穴軸を決めるようにした。
- 穴深さは、確定した穴軸に沿う移動量だけを決める。

## 6. 必須の不変条件

今後の変更では、次を自動テストで維持すること。

1. ピッチが零なら穴軸はボール中心を向く。
2. 穴深さだけを変えても穴軸は変わらない。
3. 横ピッチだけを変えると、局所横方向成分だけが変化する。
4. 垂直ピッチだけを変えると、局所フォワード／リバース方向成分だけが変化する。
5. Dual Angleレイアウトを回転しても、ピッチの意味はグリップ基底に追従する。
6. 入口輪郭の各点は球面と穴円筒の双方を満たす。
7. スパン端点は表示円ではなく、計算された入口輪郭上に存在する。
8. フィンガーホールの正の垂直ピッチはグリップ中心方向（Forward）を向き、負値はReverseを向く。

テスト: `node tools/test_grip_geometry.mjs`

## 7. 推奨するアプリ構成

```text
src/
  domain/
    units.ts
    vectors.ts
    sphere.ts
    pitch.ts
    hole-cylinder.ts
    span.ts
    dual-angle.ts
    machine-kinematics.ts
  application/
    measure-sheet.ts
    solve-layout.ts
    validate-layout.ts
  rendering/
    ball-view.ts
    hole-mesh.ts
    annotations.ts
  ui/
    measure-form.ts
    diagnostics-panel.ts
tests/
  pitch.test.ts
  span.test.ts
  dual-angle.test.ts
```

現状は単一HTMLであるため、次段階では数値計算をDOMとCanvas描画から分離する。UI表示文字列や左右用ラベルの処理を、幾何計算へ混入させてはならない。

## 8. 可視化の要件

- 球面上のレイアウト基準点、実際の入口輪郭、穴軸、照準点、穴終点を別色で表示する。
- グリップ中心の局所基底 $\mathbf e^{\mathrm L},\mathbf e^{\mathrm V},\mathbf n$ を表示できるようにする。
- 「中心間スパン」「入口輪郭間スパン」「弦長」「球面測地距離」を切り替えて比較できるようにする。
- 入力値、理想幾何値、機械設定値、加工後実測値を同じ欄へ混在させない。
- 数値診断として $\lVert\mathbf d_i\rVert=1$、球面残差、円筒残差、肉厚、穴同士の最短距離を表示する。

## 9. 未確定事項

- 横ピッチの正負を解剖学的方向で表示するか、機械座標で表示するか。
- 日根谷型機械の円形目盛が円弧長、校正ピッチ値、または別のリンク変位のいずれを示すか。
- 55度条件を構成する二直線または二平面の一次資料上の定義。
- 実務上採用するスパン測定規約。
- ベベル、楕円穴、インサートおよび軟部組織変形のモデル化範囲。

## 10. 次の実装順序

1. 数値計算を純粋関数として単一HTMLから分離する。
2. 本資料の不変条件を単体テストへ移す。
3. 入口輪郭と四種類のスパン表示を診断パネルへ追加する。
4. メジャーシートJSONスキーマを定義し、保存・読込・バージョン移行を実装する。
5. 実機の既知設定と三次元測定結果を収集し、`MachineKinematics` を校正する。
6. その後に限り、実機目盛を穴軸へ変換するUIを有効化する。
