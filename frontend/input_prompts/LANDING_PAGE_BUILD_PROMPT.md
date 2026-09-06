# IntelliCall — Landing Page Build Prompt

You're building the public landing page for IntelliCall inside the existing codebase. This is not a separate marketing site or a new visual system — it uses the same design tokens, components, and theming already defined in `INTELLICALL_FRONTEND_DESIGN_SYSTEM.md` and already implemented in the app. If anything below conflicts with the existing design system, the design system wins.

Three inputs for this task:
1. `LANDING_PAGE_COPY.md` — the full, final copy for every section, including a "why this works" note per section explaining the psychological intent. Use this copy verbatim in body text; do not rewrite, shorten, or "improve" it — it was written deliberately for this audience. You may adjust copy only where it's explicitly marked as a placeholder.
2. The existing design token system (color, type, spacing, radius, shadow, motion) — reuse only.
3. The existing component library (`DecisionCard`, `ConfidenceIndicator`, `EvidenceSnippet`/`EvidenceThread`, `AIStateBanner`, `ConversationStatePanel`, `DecisionTrace`) — these get *reused live*, not recreated or screenshotted.

This supersedes the smaller "add a landing page" item from the Phase 6 refinement prompt — build the full version described here instead of the minimal placeholder described there.

---

## 1. Route & structure

- Public route `/`, not behind auth.
- If the user is already authenticated, skip the marketing page entirely and redirect straight to `/dashboard` — a logged-in user should never see a pitch for a product they already use.
- Section order follows `LANDING_PAGE_COPY.md` exactly: Hero → Problem → Product showcase → Autonomy → Early access → FAQ → Final CTA → Footer.

---

## 2. The two CTAs — wire these precisely

**`Get started`**
- Routes to the existing sign-in/sign-up page.
- That page must present two SSO options as primary actions: **Sign in with Google** and **Sign in with Microsoft** — standard provider button styling (official Google/Microsoft brand mark + wordmark per each provider's own button guidelines), sized and spaced using existing button tokens (`radius.sm`, `size.lg` per §"Buttons"). Do not invent a third, generic email/password path unless one already exists elsewhere in the app — if it does, it sits below the SSO buttons as a secondary option, not equal-weight.
- If auth isn't wired yet, stub the destination page but keep the route and button functional — do not leave `Get started` as a dead link.

**`Book a demo`**
- Opens Calendly. Use an inline embed on desktop where there's room (Calendly's embed widget, injected client-side, matching the app's card/radius/shadow tokens around it so it doesn't look like a foreign iframe dropped in) and a new-tab link on mobile/narrow viewports if an inline embed would be cramped.
- Calendly link/embed ID: placeholder for now — leave a clearly marked `TODO: insert Calendly link` constant, do not fabricate one.

Both CTA buttons appear in the hero and repeat in the final CTA section — same components, same handlers, not two separate implementations.

---

## 3. The live component showcase (Section 3) — this is the part that matters most

Do not use static images, exported PNGs, or screenshots of the app anywhere on this page. Section 3 must render the **actual React components** from the app's component library, fed with realistic mock data, directly on the marketing page. This is the single biggest credibility lever on the page — a live, interactive component reads as "the real product" in a way a screenshot never does.

Implementation:
- Import `ConversationStatePanel` (or the `AIStateBanner` live-call subset), `EvidenceSnippet`/`EvidenceThread`, `ConfidenceIndicator` + `DecisionCard`, and `DecisionTrace` (expanded) directly into the landing page — same components the app itself uses, not visual clones.
- Feed each with a small, curated mock dataset written specifically for this page (a realistic-looking lead name, a plausible evidence quote, a confidence score in a compelling range like 82%) — this can live in a local `landingPageMockData.ts`, separate from the app's own mock data, so editing one never breaks the other.
- Each block sits next to its caption from the copy file, in a two-column layout on desktop (component left/right alternating per block, copy on the other side) and stacked on mobile.
- These components should feel slightly alive, not static: `DecisionTrace` starts collapsed and expands on scroll-into-view or on click, `ConfidenceIndicator` can animate in using the existing motion tokens (§16) the first time it scrolls into view. Use `IntersectionObserver`-driven mount, not autoplay-on-load, so it feels responsive to the reader rather than performing at them.
- No fabricated data implying real customer activity (no fake "23 minutes ago," no invented company names that could be mistaken for real logos) — mock data should read as illustrative, e.g. lead name like "Sample Lead — Acme Corp" is fine since "Acme" reads as an obvious placeholder, not a real customer.

---

## 4. Psychological pacing — how the page should *feel* while scrolling, not just what it says

The copy file explains the persuasion device per section; this is how to support it visually:

- **Hero → Problem**: the tone shift from confident claim to naming a real fear should be visually calm, not dramatic — no red warning colors, no alarming iconography. Use `text.secondary` and neutral tone; the words carry the tension, the visuals don't need to amplify it.
- **Product showcase**: this section should feel like the reader is being let into something real, not sold to — generous whitespace, no competing CTAs inside this section, let the live components be the only thing demanding attention.
- **Early access section**: the callout box (20% off, locked pricing) should use the same `shadow.md`/`radius.md` card treatment as everywhere else in the app — do not give it a special "promo" visual treatment (no starburst, no countdown timer, no bright accent color it doesn't already have a token for). The persuasion here comes from the specificity of the offer, not from urgency styling — a countdown timer or clashing accent color would undercut the "calm, enterprise-grade" tone this whole page is built on.
- **FAQ**: standard accordion, one open at a time, using existing accordion/expand pattern if one exists in the component library, or the same expand motion as `DecisionTrace` if not.
- Overall scroll rhythm: alternate information density — a dense section (Problem's three columns, or the FAQ) should be followed by a low-density section (single headline + CTA) so the page has breathing room and doesn't read as a wall of persuasion.

---

## 5. Responsive & accessibility

- Fully responsive down to mobile — this is often the first touch for a demo-booking click coming from an email or LinkedIn link.
- Keyboard-navigable CTAs and FAQ accordion, visible focus states per the existing accessibility baseline.
- Live component showcase must degrade gracefully on slow connections — show the existing skeleton pattern (§ loading states) for each component block while its mock data "loads" (even though it's local data, simulate a brief load so the pattern is consistent with the rest of the app, using existing skeleton tokens — not a spinner).

---

## 6. What not to do

- No stock photography, no generic illustration style not already defined in the design system.
- No fake testimonial quotes, no fake company logos, no fake usage numbers — Section 5 (Early Access) is the deliberate substitute for this; do not undermine it by inventing proof elsewhere on the page.
- No pricing table beyond the early-access offer described in the copy — full pricing isn't part of this page per the copy file.
- No new color, spacing, radius, or animation tokens invented for "marketing polish" — if the page needs something the design system doesn't have, flag it back rather than improvising a one-off.

---

## Confirm at the end

```
WHAT EXISTS
WHAT THIS TASK ADDS
WHAT MUST NOT BREAK
OPEN ITEMS (Calendly link, SSO wiring, data-training FAQ answer — anything left as a placeholder)
```
