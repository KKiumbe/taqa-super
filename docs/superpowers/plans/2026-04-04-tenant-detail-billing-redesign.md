# Tenant Detail Billing Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure TenantDetail.tsx to show last 3 clickable invoice/payment/receipt cards with detail modals, remove action forms (manual invoice, manual payment, SMS top-up, support notes), and add a Send Bill via SMS modal.

**Architecture:** All changes are in a single file (`TenantDetail.tsx`). State surgery first (removals then additions), then handler/function additions, then JSX updates (card interactivity, section removals, layout reorder, new modals). TypeScript typecheck is the verification gate at each commit.

**Tech Stack:** React 19, TypeScript, MUI v6, Axios, React Router v7

**Spec:** `docs/superpowers/specs/2026-04-04-tenant-detail-billing-redesign.md`

---

## Chunk 1: State surgery — removals

### Task 1: Remove dead state fields

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx:156-187`

Remove the following `useState` declarations (they are only used by forms/sections being removed):

- [ ] **Step 1: Remove Manual Invoice form state**

Delete these lines (~156-157, ~170):
```ts
const [invoiceAmountDraft, setInvoiceAmountDraft] = useState('');
const [invoicePeriodDraft, setInvoicePeriodDraft] = useState(getCurrentMonthInput());
const [creatingInvoice, setCreatingInvoice] = useState(false);
```

- [ ] **Step 2: Remove Manual Payment form state**

Delete these lines (~158-162, ~171):
```ts
const [paymentAmountDraft, setPaymentAmountDraft] = useState('');
const [paymentModeDraft, setPaymentModeDraft] = useState<ModeOfPayment>('MPESA');
const [paymentReferenceDraft, setPaymentReferenceDraft] = useState('');
const [paymentInvoiceIdDraft, setPaymentInvoiceIdDraft] = useState('');
const [paidAtDraft, setPaidAtDraft] = useState(getCurrentDateTimeInput());
const [recordingPayment, setRecordingPayment] = useState(false);
```

- [ ] **Step 3: Remove SMS Top Up state**

Delete these lines (~173-175):
```ts
const [toppingUpSms, setToppingUpSms] = useState(false);
const [smsTopUpUnitsDraft, setSmsTopUpUnitsDraft] = useState('');
const [smsTopUpReasonDraft, setSmsTopUpReasonDraft] = useState('Platform SMS top-up');
```

- [ ] **Step 4: Remove Support Notes state**

Delete these lines (~176-177):
```ts
const [noteDraft, setNoteDraft] = useState('');
const [noteSaving, setNoteSaving] = useState(false);
```

- [ ] **Step 5: Remove `setInvoiceAmountDraft` call inside `loadWorkspace`**

In the `loadWorkspace` effect (~lines 225–227), delete:
```ts
setInvoiceAmountDraft((current) =>
  current || toAmountInput(tenantResponse.data.tenant.monthlyCharge)
);
```
This call-site survives function removal and will produce a TS error if not explicitly deleted.

- [ ] **Step 6: Run typecheck — expect errors (references to deleted state still exist in JSX and functions)**

```bash
cd /Volumes/Software/Multi/web/super-admin && npm run typecheck 2>&1 | head -60
```

Expected: TypeScript errors about missing identifiers. This is expected — JSX and functions referencing these fields will be removed in later tasks. Any remaining `paymentInvoiceIdDraft` JSX references (Manual Payment form Select, ~lines 1589–1592) will also be removed in the JSX cleanup task.

---

### Task 2: Remove dead top-level constants and functions

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx`

- [ ] **Step 1: Remove `paymentModes` constant**

Delete lines ~39-45:
```ts
const paymentModes: ModeOfPayment[] = [
  'MPESA',
  'BANK_TRANSFER',
  'CASH',
  'CREDIT_CARD',
  'DEBIT_CARD',
];
```

- [ ] **Step 2: Remove `getCurrentMonthInput` and `getCurrentDateTimeInput` functions**

Delete lines ~47-56:
```ts
const getCurrentMonthInput = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getCurrentDateTimeInput = (): string => {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
};
```

- [ ] **Step 3: Remove `createManualInvoice` function**

Delete the entire `createManualInvoice` async function (~lines 569-604).

- [ ] **Step 4: Remove `recordManualPayment` function**

Delete the entire `recordManualPayment` async function (~lines 606-658).

- [ ] **Step 5: Remove `topUpTenantSms` function**

Delete the entire `topUpTenantSms` async function (~lines 490-519).

- [ ] **Step 6: Remove `createNote` function**

Delete the entire `createNote` async function (~lines 660-693).

- [ ] **Step 7: Remove dead `ModeOfPayment` import**

In the import from `'../../types'` (~line 29), remove `ModeOfPayment` from the import list. Keep all other imports including `SelectChangeEvent` (still used by the Status select).

The import list should go from:
```ts
import {
  ModeOfPayment,
  PlatformInvoice,
  PlatformPayment,
  PlatformReceipt,
  TenantDetail as TenantDetailType,
  TenantCustomerStats,
  TenantStatus,
} from '../../types';
```
to:
```ts
import {
  PlatformInvoice,
  PlatformPayment,
  PlatformReceipt,
  TenantDetail as TenantDetailType,
  TenantCustomerStats,
  TenantStatus,
} from '../../types';
```

- [ ] **Step 8: Remove dead `selectedInvoice` and `recentInvoices` memos**

Delete (~line 361):
```ts
const recentInvoices = useMemo(() => billingInvoices.slice(0, 6), [billingInvoices]);
```

Delete (~lines 363-366):
```ts
const selectedInvoice = useMemo(
  () => openInvoices.find((invoice) => invoice.id === paymentInvoiceIdDraft) ?? null,
  [openInvoices, paymentInvoiceIdDraft]
);
```

- [ ] **Step 9: Update `invoicePreview` memo to use `billingInvoices.slice(0, 3)` directly**

Change (~line 368):
```ts
const invoicePreview = useMemo(() => recentInvoices.slice(0, 4), [recentInvoices]);
```
to:
```ts
const invoicePreview = useMemo(() => billingInvoices.slice(0, 3), [billingInvoices]);
```

- [ ] **Step 10: Update `paymentPreview` and `receiptPreview` memos to slice 3**

Change (~lines 369-370):
```ts
const paymentPreview = useMemo(() => tenantPayments.slice(0, 4), [tenantPayments]);
const receiptPreview = useMemo(() => tenantReceipts.slice(0, 4), [tenantReceipts]);
```
to:
```ts
const paymentPreview = useMemo(() => tenantPayments.slice(0, 3), [tenantPayments]);
const receiptPreview = useMemo(() => tenantReceipts.slice(0, 3), [tenantReceipts]);
```

---

## Chunk 2: State additions and new handlers/functions

### Task 3: Add new state declarations

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx` — state block (~line 183, after existing state declarations)

- [ ] **Step 1: Add detail modal target state + invoice action state + send bill state**

After the existing state declarations (after `const [financeRefreshKey, setFinanceRefreshKey] = useState(0);`), add:

```ts
// Detail modals
const [invoiceDetailTarget, setInvoiceDetailTarget] = useState<PlatformInvoice | null>(null);
const [paymentDetailTarget, setPaymentDetailTarget] = useState<PlatformPayment | null>(null);
const [receiptDetailTarget, setReceiptDetailTarget] = useState<PlatformReceipt | null>(null);

// Invoice detail — adjust
const [adjustAmountDraft, setAdjustAmountDraft] = useState('');
const [adjustPeriodDraft, setAdjustPeriodDraft] = useState('');
const [adjusting, setAdjusting] = useState(false);

// Invoice detail — cancel
const [cancelConfirming, setCancelConfirming] = useState(false);
const [cancelling, setCancelling] = useState(false);

// Send Bill modal
const [sendBillOpen, setSendBillOpen] = useState(false);
const [sendBillRecipientDraft, setSendBillRecipientDraft] = useState('');
const [sendBillMessageDraft, setSendBillMessageDraft] = useState('');
const [sendingBill, setSendingBill] = useState(false);
```

---

### Task 4: Add `openInvoiceDetail` handler

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx` — after the `useEffect` blocks, before existing functions

- [ ] **Step 1: Add handler after existing `useEffect`s (around line 333, after `refreshTenantWorkspace`)**

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

---

### Task 5: Add `adjustInvoice` and `cancelInvoice` functions

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx`

- [ ] **Step 1: Add `adjustInvoice` function**

Add after `openInvoiceDetail`:

```ts
const adjustInvoice = async () => {
  if (!invoiceDetailTarget) return;

  const invoiceAmount = Number.parseFloat(adjustAmountDraft);
  if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
    setError('Enter a valid invoice amount greater than zero.');
    return;
  }
  if (!adjustPeriodDraft) {
    setError('Choose the invoice month before adjusting.');
    return;
  }

  setAdjusting(true);
  setError(null);
  setSuccess(null);

  try {
    const response = await api.patch<{ invoice: PlatformInvoice }>(
      `/billing/invoices/${invoiceDetailTarget.id}`,
      { invoiceAmount, invoicePeriod: adjustPeriodDraft }
    );
    await refreshTenantWorkspace(tenant!.id);
    setSuccess(`Adjusted invoice ${response.data.invoice.invoiceNumber}.`);
    setInvoiceDetailTarget(null);
  } catch (err: any) {
    setError(err?.response?.data?.message ?? 'Failed to adjust invoice');
  } finally {
    setAdjusting(false);
  }
};
```

- [ ] **Step 2: Add `cancelInvoice` function**

Add after `adjustInvoice`:

```ts
const cancelInvoice = async () => {
  if (!invoiceDetailTarget) return;

  setCancelling(true);
  setError(null);
  setSuccess(null);

  try {
    const response = await api.post<{ invoice: PlatformInvoice; message?: string }>(
      `/billing/invoices/${invoiceDetailTarget.id}/cancel`
    );
    await refreshTenantWorkspace(tenant!.id);
    setSuccess(response.data.message ?? `Cancelled invoice ${invoiceDetailTarget.invoiceNumber}.`);
    setInvoiceDetailTarget(null);
  } catch (err: any) {
    setError(err?.response?.data?.message ?? 'Failed to cancel invoice');
  } finally {
    setCancelling(false);
    setCancelConfirming(false);
  }
};
```

---

### Task 6: Add `openSendBill` handler and `sendBillSms` function

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx`

- [ ] **Step 1: Add `openSendBill` handler**

Add after `cancelInvoice`:

```ts
const openSendBill = () => {
  if (!tenant || openInvoices.length === 0) return;
  const recipient = tenant.phoneNumber || tenant.alternativePhoneNumber || '';
  const invoice = openInvoices[0];
  const paybill = platformSmsSender?.shortCode ?? '4091081';
  const message = `Dear ${tenant.name}, your platform bill for ${formatDate(invoice.invoicePeriod)} is ${currencyFormatter.format(invoice.balance)} (outstanding). Kindly pay via Paybill ${paybill}, Acc: ${recipient}. Thank you.`;
  setSendBillRecipientDraft(recipient);
  setSendBillMessageDraft(message);
  setSendBillOpen(true);
};
```

- [ ] **Step 2: Add `sendBillSms` function**

Add after `openSendBill`:

```ts
const sendBillSms = async () => {
  if (!tenant) return;

  setSendingBill(true);
  setError(null);
  setSuccess(null);

  try {
    await api.post<{ message: string }>('/support/send-sms', {
      tenantId: tenant.id,
      recipients: sendBillRecipientDraft,
      message: sendBillMessageDraft,
    });
    setSendBillOpen(false);
    setSuccess(`Bill sent to ${tenant.name}.`);
  } catch (err: any) {
    setError(err?.response?.data?.message ?? 'Failed to send bill SMS');
  } finally {
    setSendingBill(false);
  }
};
```

- [ ] **Step 3: Run typecheck — expect errors only from removed JSX not yet cleaned up**

```bash
cd /Volumes/Software/Multi/web/super-admin && npm run typecheck 2>&1 | head -60
```

---

## Chunk 3: Update financial card rows

### Task 7: Update payments and receipts fetch limits

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx` — `loadFinancials` effect (~lines 262-298)

- [ ] **Step 1: Change payment fetch limit from 6 to 3**

In the `loadFinancials` effect, change:
```ts
api.get<{ payments: PlatformPayment[] }>('/billing/payments', {
  params: {
    page: 1,
    limit: 6,
    tenantId: tenant.id,
  },
}),
```
to:
```ts
api.get<{ payments: PlatformPayment[] }>('/billing/payments', {
  params: {
    page: 1,
    limit: 3,
    tenantId: tenant.id,
  },
}),
```

- [ ] **Step 2: Change receipts fetch limit from 6 to 3**

In the same effect, change:
```ts
api.get<{ receipts: PlatformReceipt[] }>('/receipts/tenant', {
  params: {
    tenantId: tenant.id,
    limit: 6,
  },
}),
```
to:
```ts
api.get<{ receipts: PlatformReceipt[] }>('/receipts/tenant', {
  params: {
    tenantId: tenant.id,
    limit: 3,
  },
}),
```

---

### Task 8: Make invoice, payment, and receipt card rows clickable

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx` — JSX for the three financial cards (~lines 1195-1310)

- [ ] **Step 1: Make invoice rows clickable**

In the Recent Invoices card (~lines 1205-1221), change each `<Paper variant="outlined">` to be clickable:

```tsx
{invoicePreview.map((invoice) => (
  <Paper
    variant="outlined"
    key={invoice.id}
    sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
    onClick={() => openInvoiceDetail(invoice)}
  >
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between">
        <Typography fontWeight={700}>{invoice.invoiceNumber}</Typography>
        <StatusChip status={invoice.status} />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {currencyFormatter.format(invoice.invoiceAmount)} · Balance{' '}
        {currencyFormatter.format(invoice.balance)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Due {formatDate(invoice.invoicePeriod)}
      </Typography>
    </Stack>
  </Paper>
))}
```

- [ ] **Step 2: Make payment rows clickable**

In the Last Payments card (~lines 1244-1264), change each `<Paper variant="outlined">` to be clickable:

```tsx
{paymentPreview.map((payment) => (
  <Paper
    variant="outlined"
    key={payment.id}
    sx={{ p: 1.25, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
    onClick={() => setPaymentDetailTarget(payment)}
  >
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between">
        <Typography fontWeight={700}>
          {currencyFormatter.format(payment.amount)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {payment.modeOfPayment}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {payment.transactionId || 'Manual payment'}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {formatDateTime(payment.createdAt)}
      </Typography>
    </Stack>
  </Paper>
))}
```

- [ ] **Step 3: Make receipt rows clickable**

In the Receipts card (~lines 1285-1299), change each `<Paper variant="outlined">` to be clickable:

```tsx
{receiptPreview.map((receipt) => (
  <Paper
    key={receipt.id}
    variant="outlined"
    sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
    onClick={() => setReceiptDetailTarget(receipt)}
  >
    <Stack spacing={0.5}>
      <Typography fontWeight={700}>{receipt.receiptNumber}</Typography>
      <Typography variant="body2" color="text.secondary">
        {currencyFormatter.format(receipt.amount)} · {receipt.modeOfPayment}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {formatDate(receipt.billingPeriod)} ·{' '}
        {receipt.smsSentAt ? 'SMS sent' : 'SMS pending'}
      </Typography>
    </Stack>
  </Paper>
))}
```

- [ ] **Step 4: Run typecheck**

```bash
cd /Volumes/Software/Multi/web/super-admin && npm run typecheck 2>&1 | head -60
```

---

## Chunk 4: Remove sections and reorder layout

### Task 9: Remove Manual Invoice, Manual Payment, SMS Top Up, Support Notes, and Billing Queue JSX

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx` — JSX sections

- [ ] **Step 1: Remove Billing Queue card**

Find and delete the entire `<Grid item xs={12} md={4}>` block for "Billing Queue" (~lines 1499-1540):
```tsx
<Grid item xs={12} md={4}>
  <Paper sx={{ p: 3, height: '100%' }}>
    <Stack spacing={2}>
      <Typography variant="overline" color="primary">
        Billing Queue
      </Typography>
      ...
    </Stack>
  </Paper>
</Grid>
```

- [ ] **Step 2: Remove Manual Invoice form card**

Find and delete the entire `<Grid item xs={12} md={4}>` block for "Manual Invoice" (~lines 1542-1572).

- [ ] **Step 3: Remove Manual Payment form card**

Find and delete the entire `<Grid item xs={12} md={4}>` block for "Manual Payment" (~lines 1574-1658).

- [ ] **Step 4: Remove SMS Top Up card**

Find and delete the entire `<Grid item xs={12} md={4}>` block for "SMS Top Up" (~lines 1660-1689).

- [ ] **Step 5: Remove Support Notes section**

Find and delete the entire `<Grid item xs={12}>` block for "Support Notes" (~lines 1755-1811).

- [ ] **Step 6: Run typecheck**

```bash
cd /Volumes/Software/Multi/web/super-admin && npm run typecheck 2>&1 | head -60
```

Expected: errors should now be significantly reduced or zero from the JSX side. Any remaining errors will be stray references.

- [ ] **Step 7: Fix any remaining stray references**

If typecheck still reports errors about removed state (e.g. `invoiceAmountDraft`, `noteDraft`, etc.), search for remaining references and remove them:

```bash
cd /Volumes/Software/Multi/web/super-admin && grep -n "invoiceAmountDraft\|invoicePeriodDraft\|paymentAmountDraft\|paymentModeDraft\|paymentReferenceDraft\|paymentInvoiceIdDraft\|paidAtDraft\|toppingUpSms\|smsTopUpUnitsDraft\|smsTopUpReasonDraft\|noteDraft\|noteSaving\|recentInvoices\|selectedInvoice\|paymentModes\|getCurrentMonth\|getCurrentDateTime\|createManualInvoice\|recordManualPayment\|topUpTenantSms\|createNote" src/pages/tenants/TenantDetail.tsx
```

Delete any remaining usages.

- [ ] **Step 8: Run typecheck — expect zero errors**

```bash
cd /Volumes/Software/Multi/web/super-admin && npm run typecheck 2>&1
```

Expected: `Found 0 errors.`

- [ ] **Step 9: Commit**

```bash
cd /Volumes/Software/Multi/web/super-admin && git add src/pages/tenants/TenantDetail.tsx && git commit -m "feat: remove manual invoice/payment/sms-topup/notes from tenant detail"
```

---

### Task 10: Reorder layout cards

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx` — JSX card ordering

Target layout:
```
Row 3:  Invoices (4/12)  |  Payments (4/12)  |  Receipts (4/12)     [already correct]
Row 4:  Customer Stats (6/12)  |  Subscription (6/12)                [already correct]
Row 5:  Engagement Snapshot (6/12)  |  Counters (6/12)
Row 6:  Recent Billing summary (6/12)
```

Currently the order after Row 4 is: Engagement Snapshot (6/12), Recent Billing summary (6/12), Counters (6/12).

- [ ] **Step 1: Move Counters card to be adjacent to Engagement Snapshot**

Cut the Counters `<Grid item xs={12} md={6}>` block (~lines 1469-1497) and paste it directly after the Engagement Snapshot `</Grid>` closing tag.

The order after the change:
1. Engagement Snapshot (6/12)
2. Counters (6/12)   ← moved here
3. Recent Billing summary (6/12)

- [ ] **Step 2: Run typecheck**

```bash
cd /Volumes/Software/Multi/web/super-admin && npm run typecheck 2>&1
```

Expected: zero errors.

---

## Chunk 5: Add Send Bill card and all four detail modals

### Task 11: Add Send Bill card

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx` — JSX, just before the Tenant Communication `<Grid item xs={12}>` block

- [ ] **Step 1: Add Send Bill card**

Insert this new `<Grid item>` block immediately before the Tenant Communication section:

```tsx
<Grid item xs={12} md={6}>
  <Paper sx={{ p: 3, height: '100%' }}>
    <Stack spacing={2}>
      <Typography variant="overline" color="primary">
        Send Bill via SMS
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Send the tenant's outstanding bill to their phone number. Message is
        pre-filled from the latest unpaid invoice and can be edited before
        sending.
      </Typography>
      {openInvoices.length > 0 ? (
        <Box>
          <Typography variant="body2" color="text.secondary">
            Latest unpaid: <strong>{openInvoices[0].invoiceNumber}</strong> ·{' '}
            {currencyFormatter.format(openInvoices[0].balance)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Recipient: {tenant.phoneNumber || tenant.alternativePhoneNumber || 'No phone on file'}
          </Typography>
        </Box>
      ) : null}
      <Box>
        <Button
          variant="contained"
          onClick={openSendBill}
          disabled={
            openInvoices.length === 0 ||
            (!tenant.phoneNumber && !tenant.alternativePhoneNumber)
          }
        >
          Send Bill SMS
        </Button>
        {openInvoices.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No outstanding invoices
          </Typography>
        ) : !tenant.phoneNumber && !tenant.alternativePhoneNumber ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No phone number on file
          </Typography>
        ) : null}
      </Box>
    </Stack>
  </Paper>
</Grid>
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Volumes/Software/Multi/web/super-admin && npm run typecheck 2>&1
```

---

### Task 12: Add Invoice Detail modal

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx` — after the existing Delete Tenant `</Dialog>` closing tag, before the final `</Stack>`

- [ ] **Step 1: Add Invoice Detail modal**

```tsx
<Dialog
  open={Boolean(invoiceDetailTarget)}
  onClose={() => {
    if (!adjusting && !cancelling) {
      setInvoiceDetailTarget(null);
      setCancelConfirming(false);
    }
  }}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>
    Invoice {invoiceDetailTarget?.invoiceNumber}
  </DialogTitle>
  <DialogContent>
    {invoiceDetailTarget ? (
      <Stack spacing={2} sx={{ pt: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <DetailMetric label="Status" value={invoiceDetailTarget.status} />
          </Grid>
          <Grid item xs={6}>
            <DetailMetric
              label="Billing Period"
              value={formatDate(invoiceDetailTarget.invoicePeriod)}
            />
          </Grid>
          <Grid item xs={6}>
            <DetailMetric
              label="Invoice Amount"
              value={currencyFormatter.format(invoiceDetailTarget.invoiceAmount)}
            />
          </Grid>
          <Grid item xs={6}>
            <DetailMetric
              label="Outstanding Balance"
              value={currencyFormatter.format(invoiceDetailTarget.balance)}
            />
          </Grid>
          <Grid item xs={6}>
            <DetailMetric
              label="Amount Paid"
              value={currencyFormatter.format(invoiceDetailTarget.amountPaid)}
            />
          </Grid>
          <Grid item xs={6}>
            <DetailMetric label="Plan" value={invoiceDetailTarget.plan.name} />
          </Grid>
          <Grid item xs={6}>
            <DetailMetric
              label="Payments Recorded"
              value={String(invoiceDetailTarget.paymentCount)}
            />
          </Grid>
          <Grid item xs={6}>
            <DetailMetric
              label="Latest Payment"
              value={
                invoiceDetailTarget.latestPaymentAt
                  ? formatDateTime(invoiceDetailTarget.latestPaymentAt)
                  : '—'
              }
            />
          </Grid>
          <Grid item xs={6}>
            <DetailMetric
              label="Created"
              value={formatDateTime(invoiceDetailTarget.createdAt)}
            />
          </Grid>
          <Grid item xs={6}>
            <DetailMetric
              label="Last Updated"
              value={formatDateTime(invoiceDetailTarget.updatedAt)}
            />
          </Grid>
        </Grid>

        {(invoiceDetailTarget.status === 'UNPAID' ||
          invoiceDetailTarget.status === 'PPAID') ? (
          <>
            <Divider />
            <Stack spacing={1.5}>
              <Typography variant="overline" color="primary">
                Adjust Invoice
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Invoice Amount"
                    type="number"
                    inputProps={{ min: 1, step: '0.01' }}
                    value={adjustAmountDraft}
                    onChange={(e) => setAdjustAmountDraft(e.target.value)}
                    disabled={adjusting || cancelling}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Invoice Month"
                    type="month"
                    value={adjustPeriodDraft}
                    onChange={(e) => setAdjustPeriodDraft(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={adjusting || cancelling}
                  />
                </Grid>
              </Grid>
              <Button
                variant="contained"
                onClick={adjustInvoice}
                disabled={adjusting || cancelling}
              >
                {adjusting ? 'Adjusting…' : 'Adjust Invoice'}
              </Button>
            </Stack>

            <Divider />
            <Stack direction="row" spacing={1} alignItems="center">
              {cancelConfirming ? (
                <>
                  <Button
                    color="warning"
                    variant="outlined"
                    onClick={cancelInvoice}
                    disabled={cancelling}
                  >
                    {cancelling ? 'Cancelling…' : 'Confirm cancel?'}
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => setCancelConfirming(false)}
                    disabled={cancelling}
                  >
                    No, go back
                  </Button>
                </>
              ) : (
                <Button
                  color="warning"
                  variant="outlined"
                  onClick={() => setCancelConfirming(true)}
                  disabled={adjusting || cancelling}
                >
                  Cancel Invoice
                </Button>
              )}
            </Stack>
          </>
        ) : null}
      </Stack>
    ) : null}
  </DialogContent>
  <DialogActions>
    <Button
      onClick={() => {
        setInvoiceDetailTarget(null);
        setCancelConfirming(false);
      }}
      disabled={adjusting || cancelling}
    >
      Close
    </Button>
  </DialogActions>
</Dialog>
```

---

### Task 13: Add Payment Detail modal

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx` — after Invoice Detail Dialog

- [ ] **Step 1: Add Payment Detail modal**

```tsx
<Dialog
  open={Boolean(paymentDetailTarget)}
  onClose={() => setPaymentDetailTarget(null)}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>Payment Detail</DialogTitle>
  <DialogContent>
    {paymentDetailTarget ? (
      <Grid container spacing={2} sx={{ pt: 1 }}>
        <Grid item xs={6}>
          <DetailMetric
            label="Amount"
            value={currencyFormatter.format(paymentDetailTarget.amount)}
          />
        </Grid>
        <Grid item xs={6}>
          <DetailMetric label="Mode" value={paymentDetailTarget.modeOfPayment} />
        </Grid>
        <Grid item xs={6}>
          <DetailMetric
            label="Transaction ID"
            value={paymentDetailTarget.transactionId ?? 'Manual payment'}
          />
        </Grid>
        <Grid item xs={6}>
          <DetailMetric
            label="Linked Invoices"
            value={
              paymentDetailTarget.linkedInvoiceNumbers.length
                ? paymentDetailTarget.linkedInvoiceNumbers.join(', ')
                : '—'
            }
          />
        </Grid>
        <Grid item xs={6}>
          <DetailMetric
            label="Paid At"
            value={formatDateTime(paymentDetailTarget.createdAt)}
          />
        </Grid>
      </Grid>
    ) : null}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setPaymentDetailTarget(null)}>Close</Button>
  </DialogActions>
</Dialog>
```

---

### Task 14: Add Receipt Detail modal

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx` — after Payment Detail Dialog

- [ ] **Step 1: Add Receipt Detail modal**

```tsx
<Dialog
  open={Boolean(receiptDetailTarget)}
  onClose={() => setReceiptDetailTarget(null)}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>Receipt {receiptDetailTarget?.receiptNumber}</DialogTitle>
  <DialogContent>
    {receiptDetailTarget ? (
      <Grid container spacing={2} sx={{ pt: 1 }}>
        <Grid item xs={6}>
          <DetailMetric
            label="Receipt Number"
            value={receiptDetailTarget.receiptNumber}
          />
        </Grid>
        <Grid item xs={6}>
          <DetailMetric
            label="Amount"
            value={currencyFormatter.format(receiptDetailTarget.amount)}
          />
        </Grid>
        <Grid item xs={6}>
          <DetailMetric label="Mode" value={receiptDetailTarget.modeOfPayment} />
        </Grid>
        <Grid item xs={6}>
          <DetailMetric
            label="Transaction ID"
            value={receiptDetailTarget.transactionId ?? '—'}
          />
        </Grid>
        <Grid item xs={6}>
          <DetailMetric
            label="Billing Period"
            value={formatDate(receiptDetailTarget.billingPeriod)}
          />
        </Grid>
        <Grid item xs={6}>
          <DetailMetric
            label="SMS Status"
            value={
              receiptDetailTarget.smsSentAt
                ? `Sent ${formatDateTime(receiptDetailTarget.smsSentAt)}`
                : 'Pending'
            }
          />
        </Grid>
      </Grid>
    ) : null}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setReceiptDetailTarget(null)}>Close</Button>
  </DialogActions>
</Dialog>
```

---

### Task 15: Add Send Bill modal

**Files:**
- Modify: `src/pages/tenants/TenantDetail.tsx` — after Receipt Detail Dialog

- [ ] **Step 1: Add Send Bill modal**

```tsx
<Dialog
  open={sendBillOpen}
  onClose={() => !sendingBill && setSendBillOpen(false)}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>Send Bill via SMS</DialogTitle>
  <DialogContent>
    <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField
        fullWidth
        label="Recipient"
        value={sendBillRecipientDraft}
        onChange={(e) => setSendBillRecipientDraft(e.target.value)}
        disabled={sendingBill}
        helperText="Tenant primary contact"
      />
      <TextField
        fullWidth
        multiline
        minRows={4}
        label="Message"
        value={sendBillMessageDraft}
        onChange={(e) => setSendBillMessageDraft(e.target.value)}
        disabled={sendingBill}
        helperText="Pre-filled from latest unpaid invoice. Edit before sending."
      />
    </Stack>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setSendBillOpen(false)} disabled={sendingBill}>
      Cancel
    </Button>
    <Button
      variant="contained"
      onClick={sendBillSms}
      disabled={sendingBill}
    >
      {sendingBill ? 'Sending…' : 'Send Bill SMS'}
    </Button>
  </DialogActions>
</Dialog>
```

- [ ] **Step 2: Run typecheck — expect zero errors**

```bash
cd /Volumes/Software/Multi/web/super-admin && npm run typecheck 2>&1
```

Expected: `Found 0 errors.`

- [ ] **Step 3: Final commit**

```bash
cd /Volumes/Software/Multi/web/super-admin && git add src/pages/tenants/TenantDetail.tsx && git commit -m "feat: add invoice/payment/receipt detail modals and send bill SMS to tenant detail"
```

---

## Verification Checklist

After all tasks are complete, manually verify the following in the browser:

- [ ] Tenant detail screen loads without errors
- [ ] Recent Invoices card shows at most 3 rows, each row is clickable
- [ ] Clicking an invoice row opens the Invoice Detail modal with correct data
- [ ] For UNPAID/PPAID invoices: Adjust Invoice fields are shown; Cancel Invoice two-step works
- [ ] For PAID invoices: no action buttons shown
- [ ] Clicking a payment row opens Payment Detail modal with correct data
- [ ] Clicking a receipt row opens Receipt Detail modal with correct data
- [ ] Send Bill card shows latest unpaid invoice info and enabled button when phone + unpaid invoice exist
- [ ] Send Bill card button is disabled with correct helper text when no unpaid invoices
- [ ] Send Bill modal opens with pre-filled recipient and message
- [ ] Message is editable before sending
- [ ] Manual Payment form, Manual Invoice form, SMS Top Up, Support Notes sections are gone
- [ ] Billing Queue card is gone
- [ ] Layout order matches spec: Invoices/Payments/Receipts → Stats/Subscription → Engagement/Counters → Recent Billing → Send Bill → Communication
