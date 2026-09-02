# XBID REDLINE frontend style system

The frontend has one visual source of truth:

`app/globals.css`

It owns design tokens, colors, typography, spacing, radii, shadows, responsive
breakpoints, and every component state. `app/layout.tsx` is the only file that
imports CSS.

REDLINE is XBID's own visual language: warm off-white surfaces, carbon control
panels, a signal-red system accent, and equally weighted red/blue contest sides.
It takes its information rhythm from live motorsport and esports telemetry
without copying another prediction market's component styling.

## Rules

- Components expose semantic class names and accessible state attributes.
- Do not use the React `style` prop.
- Do not create or import component-level CSS files.
- Do not encode colors, spacing, or layout choices in TypeScript.
- Dynamic ratios use semantic native elements such as `<progress>`; CSS owns
  their appearance.
- Dynamic curve geometry may use SVG attributes derived from real indexed data;
  colors, line weights, dimensions, and states remain in `app/globals.css`.
- The entire system uses only `--xbid-type-body` and `--xbid-type-heading`.
  Weight, spacing, case, and color—not extra sizes—create hierarchy.
- Change the `:root` tokens to recolor the complete system, or edit component
  selectors in the same file for a deeper theme change.

ESLint enforces the inline-style and extra-CSS-import restrictions.
