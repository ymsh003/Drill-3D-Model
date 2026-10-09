# 2026-09-20 理論監査・修正版

対象の取得時コミット：`215b1f2f2b3cdecb89b8acbbf1e5d2e6c66cd128`。
現行の判定・出典・限界は `outputs/PHYSICS_MODEL_AUDIT.md` を参照してください。

## 変更

- 未ドリル／完成球の中間RG定義とPSA高RG方向を訂正。
- 固有軸を右手系に統一し、穴の位置計算を描画状態から独立化。
- 除去体積を球との交差領域で積分。密度は平均密度の仮定が残る。
- 無外力Euler積分後の一定RG射影、経験的上限、穴から遠ざかる強制方向を撤去。
- 指標U・Kを数学的に定義。旧フレア列は未校正の比較値として互換保存。
- 定量的根拠のない反応速度パーセントを削除。
- 全1,811条件を再計算。旧版の説明資料へ訂正注記を追加。

## 再現

Node.js 24で確認。以下のスクリプトに外部npmパッケージは不要です。

```powershell
node tools/test_model_physics.mjs
node tools/run_zero_axis_experiment.mjs
node tools/run_layout_interaction_experiment.mjs
node tools/run_layout_archetype_experiment.mjs
node tools/run_real_ball_catalog_validation.mjs
node tools/test_experiment_reproducibility.mjs
node tools/test_layout_interaction_experiment.mjs
node tools/test_zero_axis_experiment.mjs
node tools/test_grip_geometry.mjs
```

`test_physics_conventions.mjs` は `test_model_physics.mjs` を実行します。
既存の `test_static_experiment.mjs` は元コミットにない旧インターフェース要素を要求するため失敗します。今回の検証成功は上記のモデル関連テストについてであり、全テスト成功ではありません。

PDF再生成は `python tools/build_audited_guides.py`。Python、reportlab、WindowsのBIZ UDゴシックが必要です。監査報告と初心者向け9ページの実践資料をoutputsに生成します。旧PDF生成スクリプトは旧版教材の記録です。

## 使用範囲

完成球の静的質量特性の近似と、無外力の瞬間的軸診断です。独自指標を実フレア幅・使用率・フック量へ換算しません。カタログ入力の比較は実球の実測検証ではありません。材料密度・実測完成球RGは未校正です。後続改修で重複穴の体積和集合と実測質量を持つ挿入部材を実装しました。現行仕様は MODEL_MASS_EXTENSION.md を参照してください。

`pap_inertia_lb_in2` は重心を通るPAP方向の軸の慣性です。球の幾何中心を通る軸の慣性とは区別します。

最新版の共有資料は docs/reassessment/README.md を参照してください。

## 教材改訂2

3値から候補を決める実践手順に更新。説明用基準45×4×45からの変更、PIN-PAPの選択帯、症状別の判断、角度の合計と配分、対称球・サムレスの分岐、設計記録を収録。反応方向はメーカー経験則、15度刻み等は教材の比較案として明示。モデルの未校正指標から推奨値を算出していません。

## 教材改訂3

日本語のボウリング解説（みなみの島ボウリングガーデン、サンブリッジ）を参照し、曲がり始め・走り・バックエンドのキレ・アーク状の曲がりを使った自然な表現に改訂。用語集と相談例を追加し、長さの端数を帯分数（3 1/2″など）に統一しました。日本語資料は用語・表現の参考とし、理論の根拠と区別しています。物理モデル・計算データの変更はありません。

