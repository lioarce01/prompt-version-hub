# Prompt Hub UX & Remaining Polish – Plan

## Objectives
- Consolidate the `/prompts` experience into a single, modern “Prompt Hub” layout while keeping advanced filters, card/table toggle, and search.
- Align `/prompts/my` with the new visual system so cards, buttons, and empty states feel consistent and legible in dark mode.
- Address visual bugs (contrast, icon colors, scrollbar styling) and interaction quirks that surfaced after the multi-user rollout.
- Ensure deployments UI reflects per-user/per-prompt scoping introduced in the backend and remains easy to audit.

---

## Frontend Tasks

### `/prompts` (Prompt Hub)
- **Component merge**: remove the legacy prompt list component and rely exclusively on the new Prompt Hub grid/table implementation, reusing existing filters (visibility/status/sort) plus search and view toggle.
- **Tab bar**: update the segmented control for `All Public`, `My Public`, `My Private` so inactive labels use light colors on dark backgrounds, fix the broken “My Public” icon, and ensure hover/active states have clear spacing (padding or inset shadow).
- **Empty state**: lighten the “No prompts yet” copy and supporting text for dark mode visibility.
- **Search bar**: center the input and icon vertically, match icon/text alignment with `/prompts/my`, and ensure contrast meets accessibility targets.
- **Action buttons**: confirm clone buttons (especially within `My Private`) inherit the light-on-dark theme.

### `/prompts/my`
- **Card structure**: standardize spacing between title, metadata, template preview, and CTAs so cards match the Prompt Hub aesthetic; ensure action buttons sit at the bottom with consistent gaps.
- **Button contrast**: update “Clone prompt” and related actions so icons and labels are legible on dark backgrounds.
- **Filter chips**: adjust hover states for visibility/status/sort controls to include subtle separation (margin or transparent outline) to prevent the “stuck together” look.
- **Empty state**: lighten “No prompts yet” messaging and icon color for dark mode readability.
- **Search input**: align icon and text similarly to the Prompt Hub search for parity.

### Shared UI Details
- **Horizontal scrollbar**: restyle the Prompt Table’s x-axis scrollbar to match the app’s minimal aesthetic (thin track, rounded thumb, hover/focus states).
- **Dropdown trigger**: lighten the 3-dot menu icon inside table rows while keeping card versions untouched.
- **Deployments UI**: 
  - Audit `/deployments` dashboard so it only surfaces deployments belonging to the signed-in user, grouped by environment and prompt/version.
  - Confirm prompt detail’s Deployments tab shows scoped history; adjust empty states, badges, and CTA placement to match the updated visual language.
  - Style any new scroll regions or tables (e.g., environment history) with the same scrollbar treatment and contrast fixes.

---

## Backend & Integration Follow-Up
- Confirm merged Prompt Hub still hits the same RTK Query endpoints (`getPrompts`, filters). Adjust queries only if the UI consolidation requires new payload shapes.
- Smoke-test cloning, visibility toggles, and personal/public filters after the UI overhaul.

---

## QA & Validation
- Visual regression sweep in both dark/light themes for every tab and empty state.
- Keyboard navigation pass over tab controls, filter chips, and dropdown menus post-style changes.
- Manual verification that card/table toggles persist state, filters update the query params, and clone buttons remain wired to backend mutations.
- Deployments acceptance: verify creating deployments from a prompt routes through the scoped backend, that `/deployments` displays only the user’s data, and environment history lists are accurate per prompt.
