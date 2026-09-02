# XBID frontend style system

The frontend has one visual source of truth:

`app/globals.css`

It owns design tokens, colors, typography, spacing, radii, shadows, responsive
breakpoints, and every component state. `app/layout.tsx` is the only file that
imports CSS.

## Rules

- Components expose semantic class names and accessible state attributes.
- Do not use the React `style` prop.
- Do not create or import component-level CSS files.
- Do not encode colors, spacing, or layout choices in TypeScript.
- Dynamic ratios use semantic native elements such as `<progress>`; CSS owns
  their appearance.
- Change the `:root` tokens to recolor the complete system, or edit component
  selectors in the same file for a deeper theme change.

ESLint enforces the inline-style and extra-CSS-import restrictions.
