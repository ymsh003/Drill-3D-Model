# 静的質量モデルの拡張

版: `mass-moments-2026-09-25`

## 組み込んだ処理

本番 `outputs/bowling-drill-3d-prototype.html` の `calculatePhysicalModel` が以下を使用する。

- 円柱・円すいの穴の和集合。球外部分と、すでに除去した穴の内部を差し引く。
- ドリル前の実測重心位置。カタログRGから作る重心まわりの慣性を幾何中心へ移して加減算し、完成球の重心へ戻す。
- 実測質量と寸法を入力した、穴に同軸な一様中空円柱部材の追加。

穴の重複除去は既定で有効。重心と部材の入力は `data.massOptions` で受け取る。ブラウザー画面の入力欄は増やしていない。以下のCLIがJSON入力を本番計算へ渡す。

```sh
node tools/run_mass_model.mjs tools/mass-model-example.json result.json
```

同梱例は動作確認のための仮定値であり、特定の球・部材の実測値や推奨施工値ではない。

## 単位と座標

長さはインチ、質量はlb、慣性はlb·in²。JSONの寸法は機械処理用の小数とし、説明資料のドリル寸法は帯分数で表示する。

`initialCenterOfMassIn` は幾何中心を原点とする本番モデルの球固定xyz座標。CLI出力の `coordinateReference` にグリップ基底・ピン・PSA位置を含める。測定装置の座標が異なる場合は回転変換してから入力する。CG刻印は重心ベクトルの測定値ではない。トップウェイトのオンス値を、そのまま重心のインチ値へ代入しない。

カタログRGから構成する初期慣性は、初期重心まわりとして解釈する。重心以外の点を通る軸で測ったRGを使う場合、基準の照合が必要である。

## `massOptions`

| フィールド | 意味 | 未入力時 |
|---|---|---|
| `initialCenterOfMassIn` | `{x,y,z}`、実測初期重心 | `{x:0,y:0,z:0}`という仮定 |
| `radialSteps` | 穴断面の半径方向分割、整数8～512 | 24 |
| `angularSteps` | 穴断面の周方向分割、整数8～512 | 32 |
| `inserts` | 追加部材の配列 | 空配列 |

未対応フィールド、不正な数値・分割数はエラーにする。

### 各追加部材のフィールド

| フィールド | 意味 |
|---|---|
| `holeIndex` | `data.holes`の0始まりインデックス。CLI出力の`holeOrder`で照合 |
| `massLb` | 加工後の部材の実測質量。密度の自動推定は行わない |
| `outerRadiusIn` / `innerRadiusIn` | 一様中空円柱の外半径／内半径。直径ではない |
| `lengthIn` | 軸方向の長さ |
| `startDepthIn` | 穴軸の表面中心始点から部材上端までの軸方向距離 |

部材は穴の円柱部分と球内部に完全に収まる必要がある。曲面端を持つグリップを平端モデルへそのまま置換すると、寸法により拒否される。形状を実測してモデルの適用可否を判断する。同一穴では軸・半径方向の材料重複を拒否する。異なる穴では包囲球の交差を保守的に拒否するため、実際には接触しない部材が拒否される場合もある。

一様材の中空円柱の中心慣性は、密度積分から

\[
I_{\parallel}=\frac{m_a}{2}(a^2+b^2),\qquad
I_{\perp}=\frac{m_a}{12}\{3(a^2+b^2)+L^2\}.
\]

部材の重心とこの慣性を球固定座標へ変換して加算する。実測質量を入力しても、密度分布が一様でなければこの式の形状仮定は残る。

## 数値検証

```sh
node tools/test_model_physics.mjs
node tools/test_mass_extensions.mjs
node tools/test_grip_geometry.mjs
node tools/test_experiment_reproducibility.mjs
node tools/test_layout_interaction_experiment.mjs
node tools/test_zero_axis_experiment.mjs
node tools/check_default_union.mjs
```

物理モデル12項目、追加質量処理11項目、グリップ幾何8項目を検査した。直交円柱の和集合は独立な解析式を使用し、128×256分割で体積の相対誤差約1.89×10⁻⁶となった。実グリップについても24×32から192×256へ分割して除去量を比較した。任意形状に対する一律の精度保証ではない。

以前のゼロ基準テストは除去量が全条件で小数12桁まで一致することを要求していた。和集合の断面数値積分では、回転によって積分点の配置が変わるため、これを質量収支の検査へ変更した。解析解・収束・穴順序への不変性は専用テストで検査する。

`test_static_experiment.mjs` は取得時点から存在しない旧UIを要求するため、全リポジトリテスト成功とはしていない。

## 一次資料と採否

1. [MIT 8.09, Advanced Classical Mechanics](https://ocw.mit.edu/courses/8-09-classical-mechanics-iii-fall-2014/d9bac33f6c60b304dc0398e99b327102_MIT8_09F14_full.pdf), §2.3、式(2.38)、(2.49)。密度積分、平行軸移動を使用。穴の和集合の区間算法は本改修で構成し、解析形状で検証した。
2. [USBC, Side Weight vs. Large Balance Holes](https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/TechnologyStudy/Core/CORE15-SideWeightVs.LargeBalanceHole.pdf), 2017、p.2。穴あけ前後の重量・偏心・慣性・RGの測定。質量特性を扱う必要性の根拠であり、表の精度を本モデルへ転用していない。
3. [USBC, The Effects of Balance Holes](https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/TechnologyStudy/Core/14.pdf), 2017、pp.1–4。別シミュレーションの計算と実測の比較。本モデルの実測検証として数えていない。
4. [USBC, Equipment Specifications and Certifications Manual](https://bowl.com/getmedia/7b8b2ee2-cd3a-4fe1-ba31-1389d8fc9bbf/es_manual.pdf), 2024-01版、p.4、pp.17–19。スラグ、グリップ、交換式サム等の存在と仕様を確認。材料の密度範囲は個々の部材の実測密度ではないため、計算の固定密度として使用しない。このモデルは規則適合判定器ではない。

古いバランスホールの研究は質量変化の研究として参照し、現行の施工を推奨するものではない。

## 残る限界

除去密度は球全体の平均密度のまま。非一様なコア・カバーの材料別密度はカタログRGから一意に復元できない。追加部材は一様中空円柱までで、偏肉・複合材・接着剤の不均一分布や曲面端は未対応。実球の完成RG・重心との照合は未実施である。レーン摩擦・油膜・並進の連成も未実装で、U・Kを実フレアやレーン反応の予測値として扱わない。
