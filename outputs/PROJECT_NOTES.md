# Drill 3D Model Prototype Notes

## Current Goal

Bowling ball drilling work is being modeled as an interactive 3D planning tool. The current prototype focuses on:

- A semi-transparent bowling ball model.
- A temporary grip center.
- Thumb, middle, and ring hole placement from span, bridge, and hole sizes.
- Hole drilling trajectory visualization.
- Pitch input and collision warnings.

The user wants this to eventually reproduce real drill press work on a PC, including ball positioning, drill angle, hole path, and practical measure-sheet style input.

## Main Deliverable

- `outputs/bowling-drill-3d-prototype.html`
- `outputs/FLARE_PHYSICS_TECHNICAL_NOTE.md`
- `output/pdf/bowling_flare_physics_technical_note.pdf`

This is a standalone HTML prototype with no external library dependency.

## 2026-09-02 PAP / Axis Migration / Flare Model

- PAP and NAP define the initial through-ball rotation axis; PAP inputs use `1/16"` increments.
- The first track is the great circle perpendicular to the initial PAP axis.
- Axis migration is integrated from the completed-ball inertia tensor with torque-free Euler rigid-body equations. It is a geometric tendency model, not a lane-time predictor.
- Oil flare rings are successive contact-track histories. Oil records the track; it does not itself cause flare.
- The simulated travel interval ends at 60 ft and speed is shown in km/h.
- Thumb-present and thumbless layouts use separate Bowtie-side heuristics. The thumb-present branch chooses the direction that increases clearance from the grip holes; the thumbless branch uses PAP-PIN as a layout reference because PAP alone cannot determine the actual landing point.
- Maximum displayed flare is capped by interpolation of the USBC Differential RG Study measurements.
- Full equations, evidence, assumptions, and non-identifiable inputs are documented in `outputs/FLARE_PHYSICS_TECHNICAL_NOTE.md` and its generated PDF.

## Current Modeling Rules

- Ball diameter is fixed at `8.595"` based on the regulation maximum.
- Regulation range recorded in UI:
  - circumference: `26.704"` to `27.002"`
  - diameter: `8.500"` to `8.595"`
- Working increments are domain-specific: span and hole depth use `1/32"`; pitch uses `1/16"`. Readouts display reduced inch fractions.
- Span is interpreted as edge-to-edge distance:
  - thumb hole edge to finger hole edge.
- Bridge is the gap between the two finger holes.
- Grip center is temporary and placed at the center of the current layout coordinate system.

## Pitch Rules

- `0 pitch` means drilling toward the center of the sphere.
- `L/R` pitch:
  - Left side of the slider is Left.
  - Right side of the slider is Right.
- `F/R` pitch:
  - Left side of the slider is Reverse.
  - Right side of the slider is Forward.
- For finger holes, Forward means the drill path bites inward, and Reverse means it opens outward.
- Internally, this is handled by storing display pitch separately from geometry pitch:
  - `verticalDisplay` keeps the UI/readout value.
  - `vertical` is inverted for middle/ring geometry.

### Pitch Mapping Regression Guard

The 3D model basis is rotated relative to the UI cross. Do not rename or remap the axes from their labels alone. The saved, user-approved geometry contract is:

```js
middle/ring:
  lateral = -pitchAxisValue("...VerticalAxis")
  vertical = -pitchAxisValue("...LateralAxis")

thumb:
  lateral = pitchAxisValue("thumbVerticalAxis")
  vertical = -pitchAxisValue("thumbLateralAxis")
```

The UI/readout values remain the original signed `LateralAxis` and `VerticalAxis` inputs. If the hole mesh protrudes through the shell, fix the sphere/cylinder intersection used for the mesh opening; do not change this pitch mapping to compensate for a rendering problem.

The visible pitch cross also has a hole-specific vertical orientation:

- Middle/ring: top is Reverse, bottom is Forward.
- Thumb: top is Forward, bottom is Reverse.
- All holes: left is Left, right is Right.

Do not reuse one top/bottom direction table for all three holes.

## Drill Trajectory

The drill trajectory is modeled as:

- Cylindrical cutting body.
- Conical drill point at the end.
- No twist/flute decoration.
- A center axis line.

Collision detection samples the drill bodies and reports interference when the approximate tool envelopes overlap.

## UI State

The right-hand control panel has been compacted:

- Two-column control panel.
- Pitch section spans full width.
- Pitch controls are horizontal sliders, not cross pads.
- Each hole has two sliders:
  - `L/R`
  - `F/R`

## Important Implementation Details

- The prototype is intentionally standalone HTML/CSS/JS.
- No CDN or external assets are used.
- Main constants and logic are inside the single HTML file.
- `BALL_DIAMETER = 8.595`
- `snap64()` rounds values to `1/64"`.
- `formatInch()` renders fraction-style inch values.
- `layout()` computes hole geometry.
- `drillSegment()` computes drill path geometry.
- `drawDrillBitEnvelope()` draws the cylinder plus conical point.
- `findCollisions()` and `closestConePoints()` handle approximate collision checks.

## Known Next Steps

- Replace temporary grip-center placement with a proper drilling-layout calculation.
- Add real drill press table orientation and machine-readable coordinates.
- Improve collision detection from sampling to analytic/mesh-based approximation.
- Build a measure-sheet style layout that resembles the user-provided sheet more closely.
- Add import/export of measure sheets.
- Add persistent project files for different bowlers.

## Latest Progress

- Hole interiors are now generated as fixed 3D geometry rather than 2D envelope drawings.
- Surface opening diameter and internal cylinder diameter use the same start-ring geometry.
- Angle visualization was revised to match the requested reference style:
  - center-origin rays to the thumb and finger hole positions
  - a central angle arc with arrow
- `Thumb-Middle` and `Thumb-Ring` labels near the angle arc
- The previous sphere-surface angle arc was removed.

## 2026-07-28 UI Repair Record

- Sticky personal/measure-sheet sections were repaired by preventing the shared `.section` positioning rule from overriding `position: sticky`.
- Pitch steppers were widened so long Japanese pitch labels such as `フォワード 1/16"` can fit after a `+/-` click.
- Hidden bridge select generation was stopped while bridge editing remains intentionally absent from the visible UI.
- A first narrow-viewport stacked layout was added so the app is no longer hard locked to a desktop-only two-column canvas on small screens.

Reason for priority: these issues either made working controls look broken, made requested fixed sections fail, or kept removed controls alive as hidden UI debt.

## 2026-07-29 UI Consistency And Readability Record

- Card interiors were normalized with a final CSS layer for padding, gaps, headings, labels, inputs, and buttons.
- Field text was raised from the earlier 12px baseline toward 14px desktop / 15px mobile, with inputs at 15px desktop / 16px mobile.
- The measure-sheet diagram uses fixed-size value typography. Longer span fractions are accommodated by wider controls, not by shrinking the font according to character count.
- The right-side layout keeps the 3D model at a 500px minimum height and sizes the measure-sheet row to its actual diagram height.
- Narrow drill-layout steppers were compacted only inside the three small layout cards so the larger global touch targets do not overflow.
- Mobile span controls, catalog weight inputs, catalog RG inputs, and physical comparison rows now stack to one column.

Verification: headless Chrome at 1440x900 and 390x844 reported no JavaScript errors, no body/document horizontal overflow, and no clipped or outside measure-sheet value boxes.

## 2026-07-29 Follow-Up UI Correction

- Generated steppers now include visible row labels such as `深さ`, `左右ピッチ`, and `前後ピッチ`; identical rows must not rely on position alone to explain their meaning.
- Span controls were changed from centered narrow islands to full-width sub-cards.
- The thumb solid control now occupies the full card width instead of leaving an empty right column.
- Top/bottom weight inputs and the derived readout now align to the card width, and helper labels such as `方向` / `oz` are no longer tiny.
- Remaining readable 10px/11px UI text was raised to 12px or higher.

Verification: 1440x900 and 390x844 headless Chrome checks reported no JavaScript errors, no horizontal overflow candidates, no readable visible text below 12px, and no clipped measure-sheet values.

## 2026-07-29 Final Readability Correction

- Duplicate `深さ` labels were removed by hiding the old depth label after generated row titles were added.
- Internal IDs such as `thumbDiameter` and `layoutPinPap` are now mapped to Japanese labels such as `サム内径` and `PIN-PAP`.
- The final readable type floor is now enforced at the end of the stylesheet:
  - row titles: 17px
  - helper/readout text: 14px or larger
  - inputs/selects/buttons: 18px
- Verification at 1440x900 and 390x844 reported no internal ID labels, no duplicate depth label in the first pitch block, no horizontal overflow, and no generated input below 18px.

## 2026-07-28 Measure Review And Mobile Usability Update

- The large left-side measure sheet no longer follows scroll.
- A compact right-side `メジャーシート確認` panel now stays near the 3D preview and updates from the same input state as the model.
- Depth controls were restyled to match the pitch stepper pattern.
- Buttons and inputs were enlarged toward mobile-friendly touch targets, with narrow-screen steppers using 48px controls and 16px input text.

Reason for the direction change: reviewing values while editing is useful, but making the full measure sheet sticky reduced the working area. The compact review panel keeps feedback visible without blocking detailed inputs.

Correction after user clarification:

- The separate compact `メジャーシート確認` panel was removed.
- The actual diagram-style `メジャーシート情報` section was moved to the right workspace under the 3D viewer.
- The left pane now focuses on detailed input sections.
- Drill layout steppers were compacted locally so `ドリル角`, `PIN-PAP`, and `VAL角` buttons no longer protrude from their cards.

Reason: the user wanted the existing measure sheet diagram itself to stay visible, not a separate summary screen.

Follow-up correction:

- The right-side measure sheet diagram was resized to preserve its original 1100:760 ratio and fit inside its card.
- The 3D viewer was enlarged again so the model remains useful as the main visual feedback.
- The personal information sticky behavior was removed because it was originally added for scroll-follow visibility, but it now takes space away from detailed editing.

## Application Direction

The prototype is no longer only a single drilling calculator. The intended product direction is an integrated bowling-ball management application with three major layers.

1. Measure Sheet And Personal Data
   - This is the highest-priority and top-level section.
   - It should combine:
     - saved-data search
     - personal data display/editing
     - PAP registration
     - measure-sheet registration
   - The main deliverable in this layer is a reliable measure-sheet registry and its corresponding 3D grip/hole model.

2. Drill Layout Modeling
   - This sits below the measure-sheet section.
   - It includes Dual Angle layout, PIN/CG/MB/vMB, PAP, VAL, GC calculation, and ball/core visualization.
   - Current implementation already has a first working version, but it needs more rigorous physical ball modeling.
   - Future work should deepen core shape, mass distribution, surface reference points, and how those influence layout marks.

3. Shelf Application
   - This is the final application shell.
   - It should manage:
     - bowlers/person profiles
     - measure sheets
     - owned bowling balls
     - each ball's usage status/history
     - drill layout records
     - layout and drilling previews per ball
   - The expected direction is similar to the separate `ymsh003/ball-shelf-project` concept.

## Current UI Organization Target

- Primary order: personal information, measure sheet, drill layout, modeling.
- Personal information is the top-level owner of saved data.
- A person should eventually own multiple measure sheets and multiple ball records.
- Measure-sheet data is the main axis of this prototype and should remain prominent before layout/modeling details.
- Ball records should eventually come from or synchronize with the shelf-style application.
- Core metadata belongs to each ball record, not directly to a person or an isolated layout.
- Drill layout records should attach to a specific ball record and use that ball's metadata, surface marks, and core assumptions.

The next development focus is physical ball modeling, not further ad-hoc UI reshuffling.

## Physical Modeling Focus Next

The next work should refine the ball model itself:

- core geometry fidelity
- core eccentricity and density assumptions
- relationship between core model and surface `PIN`, `CG`, `MB`
- stable calculation of virtual MB for symmetric cores
- visual separation between actual ball marks and derived layout marks
- validation that Dual Angle geometry is calculated from the intended physical reference points

## Non-Negotiable Measurement Definitions

These definitions are initial project constraints and must be preserved during implementation:

- Finger bridge is the shortest distance between the outer-diameter drilled openings for the two finger grips.
- Therefore, the two finger openings must remain separated by exactly the selected bridge value at their facing outer endpoints on the ball surface.
- Finger span is measured from the thumb-hole inner endpoint to the corresponding finger-grip outer-diameter endpoint unless a grip-specific reference explicitly overrides it.
- Pitch UI labels and pitch trajectory signs must be checked against the actual drilled-axis direction, not only the on-screen labels.
- When changing layout, pitch, or opening geometry, re-check bridge and span definitions before treating the change as complete.

## 2026-07-31 Integrated Measure Sheet Repair

- Integrated `メジャーシート詳細` into `メジャーシート情報` so the user edits the measure sheet in one place instead of switching between a display card and a separate detail card.
- Kept the existing detailed input style (`- / value / +`, select fields, and grouped cards) inside the measure sheet area. The diagram values are display/readout values again, not raw free-text entry fields.
- Restored the missing bridge input. Bridge can now be changed from the integrated measure controls and the diagram readout follows it.
- Kept the right side dedicated to the 3D drill layout so the model remains visible while measure values are edited on the left.
- Verified on desktop and 390px mobile viewport that the detail section is inside the measure sheet card, the standalone detail card is gone, diagram values are read-only, and integrated controls update the diagram/model values.
- Follow-up repair: replaced the diagram's passive value boxes with visible `- / value / +` controls positioned directly on the measure sheet. This keeps the established input style while making the first visible measure sheet area directly operable.
- Follow-up repair: removed the visible lower `メジャーシート詳細` panel and replaced it with a measure-sheet editor inside `メジャーシート情報`. The editor now includes finger grip shape, grip outer diameter, grip inner diameter, bare diameter, wall thickness readouts, depth, pitch, span, bridge, and thumb/solid controls.
- Fixed duplicate click handling on the diagram controls so one click applies one increment instead of firing an old handler as well.
- Follow-up repair: hid the lower integrated editor as well, leaving the visible `メジャーシート情報` diagram as the single measurement entry surface. Finger grip shape controls for middle/ring were added directly to the diagram. Desktop/mobile overlap checks pass with the lower measure-detail inputs hidden.
- Follow-up repair: restored grip shape model previews directly above the finger grip-size controls, restored visible pitch information for middle/ring/thumb inside the measure sheet, and normalized measurement control frames so circular hole values use round frames while span/bridge/grip-size values use rectangular frames.
- Follow-up repair: changed only the thumb inner-diameter control to a circular vertical `+ / value / -` control matching the provided reference. The thumb solid outer diameter remains a separate rectangular field outside the circle and now has an explicit `サムソリッド外径` label.
- Follow-up repair: rebuilt the middle/ring finger hole controls as circular vertical controls. These controls now target `middleGripOuter` and `ringGripOuter`, so they step only through the existing outer-diameter patterns (`7/8"`, `31/32"`, `63/64"`, `1 1/32"`) instead of editing bare diameter or accepting arbitrary values. Desktop and 390px mobile overlap checks pass.
- Follow-up repair: removed the remaining background SVG bracket paths for finger grip size, bridge, span, and thumb solid outer diameter. Replaced the foreground rectangular controls with bracket-style `- / value / +` parts with colored plus/minus buttons. Verified desktop and 390px mobile overlap checks and confirmed click updates for finger grip size, main span, and thumb solid.
- Follow-up repair: increased the measure diagram vertical space from 490px to 620px on desktop and from 680px to 820px on narrow screens. Bracket-style controls were widened internally with fixed clearance between bracket, buttons, and value, and paired controls were moved outward to avoid a cramped layout. Verified no overlaps on desktop and 390px mobile.
- Follow-up repair: removed the non-functional SVG pitch crosses and hid the old pitch-token/chip summaries in the measure diagram. Added functional plus-only pitch controls for middle, ring, and thumb with four directional plus buttons. Each axis stays mutually exclusive: pressing the opposite direction steps through zero before activating that side. Verified desktop/mobile overlap checks and right/left/top pitch stepping.
- Follow-up repair: separated pitch value labels from the directional plus buttons so active values no longer overlap the plus controls. Reworked the rectangular measure controls to a segmented panel style matching the provided reference: dark left/right button panels and a light center value panel with dark top/bottom separators. Increased the measure diagram height to 700px desktop and 940px narrow screens to avoid crowding. Verified desktop/mobile no-overlap checks.
- Follow-up repair: corrected the segmented rectangular controls so only the shape language is retained from the reference image. The panels now use the app's dark teal styling instead of literal white/gray, and narrow-screen controls were reduced to 158px with 25%/75% placement so they stay inside the measure-sheet frame. Verified desktop/mobile no-overlap and no-out-of-frame checks, and confirmed pitch value labels do not overlap plus buttons.
- Follow-up repair: tightened the visible collision check for pitch and segmented controls. Pitch plus buttons now stay inside their own control area, active pitch values are compacted and placed between the center cross and the edge button, and rectangular segmented controls were rechecked at child-element level so the center number, left button, right button, and outer frame do not visually collide. Verified desktop 1280px and mobile 390px: no measure-sheet controls outside the frame, no parent-control overlaps, no active pitch value/button overlaps, and no segmented-control internal overlaps.
- Follow-up repair: restored pitch direction readability. The active pitch value now sits on the same side as the active plus button, between that plus button and the cross center, instead of drifting to the opposite side for collision avoidance. The pitch control was widened horizontally to create enough room for `+ / value / cross / value / +`. Verified left/right/top/bottom at desktop 1280px and mobile 390px: each value is on the intended side and no visible child elements overlap.
- Follow-up repair: preserved the pitch cross as part of the visual format. Pitch values no longer use an opaque label background that visually erases the cross line. Horizontal pitch values were nudged just off the horizontal stroke while staying between the active plus button and the cross center. Verified at 1280px and 390px that left/right pitch values do not cover the horizontal cross line and do not overlap plus buttons.
- Follow-up repair: corrected pitch value placement from "above the line" to "between the plus button and the cross line edge." The cross lines were shortened to reserve a real gap for the value instead of moving the number onto the line or hiding the line behind a label. Middle/ring pitch controls were repositioned at 27.5%/72.5% so widened pitch controls stay inside the measure-sheet frame and do not collide on mobile. Verified at 1280px and 390px: left/right/top/bottom values are between button and line, do not intersect the line, do not overlap buttons, and visible controls stay inside the frame.

## 2026-08-24 Measurement Control Contract

- `middleSpan` and `ringSpanOffset` use exactly `1/32"` increments.
- `middleDrillDepth`, `ringDrillDepth`, and `thumbDrillDepth` use exactly `1/32"` increments.
- Long measurement values must retain the same font size as short values. Increase the control width instead of applying character-count-based font classes.
- The three depth controls belong inside `#measureDiagram`, adjacent to their hole layout. Do not create a separate depth section below the measure sheet.
- Finger depth controls use the same side-by-side relationship as the thumb: middle depth is placed on the outer-left side of the middle hole and ring depth on the outer-right side of the ring hole, rather than directly underneath either circle.
- Browser verification: one span decrement changed `4"` to `3 31/32"`; one depth increment changed `1 1/2"` to `1 17/32"`; `3 29/32"` remained at `22px` and fit inside the widened span control.

## 2026-08-25 Drill-Machine Kinematic Contract

- The red grip-center marker is a layout marker on the ball surface, not the geometric center inside the sphere.
- Before drilling, the surface grip-center marker is placed directly below the fixed vertical spindle and the planar/rotational controls are zeroed.
- Per-hole operation order is fixed for the animation and modeling contract:
  1. rotate from the grip center along the straight layout direction toward the target hole;
  2. translate the base in its plane so the target opening is below the fixed spindle;
  3. apply the additional pitch rotations;
  4. lock the base and lower the fixed spindle along one straight drill axis.
- Pitch uses two independent rotational controls:
  - thumb-to-finger direction: Forward/Reverse pitch;
  - the perpendicular direction: side pitch.
- The red operating levers and the `1/16"` scales are mechanically linked. Moving a lever moves its scale indication.
- Forward/Reverse and side pitch remain independent input values and are combined only for the final ball/base pose.
- Hole depth changes only travel along the already determined straight drill axis. It must not change pitch angle.
- The explanatory deliverables are:
  - `outputs/drill-machine-operation-3d.html`
  - `outputs/drill-machine-operation-3d.webm`
- The current video is a simplified kinematic model, not a dimensionally exact reproduction of the machine casing or linkage lengths.

## 2026-08-26 Drill-Machine Reference Model Contract

- The simplified operation video is not the geometry source for future animation. Use `drill-machine-reference-model.obj` as the machine reference and correct that model first.
- Model units are millimeters. The bowling-ball diameter is fixed at `218.313 mm` (`8.595 in`). Machine casing dimensions remain photo-derived provisional values until measured dimensions are supplied.
- The spindle axis and the zero-position surface grip-center share `X=45 mm / Z=10 mm` in the reference model. At the inspection pose the drill point is `5.8435 mm` above the ball surface.
- Required separately identifiable assemblies: pedestal, column, drill head, vertical spindle, cross-slide table, lower yaw base, orthogonal F/R and side trunnions, lower ball cup, equatorial C-yoke, upper horseshoe holder, radial clamp shoes, both graduated collars/handles, and bit rack.
- The inspection deliverable is `drill-machine-model-viewer.html`. It must retain front/right/top/isometric presets, close fixture and fixture-top views, and ball visibility control.
- The importable source deliverables are `drill-machine-reference-model.obj` and `drill-machine-reference-model.mtl`. `drill-machine-reference-model.js` is the local-file-safe viewer payload.
- Rev. 02 uses the additional same-machine reference video `https://www.youtube.com/watch?v=Dg0FsAFY8Wc`, especially the fixture views around 10:07, 11:13, and 11:23.
- Rev. 02 removed the incorrect three-arm clamp and the incorrect tall vertical arch. The observed fixture is represented by the low cast C-yoke, two radial shoes, side/front orthogonal hubs, large engraved collars, and the graduated yaw base.

## 2026-08-26 Pitch Audit After Machine Study

- The machine model was created to reconcile the user's and developer's understanding. Rev. 02 is sufficient for that purpose; do not continue exterior-detail modeling unless it becomes necessary for a later kinematic question.
- Confirmed pitch contract:
  - zero pitch aims the hole axis at the ball's geometric center;
  - Forward/Reverse follows the grip centerline and side pitch is perpendicular to it;
  - the two pitch components are independent and expressed as inch offsets from the zero axis;
  - hole depth is travel along the already-fixed drill axis and must never alter that axis.
- The current prototype does **not** yet satisfy this contract:
  - `drillSegment()` constructs its direction from `inward * drillDepth + pitch offsets`, so changing depth changes the pitch angle;
  - the saved `layout()` mapping swaps the UI Forward/Reverse and lateral axes before passing them to the hole geometry;
  - the local drill basis is derived from a fixed world Y axis rather than the transported grip-centerline/layout basis, so a rotated Dual Angle grip can rotate the meaning of pitch.
- Correct geometry target for a surface hole center `S`, ball center `C`, local side unit vector `u`, local Forward/Reverse unit vector `v`, and pitch values `pSide`/`pFR`:
  - `aim = C + u * pSide + v * pFR`;
  - `axis = normalize(aim - S)`;
  - `tip = S + axis * drillDepth`.
- Do not restore the historical sign/swap mapping merely because it was marked as a regression guard. It must be replaced by explicit grip-basis tests for middle, ring, and thumb holes.
