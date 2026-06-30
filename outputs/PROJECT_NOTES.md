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
