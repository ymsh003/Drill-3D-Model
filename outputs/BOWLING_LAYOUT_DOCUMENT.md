> **2026-09-20 監査による訂正：この文書は旧版の記録です。** 現行の理論・指標・再計算結果は [PHYSICS_MODEL_AUDIT.md](PHYSICS_MODEL_AUDIT.md) を参照してください。旧「フレア上限」「使用率」、厳密な一定RG投影、実フレア幅の解釈は採用していません。旧教材PDF・生成スクリプトも当時の成果物であり、現行の検証済み教材ではありません。

# PAP-based drilling layout technical document

The final technical document is provided in both source and rendered form:

- `bowling_drill_layout_technical_evidence.tex`
- `bowling_drill_layout_technical_evidence.pdf`

The LaTeX source is intended for Tectonic 0.17 or later. From the `outputs`
directory, build it with:

```powershell
tectonic .\bowling_drill_layout_technical_evidence.tex
```

The Japanese font is bundled under `fonts/noto-serif-jp` and referenced by a
relative path. Noto Serif Japanese is distributed under the SIL Open Font
License; see `fonts/noto-serif-jp/OFL.txt`.

The PDF committed alongside the source is the visually reviewed rendering.
