# XBID UI localization

The UI supports English, Chinese, Bengali, German, Spanish, French, Hindi,
Indonesian, Italian, Japanese, Polish, Portuguese, Russian, Thai, Tagalog and
Ukrainian. Language names in the footer are endonyms, not translated labels.

## Scope

- All 737 existing message keys have entries in every dictionary. User-authored
  contest titles, side names, symbols, descriptions and comments are not translated.
- `locales.ts` is the allowlist for cookies, browser language negotiation, the
  selector, HTML language tags and wallet UI mapping. `fil-PH` maps to `tl`.
- The server chooses a valid saved cookie, then `Accept-Language`, then English.
  This same dictionary is passed into hydration; no inline script changes the
  language before React starts. Legacy localStorage is restored after hydration
  only when there is no valid language cookie.
- A switch loads only the selected pack before changing the UI. A failed load
  keeps the previous language and allows retry. Rapid selections use last-request
  wins. Cookie/localStorage access failures do not prevent an in-session switch.
- Pack imports are statically allowlisted and lazy. No translation API or local
  model runs in production. The model is not a project dependency.
- RainbowKit 2.2.11 does not bundle Bengali, Italian, Polish or Tagalog; those
  wallet modal languages deliberately fall back to English. XBID's own UI does
  not fall back with it. External wallet extensions control their own language.
- Local decimal input is normalized as a string, without floating-point
  conversion or removing thousands separators. Transaction units, quote math,
  fees and contract calls are unchanged.

## Translation provenance and review boundary

New packs start from offline Meta M2M100-418M machine translations, with targeted
editorial corrections for navigation, trading actions, balances, approvals,
quotes, counts, risk disclosures and sharing. The model card is at
https://huggingface.co/facebook/m2m100_418M (MIT). Translations remain an initial
localization release, not certified native-speaker or legal translations.
Long-form mechanics/help copy and nuanced terms should receive native-speaker
review before public mainnet marketing. Do not claim that dictionary coverage or
placeholder tests establish semantic accuracy.

The old share sentence implying that a leading side guarantees profit was
removed in English, Chinese and new languages. Testnet disclosures remain intact.
This work does not change chain, asset, pricing or protocol parameters.

## Updating a message

1. Update the English key in `messages.ts`, its Chinese equivalent, and all 14
   `translations/*.json` entries. Preserve each placeholder exactly.
2. Keep protocol numbers, units, risk qualifications and branded names intact.
   Do not translate user input or use UI translation to change business rules.
3. Run `pnpm check:i18n`, `pnpm check`, and `pnpm build`.
4. Check browser switching, reload persistence and small screens in Latin,
   Cyrillic, Japanese, Bengali, Hindi and Thai. Check failed pack loading and
   quick switching. Native-speaker review is a separate step.

Public SEO descriptions and server-generated social images are not automatically
translated by the UI locale provider; they require their own explicit locale
design if localized versions are desired.

## Implementation verification (2026-09-07)

- `pnpm check`: ESLint, TypeScript, 737-key coverage for 16 locales,
  placeholders, duplicate/damaged/repeated strings, locale negotiation,
  precise decimal normalization, UI/architecture and chain-config guards.
- `pnpm build` and `pnpm check:performance`: production build passes;
  critical route assets about 499 KiB gzip, within the existing 500 KiB budget.
- Isolated Chrome smoke tests against a local production build: all 16
  selections, reload persistence, cookie priority, Accept-Language, cross-tab
  sync, rapid-switch races, failed chunk imports and blocked localStorage.
- Desktop 1440px; mobile 390px samples in German, Bengali, Hindi, Japanese,
  Thai and Ukrainian; Launch at 320px. Cyrillic uses system fonts to avoid
  CJK-font fallback spacing. Long mobile navigation labels can wrap.
- No wallet signature or transaction was used for these UI checks. This
  change has not been committed or deployed by the localization task.
