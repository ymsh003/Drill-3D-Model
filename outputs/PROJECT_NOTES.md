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

This is a standalone HTML prototype with no external library dependency.

## Current Modeling Rules

- Ball diameter is fixed at `8.595"` based on the regulation maximum.
- Regulation range recorded in UI:
  - circumference: `26.704"` to `27.002"`
  - diameter: `8.500"` to `8.595"`
- All working inch values are displayed in `1/64"` fraction format.
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
