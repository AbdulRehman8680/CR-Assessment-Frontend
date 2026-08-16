# Implementation Notes
The app is two-screen reviewer UI on the top of mock CR API. The list screen fetches the CR  summaries allowed for the active user. Then applies  the status filter  on the rows and then render them as a table. The details screen loads on CR object and display these details form that object: a line-item difference between the baseline and the proposed change, an approval timeline and the Approve/Reject buttons. 
Both of the components have async in ViewState with these states: (idle>loading>loaded/empty/error)
The current user comes from the SessionService and carries the CR action and the allowed scope from the policy string. It then combine with the CR status to decide which actions are allowed for the current user.

## 1. What I changed
<!-- Grouped by task: bugs fixed and features implemented (component + template). -->

-

## 2. Component & state model
<!-- The screens, the view-state each component exposes, and how data flows from the mock API into the
template. -->

-

## 3. Invariants I keep
<!-- Which properties the UI guarantees, and where in the component/template each is enforced. -->

| Invariant | How / where |
|---|---|

## 4. Testing strategy
<!-- What you tested (component/DOM vs pure) and why; what you deliberately skipped given the budget. -->

-

## 5. Assumptions
<!-- Where the requirements left room for interpretation, the calls you made and why. -->

-

## 6. Where I used AI
-

## 7. What I'd improve with more time
-
