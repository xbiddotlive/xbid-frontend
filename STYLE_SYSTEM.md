# XBID PULSE frontend style system

The frontend has one visual source of truth:

`app/globals.css`

It owns design tokens, colors, typography, spacing, radii, shadows, responsive
breakpoints, and every component state. `app/layout.tsx` is the only file that
imports CSS.

PULSE is XBID's visual language. Its core identifier is one continuous line
pulled between two opposing signals: warm red for Side A and cool blue for Side
B. The market curve—not decorative chrome—is the primary visual. Deep graphite
surfaces, hairline boundaries, restrained color, and dense real-time data make
the product feel active without borrowing another trading product's identity.

## Rules

- Components expose semantic class names and accessible state attributes.
- Do not use the React `style` prop.
- Do not create or import component-level CSS files.
- Do not encode colors, spacing, or layout choices in TypeScript.
- Dynamic ratios use semantic native elements such as `<progress>`; CSS owns
  their appearance.
- Dynamic curve geometry may use SVG attributes derived from real indexed data;
  colors, line weights, dimensions, and states remain in `app/globals.css`.
- The entire system uses one `--xbid-type: 12px` size. Weight, spacing, case,
  and color—not additional sizes—create hierarchy.
- Change the `:root` tokens to recolor the complete system, or edit component
  selectors in the same file for a deeper theme change.

ESLint enforces the inline-style and extra-CSS-import restrictions.
