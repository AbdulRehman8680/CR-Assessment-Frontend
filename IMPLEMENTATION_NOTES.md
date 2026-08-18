# Implementation Notes

## 1. What I changed

**Task 1: Fixes for the two failing tests.**

- `computeDiff` compared only `unitPrice`, so any line whose quantity or description changed was classified as `unchanged`. It now compares quantity, unit price and description.
- `canApprove` consulted only the CR's status, so a read-only viewer was offered an enabled Approve button on a pending CR. It now also requires an approve policy via the existing `canApprovePolicy()` helper.

**Task 2 — List.**

- *Component:* Implemented `visibleRows` to narrow rows by the active status filter ('ALL' shows everything).
- *Template:* Added a distinct "no matches" branch so a filter that hides every row shows a message rather than an empty table.

**Task 3 — Detail.**

- *Component:* Timeline is sorted oldest-first on a copy of `audit`, so the getter never mutates loaded data.
- *Component:* `canReject` now checks status and policy, matching `canApprove`.
- *Component:* Reject reason validated with `required` + `pattern(/\S/)`, so blank and whitespace-only are refused.
- *Component:* `approve()`/`reject()` go through a shared `runAction` helper that flags `submitting`, swaps in the `CrDetail` the API returns on success, and leaves the loaded CR untouched on failure.
- *Template:* Diff rows show the line description, so a description-only change is visible in the panel.
- *Template + styles:* timeline entries render as a flex row with a gap, and timestamps go through `DatePipe` in UTC — the raw ISO strings rendered edge-to-edge and unreadable.

**Task 4 — Roles and UX states.**

- *Component + template:* Action controls render for every user but are disabled unless status and policy both allow.`canApprove`/`canReject` drive the `[disabled]` bindings.
- *template:* Added a "Working…" indicator while an action is in flight.
- *Component + template:* the reason box is disabled through the `FormControl` (`syncRejectControl()`) rather than `[attr.disabled]`. The attribute binding was being overridden by the reactive-forms value accessor, which left the box typable for a read-only viewer.

**Task 5 — Tests.**

- Added 20 tests across the three specs: diff classification edge cases, list filter, (loading / error / retry), timeline ordering asserted in the DOM, the permission matrix, reject validation, and the action flows including failure, in-flight state and double-submit.

**Beyond the listed tasks.**

- While clicking through the UI I found the detail pane didn't follow the list selection. `CrDetailComponent` loaded in `ngOnInit`, which fires once, and the pane is never destroyed between selections — so the bound `id` changed while the rendered CR did not. 
- This matters more than it looked because `approve()` sends `this.id` while `canApprove` reads the loaded CR's status, the two could disagree and an action could target a CR the reviewer was never shown. Added `ngOnChanges` (guarded on `firstChange`, so the initial load still runs once) and a reset of the reason control per load.
- The existing tests assign `id` directly, which never triggers `ngOnChanges`, so I added a small host component with a real `[id]` binding to cover the actual input path.

## 2. Component & state model

- The app is a two-screen reviewer UI on the top of a mock CR API. The list screen fetches the CR summaries allowed for the active user. Then applies the status filter on the rows and then render them as a table. The details screen loads one CR object and display these details from that object: a line-item difference between the baseline and the proposed change, an approval timeline and the Approve/Reject buttons.
- Both of the components have async data in ViewState with these states: (idle>loading>loaded/empty/error). The current user comes from the SessionService and carries the CR action and the allowed scope from the policy string. It then combines with the CR status to decide which actions are allowed for the current user.

## 3. Invariants I keep

| Invariant | How / where |
| --- | --- |
| An action is only offered when status and policy allow it | canApprove/canReject getters; re-checked at the top of approve()/reject() |
| At most one action in flight | submitting flag, set before the first await, cleared in finally |
| Reject cannot proceed without a non-blank reason | Validators.required + pattern(/\S/); re-checked in reject() |
| Every load outcome has a visible state | ViewState status drives one *ngIf branch each in both templates |
| A failed action never destroys loaded data | runAction only assigns state on success |
| The reason box is only editable when the user may actually reject | syncRejectControl(), called after every load and every action |
| The CR on screen is always the CR an action targets | ngOnChanges reloads when the bound `id` changes; actions read `this.id` and the loaded status together |

## 4. Testing strategy

- For anything a user sees I tested the pure logic and the rendered DOM separately. `computeDiff` is a plain function so I test it directly. Everything else goes through TestBed and checks what actually renders: which branch is shown, whether a button is disabled, what order the timeline is in. If I refactor the component but the behaviour stays the same, the tests should still pass.
- Tests drive `latencyMs` and `failNext` on the mock API instead of waiting on real time. `latencyMs` is only raised *after* the initial load, so the slow path is exercised without making every assertion race the loader.
- For the permission rule I tested both halves: a user who is allowed but the CR is not pending, and a pending CR where the user is not allowed. That way the "status AND policy" rule cannot pass by accident. Validation is tested with empty input, spaces only, and a real reason.
- A failed load, a failed action, retry after failure, and a second action fired while one is in flight.
- What I skipped: `app.component` is only demo glue for the walkthrough, and `formatMoney` is already covered through the rendered totals. No end-to-end tests, there was not budget for them.
- I left the two originally failing tests exactly as they were, so it is clear they pass because the code was fixed and not because I changed what they expect.

## 5. Assumptions

- A description-only edit counts as a changed line. `CR-2` only changes SKU-B's description, but the CR is titled "Replace SKU-B supplier". If I compared quantity and price only, that CR's preview would say everything is unchanged, which contradicts the CR itself.
- Rejecting uses the approve policy (`cr_a_*`). The README only defines read, approve and apply, so there is no separate reject permission to check.
- Action controls stay visible and get disabled instead of being hidden. The detail test that shipped with the exercise expects a read-only viewer to see a disabled Approve button, so I did the same for Reject and the reason box.
- A filter that matches nothing is not the same as an org with no CRs. `ViewState` keeps describing the load, and the template decides what to show when the filter hides every row.
- Timeline timestamps are rendered in UTC. An audit trail that moves around depending on who is looking at it would be misleading.

## 6. Where I used AI

- Used an AI assistant throughout — exploring the codebase, talking through design decisions, drafting implementations, and reviewing the result. I reviewed every change before it landed.

## 7. What I'd improve with more time

- Approving or rejecting doesn't refresh the list pane, so it shows the old status until reload. The demo shell owns both panes; syncing them properly needs shared state rather than two independent components.
- `diff`, `visibleRows`, and `timeline` are getters, so they recompute on every change-detection cycle. That's fine at fixture scale and keeps the state model simple, but with a real list I'd memoize on the loaded data or move to observables rather than recompute per cycle.
