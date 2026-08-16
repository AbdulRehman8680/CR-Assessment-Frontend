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


## 2. Component & state model
<!-- The screens, the view-state each component exposes, and how data flows from the mock API into the
template. -->

The app is two-screen reviewer UI on the top of mock CR API. The list screen fetches the CR  summaries allowed for the active user. Then applies  the status filter  on the rows and then render them as a table. The details screen loads one CR object and display these details from that object: a line-item difference between the baseline and the proposed change, an approval timeline and the Approve/Reject buttons. 
Both of the components have async data in ViewState with these states: (idle>loading>loaded/empty/error)
The current user comes from the SessionService and carries the CR action and the allowed scope from the policy string. It then combines with the CR status to decide which actions are allowed for the current user.

## 3. Invariants I keep
<!-- Which properties the UI guarantees, and where in the component/template each is enforced. -->

| Invariant | How / where |
|---|---|

## 4. Testing strategy
<!-- What you tested (component/DOM vs pure) and why; what you deliberately skipped given the budget. -->

-

## 5. Assumptions
<!-- Where the requirements left room for interpretation, the calls you made and why. -->

- A description-only edit counts as a *changed* line, not an unchanged one. If a change is done only in description and entitle it as "Replace SKU-B supplier" but we compare  only the quantity and the price. The preview panel will render it as unchanged, which contradicts the CR title and the change note description. 

## 6. Where I used AI
-

## 7. What I'd improve with more time
-
