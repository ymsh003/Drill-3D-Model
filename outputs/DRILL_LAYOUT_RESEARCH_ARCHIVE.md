# ドリルレイアウト検討資料アーカイブ

この文書は、ドリル角、PIN–PAP距離、VAL角と完成球の静的慣性値について、これまでに生成したデータ、検証資料、再現用スクリプト、配布物を参照するための索引です。

## 重要な注意

- 本アーカイブは次段階で再検討するための作業記録です。確定した設計基準や業界標準ではありません。
- `PAP補正フレア指標` は本プロジェクト独自の比較指標です。USBCやメーカーの公式指標ではなく、レーン上のフック量やフレア本数を直接表すものでもありません。
- 既存資料には、用語の選択や説明の明確さに再検討が必要な箇所が残っています。講座資料として再利用する場合は、一次資料に戻って定義と結論を再構成してください。
- 数値実験は静的な穴あけモデルを中心としています。カバーストック、表面仕上げ、レーン摩擦、投球速度、回転数、軸回転、軸傾斜は同一モデルに統合されていません。

## 実験データ

| データ | 内容 |
| --- | --- |
| `zero-axis-experiment-data.json` | 3入力のうち1項目だけを変化させた初期比較 |
| `layout-archetype-experiment-data.csv` / `.json` | 代表的なレイアウト条件の比較 |
| `layout-interaction-experiment-data.csv` / `.json` | 3値の組み合わせを含む相互作用データ |
| `real-ball-catalog-validation.csv` / `.json` | 実在6球の公式15 lb値を入力した63条件×6球、計378条件の計算結果 |
| `ball-spec-catalog.js` | メーカー公式値を整理したカタログデータ |
| `usbc-approved-ball-catalog.js` | USBC承認リストを基にした検索用カタログデータ |

## 方法と検討記録

| 資料 | 内容 |
| --- | --- |
| `DRILL_LAYOUT_EXPERIMENT_PROTOCOL.md` | モデルの層、入力条件、計算範囲、制限、一次資料 |
| `layout-interaction-primary-source-review.md` | 相互作用モデルと一次資料の照合記録 |
| `BOWLING_LAYOUT_DOCUMENT.md` | ドリルレイアウトの技術資料 |
| `FLARE_PHYSICS_TECHNICAL_NOTE.md` | RG、慣性モーメント、フレアに関する技術ノート |
| `GEOMETRY_HANDOFF_v0.5.md` | 3D幾何モデルの引き継ぎ資料 |

## 配布物と図版

| ファイル | 用途 |
| --- | --- |
| `../output/presentations/bowling-drill-layout-beginner-course-v3.pptx` | 初心者向け講座スライド。内容は上記注意事項を前提とする |
| `../output/pdf/bowling-drill-layout-beginner-course-handout-v3.pdf` | A4配布用ハンドアウト |
| `../output/pdf/drill-layout-three-factor-beginner-guide-final.pdf` | 3値の説明を中心とした以前の配布資料 |
| `drill-layout-three-factor-guide-a4.png` | 上記資料のA4画像版 |
| `bowling_drill_layout_technical_evidence.pdf` | 技術的根拠を整理した既存PDF |
| `../output/pdf/bowling_flare_physics_technical_note.pdf` | フレア物理の既存技術ノート |

## 再現用スクリプト

- `tools/run_zero_axis_experiment.mjs`
- `tools/run_layout_archetype_experiment.mjs`
- `tools/run_layout_interaction_experiment.mjs`
- `tools/run_real_ball_catalog_validation.mjs`
- `tools/build_zero_axis_workbook.mjs`
- `tools/build_beginner_course_presentation.mjs`
- `tools/build_beginner_course_handout.py`
- `tools/render_layout_interaction_a4.mjs`
- `tools/render_layout_three_factor_pdf.mjs`
- `tools/crop_model_export_images.mjs`
- `tools/upscale_model_export_images.mjs`
- `tools/update_official_ball_specs.py`
- `tools/update_usbc_ball_catalog.py`

関連テスト:

- `tools/test_static_experiment.mjs`
- `tools/test_zero_axis_experiment.mjs`
- `tools/test_layout_interaction_experiment.mjs`
- `tools/test_physics_conventions.mjs`

## 主な一次資料

1. [USBC Equipment Specifications Manual](https://bowl.com/getmedia/7b8b2ee2-cd3a-4fe1-ba31-1389d8fc9bbf/es_manual.pdf)
2. [USBC Ball Motion Study: Phase I and II Final Report](https://images.bowl.com/bowl/media/legacy/uploadedfiles/Equip_and_Specs/Equip_and_Specs_Home/08ballmotionstudy.pdf)
3. [USBC Standard Operating Procedures](https://bowl.com/equipment-specifications2024/standard-operating-procedures)
4. [Maurice Pinel, Updated Dual Angle Guide](https://wiki.maverickbowling.com/wiki/images/a/a5/Updated_Dual_Angle_Guide.pdf)
5. [Storm Pin Buffer Layout Guide](https://www.stormbowling.com/storm-pin-buffer-layout-guide)
6. [Storm Ion Max](https://www.stormbowling.com/storm-ion-max-bowling-ball)
7. [Storm Phaze II technical sheet](https://www.stormbowling.com/medias/Storm_Phaze%20II_tech%20sheet.pdf)
8. [Storm Tropical Surge](https://www.stormbowling.com/storm-tropical-surge-bowling-ball-black-cherry)
9. [Hammer Black Widow 3.0](https://hammerbowling.com/products/black-widow-3-0)
10. [Hammer Effect Tour](https://hammerbowling.com/products/hammer-effect-tour)
11. [Hammer Purple Pearl Urethane](https://hammerbowling.com/collections/mide-performance/products/purple-pearl-urethane)

## 共有対象外

次のファイルは研究成果ではないため、今回の共有コミットには含めていません。

- `tmp/`、`.codex-finalizer/`、`node_modules/`などの一時生成物
- v1、v2などの旧版PPTX・PDF
- アプリ本体の未コミット変更
- 画面確認用の一時スクリーンショット
