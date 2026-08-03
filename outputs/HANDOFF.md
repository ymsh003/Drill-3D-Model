# Drill 3D Model Handoff

Last updated: 2026-07-29

This document is the handoff record for the bowling-ball drilling 3D prototype. It is written for the next agent/developer who must continue without relying on prior chat context.

The current implementation is not in a clean finished state. The user is dissatisfied with recent UI changes around pitch/stepper controls. Treat the current UI as a work in progress and verify every visual change in the browser before saying it is fixed.

## 2026-07-29 Card Consistency And Readability Pass

Repairs applied after the user reported inconsistent card interiors, excessive dead space, small typography, and measure-sheet values spilling out visually:

- Added a final CSS consistency layer for cards.
  - Reason: older section-specific rules used different padding, heading sizes, field gaps, and control heights. This made adjacent cards feel unrelated and wasted vertical space.
  - Change: normalized `.section` / `.sheet-card` padding, heading scale, inner field spacing, label size, and control height while keeping the existing section colors and structure.
- Raised the working typography scale.
  - Reason: 12px field text was too small for repeated work and especially poor on small screens.
  - Change: card field text is now generally 14px on desktop and 15px on mobile; inputs/buttons are 15px desktop and 16px mobile; body line-height is stabilized for Japanese text.
- Reworked measure-sheet diagram labels.
  - Reason: the values fit mathematically in many cases, but visually collided with the drawing frame/bracket lines and were too fragile for longer fractions.
  - Change: the diagram now uses container-based label sizing, wider value boxes, subtle dark label backgrounds, and a larger max diagram width while preserving the 1100:760 aspect ratio.
- Preserved 3D model priority.
  - Reason: the previous measure-sheet enlargement risked shrinking the model again.
  - Change: the right workspace uses a 500px minimum model row and lets the measure-sheet row size to its content below it.
- Fixed narrow-card stepper overflow.
  - Reason: larger touch targets made the three-column drill-layout steppers exceed their small cards.
  - Change: only narrow drill-layout cards use compact 34px buttons; pitch/depth controls retain larger touch-friendly columns.
- Fixed mobile-only overflow in span and catalog inputs.
  - Reason: span controls and catalog RG inputs were still forced into multi-column layouts too narrow for touch controls.
  - Change: small screens stack span controls, physical comparison rows, catalog weight inputs, and RG inputs into one column.

Verification performed in headless Chrome:

- Desktop 1440x900:
  - no JavaScript errors.
  - document/body horizontal scroll stayed at 1440px.
  - 3D viewer measured about 722x500.
  - measure sheet measured about 460x318.
  - no visible horizontal overflow candidates.
  - no measure-sheet value boxes were clipped or outside the diagram.
- Mobile 390x844:
  - document/body horizontal scroll stayed at 390px.
  - 3D viewer measured about 368x500.
  - measure sheet measured about 348x240.
  - no visible horizontal overflow candidates.
  - no measure-sheet value boxes were clipped or outside the diagram.

## 2026-07-29 Follow-Up Correction: Labels, Card Widths, And Small Text

The previous readability pass still failed the user's actual visual expectation. The user pointed out four concrete problems: pitch rows had no small headings, span controls had poor left/right balance and excessive dead space, thumb solid controls were half-width with an empty right side, and top/bottom weight contained tiny helper labels and unused space.

Repairs applied:

- Generated steppers now create a `.range-adjust-block` with a visible `.range-adjust-title`.
  - Reason: depth, lateral pitch, and vertical pitch were visually identical rows, so users could not tell which number they were editing.
  - Change: range controls now show labels such as `深さ`, `左右ピッチ`, `前後ピッチ`, `メインスパン`, `薬指 +/-`, `ドリル角`, `PIN-PAP`, and `VAL角`.
- Span controls now fill their card columns.
  - Reason: the previous controls were centered in small max-width islands, creating uneven left/right balance and wasted space.
  - Change: each span control is a full-width sub-card, with the generated stepper stretched to its column.
- Thumb solid selection now uses the full card width.
  - Reason: a single control inside a two-column material grid left an empty right half.
  - Change: `#thumbSettingsSection .material-grid` is forced to one full-width column.
- Top/bottom weight card now uses balanced input columns and a full-width result row.
  - Reason: `方向` and `oz` helper labels were too small and the result floated in dead space.
  - Change: helper labels are at least 12px, inputs align to the card width, and the derived value is framed as a full-width readout.
- Removed remaining sub-12px readable UI text.
  - Reason: after the first pass, 10px/11px text remained in profile notes, meat-wall outputs, modeling subheads, SVG labels, and physical comparison deltas.
  - Change: final overrides raise those readable labels to 12px or higher.

Verification performed in headless Chrome after this correction:

- Desktop 1440x900:
  - no JavaScript syntax errors or page errors.
  - no document/body horizontal overflow.
  - no visible horizontal overflow candidates.
  - no visible readable UI text below 12px.
  - first three pitch cards expose `深さ`, `左右ピッチ`, and `前後ピッチ`.
  - measure-sheet values remain unclipped and inside the diagram.
- Mobile 390x844:
  - no JavaScript syntax errors or page errors.
  - no document/body horizontal overflow.
  - no visible horizontal overflow candidates.
  - no visible readable UI text below 12px.
  - span controls stack into full-width mobile rows.
  - measure-sheet values remain unclipped and inside the diagram.

## 2026-07-29 Final Readability Correction

The previous fix still exposed duplicate `深さ` labels and internal English IDs such as `thumbDiameter` / `layoutPinPap`. It also left mobile generated inputs at 16px because a stronger mobile CSS rule overrode the intended font size.

Repairs applied:

- Removed duplicate depth labeling by hiding the old `.depth-panel-label` once generated row titles are present.
- Added explicit Japanese titles for range IDs, including `サム内径`, `PIN-PAP`, `PAP左右`, `PAP上下`, and stamp/core-related controls.
- Added a final type floor at the end of the stylesheet:
  - generated row titles: 17px
  - helper/readout text: 14px or larger
  - inputs/selects/buttons: 18px
- Added stronger selectors for `.range-adjust-control > .range-adjust-input` so mobile rules cannot shrink generated inputs back to 16px.
- Raised the zoom HUD and modeling subsection headings.

Verification performed in headless Chrome:

- Desktop 1440x900 and mobile 390x844 both reported:
  - no JavaScript syntax errors or page errors.
  - no horizontal overflow.
  - no visible internal ID strings such as `thumbDiameter` or `layoutPinPap`.
  - no duplicate `深さ` label in the first pitch depth control; visible labels are `深さ`, `左右ピッチ`, `前後ピッチ`.
  - no readable text below the new checked floor.
  - no generated input below 18px.

## 2026-07-28 High-Risk UI Repair Pass

Repairs applied after a whole-UI risk audit:

- Fixed sticky section CSS precedence.
  - Reason: `.data-section` and `.measure-section` declared `position: sticky`, but the later `.section, .sheet-card { position: relative; }` rule overrode them. Browser measurement showed both sections computed as `position: relative`, so the requested sticky behavior was not actually active.
  - Change: added more specific `.section.data-section` and `.section.measure-section` rules after the shared `.section` positioning rule.
- Expanded pitch stepper value fields.
  - Reason: pitch `+/-` buttons did change values internally by `1/16"`, but `フォワード 1/16"` was clipped in a 74px field. This made the control appear broken to the user.
  - Change: removed the pitch-specific 74px middle-column constraint and made pitch steppers stretch with `minmax(9.5rem, 1fr)`. Depth steppers keep their compact width because their labels are short.
- Stopped hidden bridge UI option generation.
  - Reason: bridge editing was intentionally removed from visible UI, but the hidden `#bridgeSelect` still generated many options inside a hidden control. This kept an obsolete control alive and increased the chance of a future CSS change exposing it again.
  - Change: `.bridge-gauge-control .bridge-list-card` is explicitly hidden, and `setupBridgeSelect()` exits without generating options when the bridge control is hidden.
- Added a first narrow-viewport escape layout.
  - Reason: the app was hard-fixed to 1440px wide and 900px high, causing controls to disappear offscreen on narrow/mobile viewports.
  - Change: default body/app minimum width was relaxed, and a `max-width: 1200px` media rule stacks the control and viewer workspaces vertically instead of forcing the desktop two-column grid.

Verification required after any follow-up edits:

1. Open `outputs/bowling-drill-3d-prototype.html` in a browser.
2. Scroll the left pane and confirm `個人情報・保存データ` sticks at the top and `メジャーシート情報` sticks below it.
3. Scroll to pitch controls, click `+`, and confirm `フォワード 1/16"` or equivalent labels are fully visible.
4. Confirm no bridge select/control is visible.
5. Check at least one narrow viewport around 390px wide and confirm controls are reachable without clipped action buttons.

Verification performed in headless Chrome after this repair pass:

- Desktop 1440x900:
  - no page JavaScript errors were reported.
  - `.data-section` computed as `position: sticky; top: 0px`.
  - `.measure-section` computed as `position: sticky; top: 204px`.
  - after scrolling the left pane, both sticky sections stayed at the expected y positions.
  - clicking `middleVerticalAxis +` changed the hidden range to `0.0625` and displayed `フォワード 1/16"` without clipping (`clientWidth 197`, `scrollWidth 197`).
  - hidden `#bridgeSelect` generated `0` options and `.bridge-gauge-control` remained invisible.
- Narrow viewport 390x844:
  - document client width stayed `390`.
  - body scroll width stayed `390`.
  - `.app` stacked into a single 390px-wide column instead of forcing the old 1440px desktop grid.

## 2026-07-28 Measure Review And Mobile Usability Pass

The user reported that the sticky measure sheet was still hard to use. The direction changed from making the large left-side measure sheet follow the scroll to keeping a compact, always-visible review panel near the 3D viewer.

Repairs applied:

- Disabled sticky behavior for the large `メジャーシート情報` section.
  - Reason: the large sheet consumed too much left-pane working space while editing detailed hole settings.
  - Change: `.measure-section` now remains in normal scroll flow. `個人情報・保存データ` remains sticky.
- Added right-side `メジャーシート確認`.
  - Reason: detailed edits are easier when the current measure values are visible near the 3D preview.
  - Change: a compact live summary panel was inserted between the viewer and right-side modeling controls. It renders current finger sizes, span, thumb, PAP, pitch, and layout values from the same input state used by `draw()`.
- Unified depth controls with pitch-style steppers.
  - Reason: depth controls visually differed from pitch controls because they still carried old gauge sizing.
  - Change: depth steppers now use the same full-row `- / value / +` structure and 44px targets as pitch steppers.
- Improved mobile readability and touch sizing.
  - Reason: many controls used 9-12px text and small hit targets, which is unsuitable for phone use.
  - Change: common inputs/buttons now use at least 44px targets on desktop and 48px on narrow screens; narrow-screen input text is forced to 16px.

Verification performed:

- Desktop 1440x900:
  - no JavaScript page errors.
  - `メジャーシート情報` computed as `position: relative` and scrolls away normally.
  - `メジャーシート確認` displayed 8 live summary items with no hidden items.
  - depth and pitch steppers were both 44px tall, and depth value input expanded to 177px without clipping.
  - drill layout steppers did not overflow their cards.
- Mobile 390x844:
  - body scroll width stayed `390`.
  - visible stepper buttons measured 48px square.
  - visible stepper input measured 48px high with 16px text.

## 2026-07-28 Correction: Use The Actual Measure Sheet Diagram

The previous pass misunderstood the user's intent. The user did not want a separate summarized review panel; they wanted the existing diagram-style `メジャーシート情報` itself to remain visible while editing details.

Corrections applied:

- Removed the separate `メジャーシート確認` summary panel.
  - Reason: it duplicated information and did not satisfy the request to keep the actual measure sheet diagram visible.
- Moved the existing `メジャーシート情報` section from the left `aside` into the right workspace, directly under the 3D viewer.
  - Reason: the same diagram and live field positions are now always visible near the 3D model while the left pane is used for detailed editing.
  - Important: the existing DOM was moved, not duplicated, so IDs such as `#measureDiagram`, `#middleSpanValue`, and pitch token elements remain unique.
- Kept the large measure sheet diagram in normal flow on the right side.
  - Reason: the left pane should stay focused on input details, while the right side carries visual feedback.
- Fixed the drill layout stepper overflow introduced by larger touch targets.
  - Reason: the `ドリル角`, `PIN-PAP`, and `VAL角` cards are narrow. The previous 44px-wide general stepper sizing made the `+` button protrude from its card.
  - Change: drill-layout card steppers use a compact local rule while pitch/depth controls keep larger touch targets.

Verification performed:

- Desktop 1440x900:
  - no JavaScript page errors.
  - no old left-side `aside > .measure-section` remained.
  - exactly one `#measureDiagram` existed.
  - the right-side measure diagram rendered under the 3D viewer.
  - the obsolete `.measure-live-panel` no longer existed.
  - drill layout steppers had `0` overflow cases.
- Mobile 390x844:
  - body scroll width stayed `390`.
  - the moved measure diagram remained within the viewport width.
  - visible stepper button target remained 48px square.

## 2026-07-28 Measure Diagram Fit And Viewer Priority Fix

The user reported that the moved measure sheet diagram was visually broken and that the 3D model became too small to be useful. The user also asked why the personal information section was sticky.

Corrections applied:

- Restored the 3D viewer as the visual priority on the right side.
  - Reason: the drilling model is the primary visual feedback and became too small after adding the measure sheet row.
  - Change: right workspace rows now reserve a larger viewer area (`minmax(500px, 58vh)`) and allow the right workspace to scroll for lower panels.
- Fixed the measure sheet diagram aspect ratio and fit.
  - Reason: forcing the diagram into a short wide row distorted the absolute-positioned sheet fields.
  - Change: the right-side measure diagram keeps its original `1100 / 760` aspect ratio and is capped at `420px` width so it fits inside the visible card without clipping.
- Disabled personal information sticky behavior.
  - Reason: the sticky behavior was introduced during the earlier request to make `個人情報` and `メジャーシート` follow while scrolling, but the working UI now needs left-side space for detailed inputs more than a persistent personal-data header.
  - Change: `.data-section` and `.section.data-section` now use normal `position: relative`.

Verification performed:

- Desktop 1440x900:
  - no page JavaScript errors.
  - 3D viewer measured about `722 x 506`.
  - right-side measure diagram measured about `420 x 290`.
  - measure diagram aspect ratio measured `1.447`, matching `1100 / 760`.
  - measure diagram did not overflow its card.
  - personal information section computed as `position: relative` and scrolled away normally.

## Repository And Files

- Main local workspace:
  - `C:\Users\syo03\Documents\Codex\2026-06-30\new-chat`
- Browser-opened deliverable:
  - `C:\Users\syo03\Documents\Codex\2026-06-30\new-chat\outputs\bowling-drill-3d-prototype.html`
- Git working copy used for sharing:
  - `C:\Users\syo03\Documents\Codex\2026-06-30\new-chat\work\push-repo`
- Git-copy deliverable:
  - `C:\Users\syo03\Documents\Codex\2026-06-30\new-chat\work\push-repo\outputs\bowling-drill-3d-prototype.html`
- Existing project notes:
  - `C:\Users\syo03\Documents\Codex\2026-06-30\new-chat\outputs\PROJECT_NOTES.md`
- This handoff:
  - `C:\Users\syo03\Documents\Codex\2026-06-30\new-chat\outputs\HANDOFF.md`

The HTML is a single-file app. There is no build step and no external dependency. The user usually opens it directly as:

```text
file:///C:/Users/syo03/Documents/Codex/2026-06-30/new-chat/outputs/bowling-drill-3d-prototype.html
```

When changing the app, copy the edited output HTML to the Git working copy:

```text
outputs/bowling-drill-3d-prototype.html
work/push-repo/outputs/bowling-drill-3d-prototype.html
```

## Git State And Sharing

Known repository:

```text
https://github.com/ymsh003/Drill-3D-Model.git
```

The local Git branch in `work/push-repo` is historically `master` tracking/pushing to `origin/main`. Previous pushes were done manually by the user because this environment often cannot connect to GitHub.

Known recent local HEAD before this handoff work:

```text
b426a96 Fix finger pitch trajectory direction
```

Current uncommitted work at handoff creation included:

- `outputs/PROJECT_NOTES.md`
- `outputs/bowling-drill-3d-prototype.html`

After this file is copied into `work/push-repo/outputs/HANDOFF.md`, commit and push from:

```powershell
cd C:\Users\syo03\Documents\Codex\2026-06-30\new-chat\work\push-repo
git status
git add outputs/bowling-drill-3d-prototype.html outputs/PROJECT_NOTES.md outputs/HANDOFF.md
git commit -m "Add detailed handoff notes"
git push origin HEAD:main
```

If Git reports dubious ownership, run:

```powershell
git config --global --add safe.directory C:/Users/syo03/Documents/Codex/2026-06-30/new-chat/work/push-repo
```

If this Codex environment cannot push because network access is blocked, tell the user exactly which command to run. Do not imply that GitHub is updated unless a push result is confirmed.

## Product Goal

The final product is intended to be an integrated bowling-ball management and drilling-planning application.

The app should eventually manage:

- person profiles
- saved measure sheets
- PAP data
- owned bowling balls
- each ball's catalog and physical metadata
- core model and surface marks
- drill layout records attached to each ball
- 3D drilling previews for each layout
- future shelf-app integration with `ymsh003/ball-shelf-project`

The primary business object is not a standalone drill layout. The intended hierarchy is:

```text
Person
  -> Measure sheets
  -> Ball records
       -> catalog/core metadata
       -> surface marks: PIN, CG, MB/vMB
       -> drill layout records
       -> drilling/usage history
```

The user repeatedly emphasized that the main axis of the application is the measure sheet. Drill layout and ball modeling are important, but they must support the measure sheet and ball-management flow.

## Current UI Organization

The current intended section organization is:

Left side:

1. `個人情報・保存データ`
2. `メジャーシート情報`
3. `メジャーシート詳細`
4. `個人PAP・回転軸情報`

Right side:

1. 3D model viewer
2. `ドリルレイアウト`
3. `ボールモデリング情報`

The right side should keep ball modeling information near the 3D model. The ball modeling section contains:

- core model selection
- core envelope radius
- top/bottom weight
- surface stamp relationships
- physical input and post-drill comparison

The `レイアウト寄与` display was removed from visible UI because the user found it unclear. The function may still exist in JavaScript, but there should be no visible `レイアウト寄与` block until its physical meaning is reviewed.

## Current Known UI Problems

These are active problems. Do not claim they are fixed until verified visually.

### Pitch stepper layout

Recent work changed indicator/range controls into `- / text input / +` steppers. The user reports:

- `+/-` buttons appeared not to change values.
- Some values changed internally but were visually rounded, so changes were not visible.
- Pitch must be `1/16"` increments, not `1/64"`.
- Small helper text under controls is unwanted.
- Old small numeric labels from hidden range/output elements were still visible.
- Pitch value text such as `フォワード 1/4"` was clipped even though there was unused horizontal space.

Recent attempted fixes:

- `rangeListStep(range)` now returns:
  - `1` for `layoutDrillAngle` and `layoutValAngle`
  - `1/16` for `range.id.endsWith("Axis")`
  - `1/64` for other range-derived length controls
- `setRangeValue()` now sets `range.step = String(step)` before assigning `range.value`.
- `updateRangeListForRange(range, true)` is used to force visible text update.
- CSS at the end of `<style>` attempts to hide:
  - `.pitch-axis > output.pitch-readout`
  - `.pitch-axis .axis-label`
  - `.pitch-axis .indicator-scale`
  - `.range-adjust-meta`
- CSS attempts to expand pitch controls:
  - `.pitch-axis .range-adjust-control { grid-template-columns: 34px minmax(0, 1fr) 34px !important; width: 100% !important; }`

However, the user still reported that the visible clipping was not fixed. The next developer must inspect with the browser and repair the actual computed CSS/layout, not just edit text.

Likely root causes to inspect:

- multiple CSS rules for `.pitch-axis .range-adjust-control` and `.depth-panel .range-adjust-control`
- later rules overriding earlier rules
- container widths inside `.pitch-pad`, `.pitch-grid`, `.finger-column`, `.sheet-two-column`
- generated stepper inserted after an `output`, possibly in a grid where it inherits unexpected row/column behavior
- file reload/cache confusion in the browser

### Sticky sections

The user asked that `個人情報` and `メジャーシート` sections follow while scrolling.

Current attempted implementation:

- `.data-section` is `position: sticky; top: 0; z-index: 40`
- `.measure-section` is `position: sticky; top: var(--measure-sticky-top, 154px); z-index: 39`
- `updateStickySectionOffsets()` measures `.data-section` height and sets `--measure-sticky-top`
- ResizeObserver watches `.data-section`

This must be visually verified. Sticky behavior can fail if the parent scroll container or stacking context changes. The scroll container is `aside`.

### Bridge duplicate controls

The user wanted a mysterious remaining bridge control removed. There were multiple bridge-related UI remnants:

- measure diagram field: `#bridgeValue`
- hidden range: `#bridge`
- old bridge select: `#bridgeSelect`
- generated stepper from `#bridge`
- bridge gauge control container: `.bridge-gauge-control`

Current intended state:

- Do not auto-generate a stepper for `range.id === "bridge"`.
- `.bridge-gauge-control` is hidden.
- `.bridge-list-card` is hidden.
- `.measure-diagram .field-bridge` is hidden.
- Main span and ring span offset must remain visible and operable.

Be careful: one previous attempt hid `.field-main-span` and `.field-offset-span`, which removed needed values. Do not hide those.

## Domain Definitions That Must Not Drift

These definitions are important. The user became frustrated when they were violated.

### Ball size

The ball diameter is fixed to the regulation maximum:

```text
BALL_DIAMETER = 8.595 inches
```

Regulation range recorded:

- circumference: `26.704"` to `27.002"`
- diameter: `8.500"` to `8.595"`

### Grip center

The early prototype used a temporary grip center. Later, Dual Angle layout was added to calculate a grip center from surface layout geometry.

The grip center is the origin for measure-sheet hole placement:

- centerline through GC
- finger holes above GC
- thumb below GC

### Span

Span is edge-to-edge:

- thumb-hole inner endpoint to the corresponding finger-grip outer-diameter endpoint
- not center-to-center
- not arbitrary visual distance

For example, if a span is `4"`, the relevant endpoint distance must be exactly `4"` in the model's layout plane/surface definition.

### Bridge

Bridge is the gap between the two finger holes measured between outer-diameter drilled openings for the finger grips.

Important:

- It is not grip inner diameter.
- It is not centerline distance.
- It is the shortest distance between facing outer endpoints/opening boundaries.
- Finger openings must remain separated by exactly the selected bridge value.

### Pitch

Pitch definitions:

- `0 pitch` means drilling toward the sphere center.
- Side pitch:
  - right side is `ライト/右`
  - left side is `レフト/左`
- Vertical pitch:
  - forward is `フォワード`
  - reverse is `リバース`
- User now wants no vague `左右 0` or `前後 0` display. Zero should be `0`.
- Machine practical pitch increment is `1/16"`, not `1/64"`.
- This applies to pitch axes:
  - `middleLateralAxis`
  - `middleVerticalAxis`
  - `ringLateralAxis`
  - `ringVerticalAxis`
  - `thumbLateralAxis`
  - `thumbVerticalAxis`

Finger pitch geometry signs were corrected multiple times. Current code must be reviewed before changing:

```js
middle/ring:
  lateral: -pitchAxisValue("...VerticalAxis")
  vertical: -pitchAxisValue("...LateralAxis")
  verticalDisplay: pitchAxisValue("...VerticalAxis")

thumb:
  lateral: pitchAxisValue("thumbVerticalAxis")
  vertical: -pitchAxisValue("thumbLateralAxis")
  verticalDisplay: pitchAxisValue("thumbVerticalAxis")
```

Do not change these signs casually. If pitch looks wrong, compare the actual drill axis geometry, not only UI labels.

## Dual Angle Layout Geometry

The user defined the expected Dual Angle logic explicitly:

1. PIN, CG, and MB are arranged top to bottom according to the ball/core model.
2. Draw the PIN-MB line.
3. Use PIN-MB as the baseline.
4. With PIN above and MB below, define the bowler handed side:
   - right-handed: right side of PIN-MB is positive
   - left-handed: left side is positive
5. Draw the drill angle from PIN toward the handed side.
6. On the drill-angle line, mark PIN-PAP distance from PIN. That point is PAP.
7. From PAP, draw VAL angle from the drill-angle line toward handed side.
8. PAP is expressed relative to GC, for example `5 -> x 1 up`.
9. Inverse from PAP to GC:
   - if PAP is `right 5"` and `up 1"` from GC,
   - GC is `left 5"` and `down 1"` from PAP along the VAL coordinate basis.
10. Use GC as origin for the measure sheet holes.

Earlier bugs included:

- VAL angle sign reversed.
- PIN and MB accidentally swapped.
- PAP up/down behavior flipped around zero.
- GC direction inconsistent.

Current Dual Angle drawing was eventually accepted as "まともになった" before later UI work. Treat that code as sensitive.

## Ball/Core Modeling

Current modeling is approximate.

Implemented concepts:

- core type select:
  - asymmetric / MB
  - symmetric / vMB
- core envelope radius select
- top/bottom weight input
- surface stamp distances:
  - PIN-MB surface distance
  - PIN-CG surface distance
  - CG offset
- derived core metadata output
- physical comparison:
  - total weight before/after
  - PAP-NAP RG before/after
  - PAP-NAP axis inertia before/after

The user wants core data to eventually be administrator-controlled internal metadata attached to each ball record, not freely edited by ordinary users. For now, editable inputs are acceptable for model validation.

Current core geometry is only a rough visual/physics approximation. The user pointed out that real cores can be large and may be contacted by drill bits after about `1"` of depth. Do not treat the current core model as physically validated.

## Drill Trajectory And Hole Geometry

The user wants the drilled hole geometry represented as:

- circular/elliptical surface opening according to drill angle and sphere intersection
- interior cylinder
- conical drill point at the end
- no twist/flute decoration
- no arbitrary colored middle circles

Important visual rule:

- Surface opening and internal cylinder diameter must match. The user previously complained when the surface opening and internal body looked different.

Angle visualization:

- User requested center-origin line segments and a visible arc showing angle between thumb and each finger hole.
- Labels should indicate which angle is being shown.

Bridge/tangent lines:

- Lines marking endpoints must be drawn on the ball surface/curvature, not as flat lines cutting through the ball.
- The user strongly rejected lines that appeared to pass under or through the ball.

## Current Code Structure

Everything is in `outputs/bowling-drill-3d-prototype.html`.

Important constants:

- `BALL_DIAMETER`
- `THUMB_SOLID_LENGTH`
- `FINGER_GRIP_LENGTH`
- `TIP_FLAT_THICKNESS`
- `SEMI_BUMP_DEPTH`
- `GRIP_SHAPE_PRESETS`

Important helper functions:

- `formatInch(number)`
  - renders `1/64"` fraction-style values
- `formatInch32(number)`
  - renders `1/32"` style values
  - should not be used for pitch stepper display
- `parseInch(text)`
  - parses fraction input such as `1 1/2"` and signed values
- `snapToStep(number, step)`
- `clamp(number, min, max)`
- `rangeListStep(range)`
  - currently controls stepper increment
  - name is historical; it now drives direct steppers, not lists
- `rangeListLabel(range, value)`
  - current visible stepper value label
- `setupRangeListControls()`
  - historical name
  - currently generates direct `- / input / +` controls
- `setRangeValue(range, rawValue, shouldDraw)`
  - central setter for hidden range value, visible control text, and draw refresh
- `updateRangeListForRange(range, force)`
  - historical name
  - updates generated text input value
- `layout()`
  - computes current hole/layout data
- `draw()`
  - top-level canvas redraw
- `calculateDualAngleLayout()`
- `calculatePhysicalModel(data)`
- `findCoreContacts(data)`
- `renderPhysicalModelOutput(data)`
- `updateStickySectionOffsets()`

Naming problem:

- Several functions still say `RangeList` even though the UI is no longer list based. This is a technical debt and a source of confusion.

## Current Generated Stepper Design

Recent implementation turns hidden `input[type=range]` controls into generated steppers.

The generated DOM roughly is:

```html
<div class="range-adjust-control" data-range-adjust="middleVerticalAxis">
  <button class="range-adjust-button">-</button>
  <input class="range-adjust-input" data-range-adjust-input="middleVerticalAxis">
  <button class="range-adjust-button">+</button>
</div>
<div class="range-adjust-meta">...</div>
```

But `.range-adjust-meta` is now supposed to be hidden.

Do not generate a stepper for `bridge`.

The stepper input should display:

- pitch zero: `0`
- side pitch: `右 1/16"` or `左 1/16"`
- vertical pitch: `フォワード 1/16"` or `リバース 1/16"`
- depth/span etc: `1 1/2"` style
- angles: `+45°`, `-30°`, etc.

Current unresolved UI issue:

- The input field may still clip long Japanese labels despite CSS attempts.
- Verify computed layout and adjust actual container rules.

## Persistence

Profile persistence uses browser `localStorage`.

Storage key:

```js
STORAGE_KEY = "bowling-drill-layout-profiles-v1"
```

Existing profile UI ids:

- `profileSearch`
- `profileResults`
- `profileList`
- `newProfile`
- `deleteProfile`
- `profileEditor`
- `familyName`
- `givenName`
- `saveProfile`
- `changeSummary`
- `changeReason`

Current persistence is still prototype-grade. Future structure should separate:

- person data
- measure sheet records
- ball records
- layout records attached to ball records

## Practical User Expectations

The user is a domain expert and expects precise bowling-drilling terminology. Do not loosely rename concepts.

Important expectations:

- Use inch fraction values, not decimals.
- Pitch uses `1/16"` increments.
- Field values should not be duplicated in multiple places unless the duplicate has a clear purpose.
- If a value is directly visible in the official input, do not show extra small helper values below it.
- Do not claim a UI issue is fixed without verifying the browser view.
- If unable to verify due browser policy/tooling, say exactly that and avoid overstating.
- Keep measure sheet as the main application axis.
- Ball/core modeling should be attached to the 3D model/right-side modeling context.

## Immediate Next Tasks For The Next Agent

1. Reload the browser and visually inspect the pitch steppers.
2. Confirm whether `フォワード 1/16"` and `リバース 1/16"` fit inside the input field.
3. If clipped:
   - inspect computed CSS for `.pitch-axis`, `.range-adjust-control`, `.range-adjust-input`, `.pitch-pad`, `.finger-column`
   - remove any width constraints causing the field to stay narrow
   - consider using a shorter display label only if the user agrees; do not silently change terminology
4. Confirm `+/-` changes pitch by exactly `1/16"`.
5. Confirm other length steppers still use the correct increment:
   - span/PAP/PIN-PAP/depth may use `1/64"` unless domain-specific exceptions are identified
   - pitch must not use `1/64"`
6. Confirm sticky behavior:
   - `個人情報・保存データ` sticks at top of left scroll
   - `メジャーシート情報` sticks below it
   - sticky sections do not cover required controls in an unusable way
7. Clean up historical names:
   - rename `setupRangeListControls`, `rangeListLabel`, etc. only after behavior is stable
8. Commit and push the final fixed state.

## How To Verify

Minimum verification before responding:

1. Syntax check inline scripts from the HTML.
2. Copy output HTML to repo HTML.
3. Open or reload the browser page.
4. Inspect the visible UI, not only source code.
5. Test a pitch `+` button:
   - `0` -> `フォワード 1/16"` or `右 1/16"` depending control
   - another click -> `1/8"`
6. Test a pitch `-` button:
   - should move in the opposite direction by `1/16"`
7. Confirm no helper text under stepper controls.
8. Confirm no old small output labels under pitch/depth rows.

## Important Warning To Future Agents

The recent failure pattern was repeatedly editing CSS/source and claiming completion without browser-visible confirmation. Do not repeat this. The user is explicitly checking the actual screen.

If a fix cannot be visually verified from this environment, report that limitation plainly and give exact files changed and exact expected visible result.

## 2026-07-31 Current State

- `outputs/bowling-drill-3d-prototype.html` now integrates `メジャーシート詳細` inside `メジャーシート情報`; it is no longer a separate left-side card.
- The measure diagram values are read-only display values. Editing happens through the existing detailed input style inside the same measure sheet section.
- Bridge input has been restored in the integrated controls, and the diagram readout follows the updated bridge value.
- The right workspace no longer reserves a row for the measure sheet, so the 3D viewer gets the main right-side space again.
- Verified with Playwright/Chrome at 1440x920 and 390x844. Stepper tests: main span `4"` to `4 1/64"` updated the diagram; bridge `1/4"` to `17/64"` updated the diagram.
- The measure diagram now shows direct `- / value / +` controls at the visible measurement positions. These controls drive the existing range/select inputs; they are not raw contenteditable text fields.
- The visible lower `メジャーシート詳細` panel is hidden and replaced by `#measureSheetIntegratedEditor` inside `メジャーシート情報`.
- The integrated editor includes grip shape selects for both fingers plus the detailed measurement controls. Reverify any future edits against both diagram controls and editor controls to avoid duplicate event handlers.
- Current visible behavior: `#measureSheetIntegratedEditor` is also hidden. The measure diagram is the only visible measurement entry surface, with `- / value / +` controls and middle/ring grip-shape selects placed directly on it.
- The measure diagram now includes grip-shape model previews above the finger grip-size controls and pitch summary chips for middle/ring/thumb. Keep overlap verification for both desktop and mobile before responding to future UI edits.
- Thumb-specific state: `thumbDiameterValue` is a circular vertical control with `+` above, value centered, and `-` below. `thumbSolidValue` must remain outside that circle as a rectangular separate field labeled `サムソリッド外径`.
- Finger-specific state: `middleDiameterValue` and `ringDiameterValue` are circular vertical controls, but they intentionally drive `middleGripOuter` and `ringGripOuter`. They must step through the existing finger outer-diameter options only: `7/8"`, `31/32"`, `63/64"`, `1 1/32"`. Do not remap these controls back to bare diameter.
- Rectangular measure controls now use foreground bracket-style parts: finger grip size, bridge, span, ring span offset, and thumb solid outer diameter. The old SVG bracket paths in the first measure-diagram SVG group were removed. Plus/minus buttons have colored backgrounds and the foreground controls are the only bracket frames that should remain visible.
- Current spacing state: the measure diagram is intentionally taller (`620px` desktop, `820px` under 900px width) to keep the measurement surface from feeling cramped. Bracket controls reserve about 20px from bracket to button and 6px between button and value. Middle/ring grip-size and span controls are pushed outward at 23%/77% so wide bracket controls do not collide on mobile.
- Pitch state: the old passive SVG cross paths and old pitch-token/chip summaries are hidden/removed from the visible measure diagram. The active controls are `.measure-pitch-control` elements for middle/ring/thumb. They use four plus-only directions: left/right update the lateral axis, top/bottom update the vertical axis. Opposite-direction clicks step the signed range back through zero, so left/right or top/bottom values never coexist.
- Current rectangular-control visual state: grip size, bridge, span, ring span offset, and thumb solid now use segmented panels, not bracket-only outlines. The center `.measure-sheet-value` is a light value panel with dark text and top/bottom separators; left/right buttons are dark gray panels. Pitch value labels are positioned away from plus buttons. Current verified measure diagram height is 700px desktop and 940px under 900px width.
- Correction to rectangular-control visual state: do not use literal white/gray reference colors. The segmented controls now use dark teal panels, cyan separators, and white text to match the surrounding app. Under 900px width, segmented controls are 158px wide and centered at 25%/75% for paired controls so they remain inside the measure diagram frame.
- Latest overlap fix: verify visible child elements, not only parent control boxes. The prior weak check missed collisions between pitch value labels and plus buttons. Current pitch controls keep buttons inside the control area and use compact active value labels placed between the cross center and the button. Current verification at 1280px and 390px checks: no measure controls outside `#measureDiagram`, no parent-control overlaps, no active pitch value/button overlaps, and no segmented-control internal overlaps.
- Latest pitch readability fix: do not move horizontal pitch values to the opposite side of the cross just to avoid overlap. The value must appear between the active direction's plus button and the cross center. Current CSS widens `.measure-pitch-control` horizontally (`152px` desktop, `108px` narrow) so `1/8"` can fit between the button and the cross without collision. Verification must include left/right/top/bottom direction placement, not just overlap absence.
- Pitch cross preservation: do not use an opaque background on `.measure-pitch-value`; it makes the cross line look erased. Horizontal pitch values should stay between the direction button and cross center, but slightly off the stroke so the cross format remains visible. Current verification includes a line-hit check for left/right values at 1280px and 390px.
- Latest pitch placement correction: values must be in the gap between the active plus button and the nearest cross-line edge, not above/on top of the line. Current CSS shortens the pitch cross strokes to create that gap and positions the paired finger pitch controls at 27.5%/72.5% to keep all visible buttons inside the frame. Verification should check left/right/top/bottom values for: between button and line, no line intersection, no button overlap, no visible out-of-frame controls at 1280px and 390px.
