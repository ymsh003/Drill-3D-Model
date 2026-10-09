# ドリルレイアウト：理論検証と説明資料

最新版は [資料一覧](docs/reassessment/README.md) からご覧ください。

- [論文形式の技術資料（24ページ）](docs/reassessment/dual-angle-technical-paper-reassessed.pdf)
- [お客様への説明用プレゼン（23枚・PDF）](docs/reassessment/dual-angle-consultation-reproposal.pdf)
- [編集用PowerPoint](docs/reassessment/dual-angle-consultation-reproposal-final.pptx)

デュアルアングルの3値、VAL角、非対称コアの基準点、条件を固定した比較、測定誤差とモデルの限界を整理しています。数式はTeXで組版し、日本語フォントを確認済みです。

## モデルと検証

[質量モデルの拡張](MODEL_MASS_EXTENSION.md) ／ [理論監査](outputs/PHYSICS_MODEL_AUDIT.md)

穴の重なりを含む除去体積、初期重心、実測質量を持つ挿入部材を扱います。独自指標は未校正の比較指標であり、実際のフック量やフレア幅の予測値ではありません。

モデル関連テストと1,811条件の再現性検証を実施済みです。既存の test_static_experiment.mjs は旧UI依存のため未解決であり、全テスト成功を意味しません。実球による走行・反応の検証は未実施です。
