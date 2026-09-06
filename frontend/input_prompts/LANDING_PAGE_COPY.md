# IntelliCall — Landing Page Copy

Tone: calm, trustworthy, enterprise-grade — with technical precision for RevOps buyers. No hype language, no exclamation-point energy, no fake urgency. Confidence comes from specificity, not adjectives.

Each section includes a short **"why this works"** note explaining the psychological mechanism, so the IDE/AI building this doesn't flatten the copy into generic SaaS filler.

---

## Nav

`IntelliCall` — `Product` `How it works` `Early access` — `Sign in` — **`Get started`**

---

## Hero

**Eyebrow:** Powered by Resonology AI

**Headline:**
Know why the AI made every call it made.

**Subheadline:**
IntelliCall runs your outbound conversations, qualifies leads, and books meetings — and shows you the exact evidence behind every decision, before it acts or after you review it.

**Primary CTA:** `Get started` (→ sign-up/sign-in, Google & Microsoft SSO)
**Secondary CTA:** `Book a demo` (→ Calendly)

**Supporting line under CTAs:**
No credit card to start. See a real decision trace in your first session.

*Why this works:* The headline leads with the product's actual differentiator (explainability) instead of a generic outcome claim ("book more meetings") every competitor already says. Specificity ("evidence behind every decision") reads as more credible to a technical buyer than an adjective-heavy claim. The supporting line removes the two biggest frictions for a RevOps evaluator — cost risk and time-to-value — in one line each.

---

## Section 2 — The problem (agitation, kept factual, not emotional)

**Headline:**
Most AI dialers give you an outcome. Not a reason.

**Body:**
"Qualified" or "not interested" isn't enough when you're the one accountable for the pipeline. If you can't see what the AI heard, what it flagged, and why it made the call it made, you can't trust it — and you can't improve it.

**Three short columns:**
- **No evidence trail.** A label with no transcript reasoning behind it.
- **No review point.** Low-confidence calls act the same as high-confidence ones.
- **No audit path.** When a decision is wrong, no way to see where it went wrong.

*Why this works:* This is loss-aversion framing aimed at a specific professional fear (being accountable for a black box), not a generic pain point. Naming the failure mode precisely signals the product team understands the buyer's actual job — which builds authority before a single feature is shown.

---

## Section 3 — Product showcase ("How it works")

**Headline:**
Every decision comes with its evidence.

**Intro line:**
This isn't a mockup — it's the actual interface, with sample data.

*(Implementation note: this section renders real app components live, not screenshots — see build prompt §3. Copy below is the caption for each live-rendered block.)*

**Block 1 — caption:**
The agent talks to the lead, following the campaign strategy and script you set.
*(live render: `ConversationStatePanel` or `AIStateBanner` live-call subset)*

**Block 2 — caption:**
It pulls the specific lines that mattered — not a summary, the actual quotes.
*(live render: `EvidenceSnippet` / `EvidenceThread`)*

**Block 3 — caption:**
Confidence is shown plainly. Above your threshold, it acts. Below it, it waits for you.
*(live render: `ConfidenceIndicator` + `DecisionCard`)*

**Block 4 — caption:**
Every decision, traceable back to the exact words that produced it.
*(live render: `DecisionTrace`, expanded state)*

*Why this works:* Showing the real UI live (interactive, not a static image) triggers higher perceived legitimacy — static screenshots read as "marketing," a working component reads as "the actual product," which lowers evaluation risk for a technical buyer who's used to being shown polished mockups that don't match the real app.

---

## Section 4 — Autonomy, on your terms

**Headline:**
You decide how much the AI acts on its own.

**Body:**
Set one confidence threshold per campaign. Above it, decisions execute automatically. Below it, they land in your review queue with full context — never a silent guess.

**Small supporting row (3 items):**
- **One threshold, plain language.** Not a matrix of settings to maintain.
- **Review queue, not a black box.** Approve or override, with reasoning visible.
- **Full outcome tracking.** From decision to meeting to conversion, in one funnel.

*Why this works:* RevOps buyers are wary of "autonomous AI" pitches because autonomy = risk exposure. Framing autonomy as buyer-controlled (not vendor-controlled) directly defuses the objection before it's raised — this is objection pre-emption, a core technical-buyer persuasion technique.

---

## Section 5 — Early access (replaces testimonials/logos)

**Headline:**
We're early. Your terms lock in now.

**Body:**
IntelliCall is in early access. Teams who join now help shape the product roadmap directly — and get founding-member pricing locked in for the life of their account, before public pricing is set.

**Callout box:**
**Early Access Program**
20% off annual pricing, locked permanently
Direct line to the product team
Priority on new campaign strategies as they ship

**CTA:** `Apply for early access`

*Why this works:* With no logos or testimonials to lean on yet, the honest move is to reframe "we're new" as a value exchange instead of hiding it — reciprocity (direct roadmap input) and loss aversion (pricing that won't be available later) substitute for social proof. "Locked permanently" is a concrete, checkable claim, which reads as more trustworthy than a vague "special launch pricing."

---

## Section 6 — FAQ (objection handling)

**Does this replace my SDR team?**
No — it runs the qualification and follow-up conversations your team doesn't have time to make consistently, and hands off to your team (or books directly) once a lead is ready.

**How do I know the AI's decisions are accurate?**
Every decision includes the transcript evidence it was based on. You can review any decision — not just the ones flagged for review — and see the exact reasoning.

**What happens on calls the AI isn't confident about?**
They route to your review queue instead of executing automatically. You set the confidence threshold per campaign.

**Is my data used to train a shared model?**
*(Placeholder — confirm actual data policy before publishing; do not leave this un-answered on the live page.)*

**How long does setup take?**
Configuring an agent and launching a campaign takes minutes, not a multi-week onboarding.

*Why this works:* FAQ order follows objection severity, most threatening first ("replacing my job / my team's job") — addressing the biggest fear early prevents the reader from silently deciding "not for us" before reaching the smaller objections.

---

## Final CTA section

**Headline:**
See the reasoning behind your next 10 calls.

**Body:**
Start free, or talk to us first if you'd rather see it walked through live.

**Buttons:** `Get started` · `Book a demo`

*Why this works:* Closing CTA repeats the two-path structure (self-serve vs. assisted) established in the hero — consistency reduces decision friction for a reader who scrolled the whole page without acting yet.

---

## Footer

`Product` `How it works` `Early access` `Sign in` `Get started`
© IntelliCall. Powered by Resonology AI.
