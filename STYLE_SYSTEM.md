# xbid arena ui contract

The frontend uses one visual entry point, `app/globals.css`, which loads four ordered layers: `styles/base.css`, `styles/discovery.css`, `styles/contest.css`, and `styles/utility.css`. Components expose semantic class names and do not own colors, typography, spacing, radii, shadows, or responsive rules.

## immutable interface rules

- all visible text inherits `12px` from `--font-size-ui`
- hierarchy uses weight, tone, spacing, borders, and grouping
- all english interface copy is lowercase
- side a is `#3478f6`; side b is `#ff603d`
- crown is `#ffc857`; positive state is `#35d07f`
- cards use `6px` radius and `1px` borders
- desktop header is `48px`; mobile header is `44px`
- icons are reusable svg components from `components/ui/icons.tsx`
- inline styles and component css imports are blocked by eslint; only the root layout loads the layer entry

Run `pnpm check:ui` before every merge. It verifies the ordered css layers, required tokens, the single font-size rule, the mobile breakpoint, and lowercase static jsx copy.

## visual identity

The signature is an arena, not a prediction exchange: two opposing color rails, a shared live dominance curve, compact market telemetry, atomic flip emphasis, verified activity, and live commentary. Motion is restrained and tied to state changes.
