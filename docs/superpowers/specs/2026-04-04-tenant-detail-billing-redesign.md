# Tenant Detail — Billing & Communication Redesign

**Date:** 2026-04-04
**File:** `src/pages/tenants/TenantDetail.tsx`

---

## Overview

Restructure the Tenant Detail screen to focus on viewing financial history with clickable detail modals, remove action forms that belong in the Billing page, and add a targeted "Send Bill via SMS" feature.

---

## Changes Summary

### Removed sections
- **Manual Payment form** — recording payments is done from the Billing page
- **Manual Invoice form** — creating invoices is done from the Billing page
- **SMS Top Up card** — removed entirely from this screen
- **Support Notes section** — removed entirely
- **Billing Queue card** — removed (it duplicates the Invoices card in Row 3; `recentInvoices` is only used by this card and by `invoicePreview`, both of which are updated here)

### Modified sections
- **Recent Invoices** — display changes from 4 to 3 items. The invoice API fetch limit stays at `25` (needed to power `openInvoices`, `outstandingBalance`, and the Send Bill card). The `invoicePreview` memo collapses to `billingInvoices.slice(0, 3)`. The `recentInvoices` intermediate memo is removed (it is only used by `invoicePreview` and the removed Billing Queue card). Each rendered invoice row is now clickable — opens Invoice Detail modal.
- **Last Payments** — fetch limit changes from `6` to `3`. The `paymentPreview` memo updates to `tenantPayments.slice(0, 3)`. Each row is clickable — opens Payment Detail modal.
- **Receipts** — fetch limit changes from `6` to `3`. The `receiptPreview` memo updates to `tenantReceipts.slice(0, 3)`. Each row is clickable — opens Receipt Detail modal.

### New sections
- **Send Bill via SMS card** — half-width (`xs={12} md={6}`) placed in its own row above the Tenant Communication section. The other half of the row is intentionally left empty.

---

## State: additions

```ts
// Detail modals — which record is open
invoiceDetailTarget: PlatformInvoice | null        // null = closed
paymentDetailTarget: PlatformPayment | null        // null = closed
receiptDetailTarget: PlatformReceipt | null        // null = closed

// Invoice adjust fields (within Invoice Detail modal)
adjustAmountDraft: string       // see openInvoiceDetail handler below
adjustPeriodDraft: string       // see openInvoiceDetail handler below
adjusting: boolean              // true while PATCH /billing/invoices/:id is in-flight

// Invoice cancel (within Invoice Detail modal)
cancelling: boolean             // true while POST /billing/invoices/:id/cancel is in-flight

// Send Bill modal
sendBillOpen: boolean
sendBillRecipientDraft: string  // initialised on modal open, see openSendBill handler below
sendBillMessageDraft: string    // initialised on modal open, see openSendBill handler below
sendingBill: boolean
```

---

## State: removals

Remove the following state fields — they are only used by the removed forms/sections:

- `invoiceAmountDraft`, `invoicePeriodDraft`, `creatingInvoice` (Manual Invoice form)
- `paymentAmountDraft`, `paymentModeDraft`, `paymentReferenceDraft`, `paymentInvoiceIdDraft`, `paidAtDraft`, `recordingPayment` (Manual Payment form)
- `toppingUpSms`, `smsTopUpUnitsDraft`, `smsTopUpReasonDraft` (SMS Top Up)
- `noteDraft`, `noteSaving` (Support Notes)

Remove the following memos/derived values:
- `recentInvoices` (only used by `invoicePreview` and Billing Queue card — both updated)
- `selectedInvoice` (was used by Manual Payment form to show selected balance)

Remove the following functions:
- `createManualInvoice`
- `recordManualPayment`
- `topUpTenantSms`
- `createNote`

Remove the following dead top-level constants and imports:
- `paymentModes` array (only used by Manual Payment form)
- `getCurrentMonthInput` function (only used by Manual Invoice form)
- `getCurrentDateTimeInput` function (only used by Manual Payment form)
- `ModeOfPayment` type import (only used by Manual Payment form and `paymentModes`)
- `SelectChangeEvent` import (only used by Manual Payment and Status select — check: Status select also uses `SelectChangeEvent<TenantStatus>`, so keep `SelectChangeEvent` if the status select remains)

Keep `toAmountInput` — it is reused to initialise `adjustAmountDraft` in `openInvoiceDetail`.

Note on `ModeOfPayment` import: it is only used in `TenantDetail.tsx` for `paymentModeDraft` state and the `paymentModes` array — both removed. The field-level typing (`payment.modeOfPayment`, `receipt.modeOfPayment`) lives inside `PlatformPayment` and `PlatformReceipt` in `types.ts` and does not require a standalone `ModeOfPayment` import in this file. Safe to remove.

Note on `refreshTenantWorkspace`: the existing `setSmsRecipientsDraft(...)` call inside `refreshTenantWorkspace` (lines ~324–329) must be kept — it is used by the Tenant Communication section which remains on the screen. The new `sendBillRecipientDraft` is a separate state field initialised in `openSendBill`, not in `refreshTenantWorkspace`.

---

## Handler: `openInvoiceDetail(invoice: PlatformInvoice)`

This replaces a bare `setInvoiceDetailTarget` call. It must set all three pieces of state together:

```ts
const openInvoiceDetail = (invoice: PlatformInvoice) => {
  setInvoiceDetailTarget(invoice);
  setAdjustAmountDraft(toAmountInput(invoice.invoiceAmount));
  setAdjustPeriodDraft(invoice.invoicePeriod);
  setAdjusting(false);
  setCancelConfirming(false);
  setCancelling(false);
};
```

Closing the modal: the `onClose` handler must call both `setInvoiceDetailTarget(null)` AND `setCancelConfirming(false)`. Drafts do not need resetting on close because `openInvoiceDetail` always re-initialises them when the modal next opens, but `cancelConfirming` is not reset by `openInvoiceDetail` alone if the modal is closed directly without reopening.

---

## Invoice Detail Modal

Opens when clicking any invoice row (`onClick={() => openInvoiceDetail(invoice)}`).

Displays (read-only section, always visible):
- Invoice number (`invoice.invoiceNumber`)
- Status chip (`invoice.status`)
- Billing period (`invoice.invoicePeriod` — formatted with `formatDate`)
- Invoice amount (`invoice.invoiceAmount` — formatted with `currencyFormatter`)
- Outstanding balance (`invoice.balance` — formatted)
- Amount paid (`invoice.amountPaid` — formatted)
- Plan name (`invoice.plan.name`)
- Payment count (`invoice.paymentCount`)
- Latest payment at (`invoice.latestPaymentAt ? formatDateTime(invoice.latestPaymentAt) : '—'`)
- Created at (`formatDateTime(invoice.createdAt)`)
- Updated at (`formatDateTime(invoice.updatedAt)`)

**Actions section** — only rendered when `invoiceDetailTarget.status === 'UNPAID' || invoiceDetailTarget.status === 'PPAID'`:

### Adjust Invoice
Input fields shown inline within the modal (below the read-only section):
- `TextField` for `adjustAmountDraft` (type=number, min=1, step=0.01)
- `TextField` for `adjustPeriodDraft` (type=month)

Validation before API call:
- `invoiceAmount = parseFloat(adjustAmountDraft)` — must be finite and > 0; if not, call `setError('Enter a valid invoice amount greater than zero.')` and return
- `adjustPeriodDraft` must be non-empty; if not, call `setError('Choose the invoice month before adjusting.')` and return

API call: `PATCH /billing/invoices/:id` with `{ invoiceAmount, invoicePeriod: adjustPeriodDraft }`.

`adjusting` is set `true` before the call and `false` in the `finally` block. While `adjusting` is true: the Adjust submit button shows "Adjusting…" and is disabled; the modal close button (and Cancel Invoice button) are also disabled.

On success: call `refreshTenantWorkspace(tenant.id)`, call `setSuccess(...)`, call `setInvoiceDetailTarget(null)` to close.
On failure: call `setError(...)`. Modal stays open.

### Cancel Invoice
A single "Cancel Invoice" button (color="warning", variant="outlined"). Because the modal itself is already a confirmation step (user sees the invoice before acting), no secondary dialog is needed. Instead use an inline two-step pattern:
- First click: button text changes to "Confirm cancel?" and a secondary "No, go back" link/button appears next to it
- Second click on "Confirm cancel?": fires the API call

Implementation: add a local boolean state `cancelConfirming` (set true on first click, false when "go back" is clicked or modal closes).

API call: `POST /billing/invoices/:id/cancel`.

`cancelling` is set `true` before the call and `false` in `finally`. While `cancelling`: button shows "Cancelling…" and is disabled; modal close and Adjust buttons are also disabled.

On success: call `refreshTenantWorkspace(tenant.id)`, call `setSuccess(...)`, call `setInvoiceDetailTarget(null)`.
On failure: call `setError(...)`. Modal stays open.

Add `cancelConfirming: boolean` to the state additions list. Reset to `false` in `openInvoiceDetail`.

---

## Payment Detail Modal

Opens when clicking any payment row. Read-only. No actions.

Display fields:
- Amount (`currencyFormatter.format(payment.amount)`)
- Mode of payment (`payment.modeOfPayment`)
- Transaction ID (`payment.transactionId ?? 'Manual payment'`)
- Linked invoices (`payment.linkedInvoiceNumbers.length ? payment.linkedInvoiceNumbers.join(', ') : '—'`)
- Paid at (`formatDateTime(payment.createdAt)`)

---

## Receipt Detail Modal

Opens when clicking any receipt row. Read-only. No actions.

Display fields:
- Receipt number (`receipt.receiptNumber`)
- Amount (`currencyFormatter.format(receipt.amount)`)
- Mode of payment (`receipt.modeOfPayment`)
- Transaction ID (`receipt.transactionId ?? '—'`)
- Billing period (`formatDate(receipt.billingPeriod)`)
- SMS status (`receipt.smsSentAt ? \`Sent ${formatDateTime(receipt.smsSentAt)}\` : 'Pending'`)

`createdAt` is intentionally omitted — the receipt is identified by receipt number and the billing period is more meaningful than a technical timestamp.

---

## Send Bill via SMS

### Card (half-width: `xs={12} md={6}`)

Shows:
- Latest unpaid invoice summary: `openInvoices[0]` number and balance (if `openInvoices.length > 0`)
- Tenant primary contact phone

**Disabled conditions** (evaluated in priority order for helper text):
1. `openInvoices.length === 0` → button disabled, helper text: `"No outstanding invoices"`
2. `!tenant.phoneNumber && !tenant.alternativePhoneNumber` → button disabled, helper text: `"No phone number on file"`

When both conditions are true simultaneously, condition 1 takes priority — show `"No outstanding invoices"`.

Display the helper text as a `Typography variant="body2" color="text.secondary"` below the button (not a tooltip — MUI tooltips do not fire on disabled buttons without a wrapper). Only show helper text when the button is actually disabled.

**Button enabled:** calls `openSendBill()`.

### Handler: `openSendBill()`

Only called when `openInvoices.length > 0` and a phone number exists (guarded by the button's disabled state). Initialises modal state and opens:

```ts
const openSendBill = () => {
  const recipient = tenant.phoneNumber || tenant.alternativePhoneNumber || '';
  const invoice = openInvoices[0];
  const paybill = platformSmsSender?.shortCode ?? '4091081';
  const message = `Dear ${tenant.name}, your platform bill for ${formatDate(invoice.invoicePeriod)} is ${currencyFormatter.format(invoice.balance)} (outstanding). Kindly pay via Paybill ${paybill}, Acc: ${recipient}. Thank you.`;
  setSendBillRecipientDraft(recipient);
  setSendBillMessageDraft(message);
  setSendBillOpen(true);
};
```

### Send Bill Modal (MUI Dialog)

- **Recipient field** — `TextField` bound to `sendBillRecipientDraft`, editable
- **Message field** — multiline `TextField` bound to `sendBillMessageDraft`, editable, `minRows={4}`
- **Send button** — calls `POST /support/send-sms` with `{ tenantId: tenant.id, recipients: sendBillRecipientDraft, message: sendBillMessageDraft }`. `sendingBill` set true/false around the call. Button shows "Sending…" and is disabled while `sendingBill`. On success: `setSendBillOpen(false)`, `setSuccess(\`Bill sent to ${tenant.name}.\`)`. On failure: `setError(...)`, modal stays open.
- **Cancel button** — `setSendBillOpen(false)`, disabled while `sendingBill`

---

## Layout after changes

```
Row 1:  Tenant Profile (8/12)  |  Status Control (4/12)
Row 2:  Tenant Settings (12/12)
Row 3:  Invoices (4/12)  |  Payments (4/12)  |  Receipts (4/12)
Row 4:  Customer Stats (6/12)  |  Subscription (6/12)
Row 5:  Engagement Snapshot (6/12)  |  Counters (6/12)
Row 6:  Recent Billing summary (6/12)  |  [empty 6/12]
Row 7:  Send Bill (6/12)  |  [empty — other 6/12 is left blank]
Row 8:  Tenant Communication (12/12)
```

Cards kept as-is with no changes:
- **Customer Stats** (lines ~1311–1345)
- **Subscription** (lines ~1347–1370)
- **Engagement Snapshot** (lines ~1372–1429)
- **Counters** (lines ~1469–1497) — previously in its own row alongside "Recent Billing summary", now paired with Engagement in Row 5
- **Recent Billing summary** (lines ~1431–1467) — shows open invoice count, outstanding balance, latest payment/invoice text

Note: the existing source has Counters at `xs={12} md={6}` already (lines ~1469–1497). Move it to share Row 5 with Engagement Snapshot (both 6/12). Recent Billing summary moves to Row 6 alone.

---

## State additions (complete final list)

```ts
invoiceDetailTarget: PlatformInvoice | null   = null
paymentDetailTarget: PlatformPayment | null   = null
receiptDetailTarget: PlatformReceipt | null   = null
adjustAmountDraft: string                      = ''
adjustPeriodDraft: string                      = ''
adjusting: boolean                             = false
cancelConfirming: boolean                      = false
cancelling: boolean                            = false
sendBillOpen: boolean                          = false
sendBillRecipientDraft: string                 = ''
sendBillMessageDraft: string                   = ''
sendingBill: boolean                           = false
```

---

## Out of scope
- Delete payment (no API)
- SMS Top Up (removed, not moved elsewhere)
- Support Notes (removed, not moved elsewhere)
- Changes to Billing.tsx
