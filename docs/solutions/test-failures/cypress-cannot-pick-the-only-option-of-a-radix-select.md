---
title: Cypress cannot pick the only option of a Radix Select
date: 2026-11-01
category: test-failures
module: web e2e (Cypress)
problem_type: test_failure
component: testing_framework
symptoms:
  - "`cy.get('[role=\"option\"]').first().click()` leaves the Select open (`[role=\"listbox\"]` is still in the DOM)"
  - "The next click (usually the form submit) fails because `<body>` has `style=\"pointer-events: none\"`"
  - Happens only when the Select has a single option; the same helper works on Selects with several options
root_cause: wrong_api
resolution_type: test_fix
severity: medium
framework_version: "@radix-ui/react-select 1.2.2, cypress 13.2.0"
related_components:
  - frontend
tags: [cypress, radix-ui, select, pointer-events, e2e]
---

# Cypress cannot pick the only option of a Radix Select

## Problem
An e2e test that opens the app's `Select` (a Radix Select) and clicks its only option never selects it. The listbox stays open, and the test then fails on an unrelated-looking click with a `pointer-events: none` error, which points the investigation at the wrong thing.

## Symptoms
- The bank-account Select in the Dashboard expense form, with one account created by the test, stays open after `cy.get('[role="option"]').first().click()`.
- The following `cy.get('#transactionSubmit').click()` fails with "has CSS `pointer-events: none`, inherited from `<body style="pointer-events: none;">`".
- The category Select in the same form, which has many options, closes normally with the same helper.

## What Didn't Work
- Treating it as a stuck Radix `pointer-events` lock (the Dialog is opened from a Radix DropdownMenu, a known source of that lock) and forcing the submit with `click({ force: true })`. The submit then "works", but the option was never selected, so the assertion that hides the real problem is the force.
- Waiting for the DropdownMenu to close (`cy.get('[role="menu"]').should('not.exist')`) and forcing the option click. The listbox still stayed open.
- Asserting that `<body>` has no `pointer-events: none`. In this session that assertion failed even with the Dialog working, because a modal Radix Dialog keeps that style on `<body>` while open and re-enables pointer events on its own content (Radix DismissableLayer behavior, not code in this repo).
- The same flow failed identically on the code before the change under test, which is what showed it was a test-harness interaction and not a regression.

## Solution
Give the Select at least two options in the test, pick an option that is not the first by label or with `.last()`, and assert the listbox closed before moving on. No forced clicks.

```ts
// web/cypress/e2e/wishlist.cy.ts
function selectLastOption(id: string) {
  cy.get(`#${id}`).click()
  cy.get('[role="option"]').last().click()
  cy.get('[role="listbox"]').should('not.exist')
}

it('keeps the Dashboard new expense and new income forms working', () => {
  signUp()
  cy.createBankAccount('Inter')   // two accounts, so the picked option is not over the trigger
  cy.createBankAccount('Nubank')
  // ...
  selectLastOption('transactionCategoryId')
  selectLastOption('transactionBankAccountId')
  cy.get('#transactionSubmit').click()   // normal click, no force
})
```

Picking by label among several options (`selectOption(id, label)` in `cards.cy.ts` and `debts.cy.ts`) works for the same reason.

## Why This Works
`web/src/view/components/Select.tsx` renders `RdxSelect.Content` without a `position` prop, so Radix uses its default `position = 'item-aligned'` (`web/node_modules/@radix-ui/react-select/dist/index.mjs:311`, the installed 1.2.2 package, not a tracked file). Item-aligned positioning places the selected item, or the first item when nothing is selected, exactly over the trigger. To avoid selecting by accident when the user presses on the trigger and releases, Radix records the trigger's pointer-down position and calls `preventDefault()` on a pointer-up that moved 10px or less from it (`index.mjs:385`).

Cypress clicks an element at its center. With one option, that center sits on the trigger's center, so the option's pointer-up lands within 10px of the trigger's pointer-down and Radix discards it. The listbox stays open. The Select content layer disables outside pointer events while it is open (`disableOutsidePointerEvents: true`, `index.mjs:502`), so the Dialog content behind it stops taking clicks, and Cypress reports the next click as blocked by the `pointer-events: none` inherited from `<body>`. With two or more options, the last option sits below the trigger, the pointer-up moves more than 10px, and the selection goes through. A real user moves the mouse between pressing and releasing, so the app itself is fine.

## Prevention
- In Cypress specs, never pick the only option of a Select by clicking it. Create at least two options in the test data and pick by label, or pick `.last()`.
- After picking, assert `cy.get('[role="listbox"]').should('not.exist')`. It fails right at the cause instead of on the next click.
- Treat a `pointer-events: none` error on a click inside a Radix Dialog as "some Radix layer is still open" first, and look for an open listbox or menu before reaching for `{ force: true }`. A forced click can hide that a selection never happened.
- If a spec truly needs a single-option Select, keyboard selection should avoid the pointer-up check; this was not tried in this session, so verify it before relying on it.

## Related Issues
- Found while adding the Dashboard regression scenario for the extracted `TransactionFormModal` in the Wishlist feature (plan `docs/plans/2026-11-01-1547-feat-wishlist-plan.md`, unit U8).
