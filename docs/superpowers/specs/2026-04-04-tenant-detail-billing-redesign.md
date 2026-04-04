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

### Modified sections
- **Recent Invoices** — reduce fetch limit from 6 to 3; each row becomes clickable, opening an Invoice Detail modal
- **Last Payments** — reduce fetch limit from 6 to 3; each row becomes clickable, opening a Payment Detail modal
- **Receipts** — reduce fetch limit from 6 to 3; each row becomes clickable, opening a Receipt Detail modal

### New sections
- **Send Bill via SMS card** — half-width card placed above the Tenant Communication section

---

## Detail Modals

### Invoice Detail Modal
Opens when clicking any invoice row. Displays:
- Invoice number, status chip, billing period
- Invoice amount, outstanding balance, amount paid
- Plan name, payment count, latest payment date
- Created at, updated at

**Actions** (visible only when `status === 'UNPAID' || status === 'PPAID'`):
- **Adjust Invoice** — opens inline fields for amount and period, calls `PATCH /billing/invoices/:id` (same as Billing.tsx `adjustInvoice`)
- **Cancel Invoice** — calls `POST /billing/invoices/:id/cancel` (same as Billing.tsx `cancelInvoice`)

### Payment Detail Modal
Opens when clicking any payment row. Read-only display:
- Amount, mode of payment
- Transaction ID (or "Manual payment" if null)
- Linked invoice numbers
- Paid at, recorded at

No actions — no delete API exists.

### Receipt Detail Modal
Opens when clicking any receipt row. Read-only display:
- Receipt number, amount, mode of payment
- Transaction ID (or "—" if null)
- Billing period
- SMS status (sent timestamp or "Pending")

No actions.

---

## Send Bill via SMS

### Card (half-width, `xs={12} md={6}`)
Placed in its own grid row above the Tenant Communication section.

Shows:
- Latest unpaid invoice number and balance (or "No outstanding invoices" if none)
- Tenant primary contact (phone number)
- "Send Bill SMS" button — opens the Send Bill Modal

Disabled state: if no phone number on tenant and no unpaid invoices, button is disabled with explanatory text.

### Send Bill Modal
A `Dialog` containing:
- **Recipient field** — pre-filled with `tenant.phoneNumber || tenant.alternativePhoneNumber`; editable text field
- **Message field** — multiline text field, pre-filled with a bill message composed from:
  - Tenant name
  - Latest unpaid invoice number and amount
  - Paybill number from `platformSmsSender` (falls back to `'4091081'`)
  - Tenant phone number as account reference
- **Send** button — calls `POST /support/send-sms` with `{ tenantId, recipients, message }`
- **Cancel** button

Pre-fill message format:
```
Dear {tenantName}, your platform bill for {invoicePeriod} is {amount} (outstanding). Kindly pay via Paybill {paybill}, Acc: {phoneNumber}. Thank you.
```

If there are no unpaid invoices, the message falls back to the outstanding balance figure from `outstandingBalance`.

---

## State additions

```ts
// Detail modals
invoiceDetailTarget: PlatformInvoice | null
paymentDetailTarget: PlatformPayment | null
receiptDetailTarget: PlatformReceipt | null

// Invoice adjust (within invoice detail modal)
adjustAmountDraft: string
adjustPeriodDraft: string
adjusting: boolean

// Invoice cancel (within invoice detail modal)
cancelling: boolean

// Send Bill modal
sendBillOpen: boolean
sendBillRecipientDraft: string
sendBillMessageDraft: string
sendingBill: boolean
```

---

## API calls

| Action | Endpoint | Exists? |
|--------|----------|---------|
| Load invoices | `GET /billing/invoices?tenantId=&limit=3` | Yes — change limit 6→3 |
| Load payments | `GET /billing/payments?tenantId=&limit=3` | Yes — change limit 6→3 |
| Load receipts | `GET /receipts/tenant?tenantId=&limit=3` | Yes — change limit 6→3 |
| Adjust invoice | `PATCH /billing/invoices/:id` | Yes |
| Cancel invoice | `POST /billing/invoices/:id/cancel` | Yes |
| Send Bill SMS | `POST /support/send-sms` | Yes |

No new API endpoints required.

---

## Layout after changes

```
Row 1:  Tenant Profile (8/12)  |  Status Control (4/12)
Row 2:  Tenant Settings (12/12)
Row 3:  Invoices (4/12)  |  Payments (4/12)  |  Receipts (4/12)
Row 4:  Customer Stats (6/12)  |  Subscription (6/12)
Row 5:  Engagement (6/12)  |  Recent Billing (4/12)  |  Counters (4/12) [existing, not yet on screen — keep as-is]
Row 6:  Send Bill (6/12)  |  [empty 6/12]
Row 7:  Tenant Communication (12/12)
```

---

## Out of scope
- Delete payment (no API)
- SMS Top Up (removed, not moved elsewhere)
- Support Notes (removed, not moved elsewhere)
- Changes to Billing.tsx
