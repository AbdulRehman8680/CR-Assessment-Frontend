# Implementation Notes

## 1. What I changed
<!-- Grouped by task: bugs fixed and features implemented (component + template). -->

**Task 1: Fixes for the two failing tests.**

- `computeDiff` compared only `unitPrice`, so any line whose quantity or description
  changed was classified as `unchanged`. It now compares quantity, unit price and
  description.
- `canApprove` consulted only the CR's status, so a read-only viewer was offered an
  enabled Approve button on a pending CR. It now also requires an approve policy via
  the existing `canApprovePolicy()` helper.

**Task 2 — List.**

- Implemented `visibleRows` to narrow rows by the active status filter ('ALL' shows everything).
- Added a distinct "no matches" branch so a filter that hides every row shows a message
  rather than an empty table.

**Task 3 — Detail.**

- Timeline is sorted oldest-first on a copy of `audit`, so the getter never mutates loaded data.
- `canReject` now checks status and policy, matching `canApprove`.
- Reject reason validated with `required` + `pattern(/\S/)`, so blank and whitespace-only are refused.
- `approve()`/`reject()` go through a shared `runAction` helper that flags `submitting`, swaps in
  the `CrDetail` the API returns on success, and leaves the loaded CR untouched on failure.
- Diff rows show the line description, so a description-only change is visible in the panel.

**Task 4 — Roles and UX states.**

- Action controls render for every user but are disabled unless status and policy both allow.
- Added a "Working…" indicator while an action is in flight.

## 2. Component & state model
<!-- The screens, the view-state each component exposes, and how data flows from the mock API into the
template. -->

The app is a two-screen reviewer UI on the top of a mock CR API. The list screen fetches the CR summaries allowed for the active user. Then applies the status filter on the rows and then render them as a table. The details screen loads one CR object and display these details from that object: a line-item difference between the baseline and the proposed change, an approval timeline and the Approve/Reject buttons.
Both of the components have async data in ViewState with these states: (idle>loading>loaded/empty/error)
The current user comes from the SessionService and carries the CR action and the allowed scope from the policy string. It then combines with the CR status to decide which actions are allowed for the current user.

## 3. Invariants I keep
<!-- Which properties the UI guarantees, and where in the component/template each is enforced. -->

| Invariant | How / where |
| --- | --- |
| An action is only offered when status and policy allow it | canApprove/canReject getters; re-checked at the top of approve()/reject() |
| At most one action in flight | submitting flag, set before the first await, cleared in finally |
| Reject cannot proceed without a non-blank reason | Validators.required + pattern(/\S/); re-checked in reject() |
| Every load outcome has a visible state | ViewState status drives one *ngIf branch each in both templates |
| A failed action never destroys loaded data | runAction only assigns state on success |

## 4. Testing strategy
<!-- What you tested (component/DOM vs pure) and why; what you deliberately skipped given the budget. -->

-

## 5. Assumptions
<!-- Where the requirements left room for interpretation, the calls you made and why. -->

- A description-only edit counts as a *changed* line, not an unchanged one. `CR-2` changes nothing but SKU-B's description, yet is titled "Replace SKU-B supplier" — comparing only quantity and price would render that CR's preview as entirely unchanged, contradicting the CR itself.

- Rejecting is governed by the approve policy (`cr_a_*`). The README defines only three actions — read, approve, apply — so there is no separate reject permission to check.

- Action controls stay visible but disabled rather than being hidden. The shipped detail test expects a read-only viewer to *see* a disabled Approve button, so I applied that consistently to Reject and the reason box.

- A filter that matches nothing is a different state from an org with no CRs. `ViewState` keeps describing the load; the template decides what to show for an empty filter result.

- Timeline timestamps render in UTC so the audit trail doesn't shift with the viewer's timezone.

## 6. Where I used AI

Used an AI assistant throughout — exploring the codebase, talking through design
decisions, drafting implementations, and reviewing the result. I reviewed every
change before it landed.

## 7. What I'd improve with more time

- Approving or rejecting doesn't refresh the list pane, so it shows the old status until reload.
  The demo shell owns both panes; syncing them properly needs shared state rather than two
  independent components.
