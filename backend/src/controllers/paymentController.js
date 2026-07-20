import { getAppDb } from '../config/db.js';

// Mirrors web\admin\PaymentController@subscriptionList — paid assembly (MLA, group 3)
// users joined with their assembly and payment amount from tbl_payment.
export async function subscriptions(req, res) {
  try {
    const db = getAppDb();
    const [users, assemblies, payments] = await Promise.all([
      db.collection('tbl_user').find({ paid_status: 'Yes', user_group_id: 3 }).sort({ updated_at: -1 }).toArray(),
      db.collection('tbl_assembly_consitituency').find({}).toArray(),
      db.collection('tbl_payment').find({}).toArray(),
    ]);
    const asmById = Object.fromEntries(assemblies.map((a) => [String(a.assembly_no), a]));
    const payById = Object.fromEntries(payments.map((p) => [String(p.payment_id), p]));
    const rows = users.map((u) => {
      const a = asmById[String(u.assembly_id)];
      const p = payById[String(u.transaction_id)];
      return {
        _id: u._id, name: [u.first_name, u.last_name].filter(Boolean).join(' '),
        mobile_no: u.mobile_no, email: u.email, assembly_id: u.assembly_id,
        assembly_name: a?.assembly_name || '-', district: a?.district || '-',
        transaction_id: u.transaction_id || '-',
        amount: p ? Number(p.amount) / 100 : 25000,
        payment_date: p ? p.created_at : u.updated_at,
      };
    });
    res.json({ success: true, subscriptions: rows });
  } catch (e) {
    if (e.message === 'APP_DB_OFFLINE') return res.status(503).json({ success: false, message: 'App database unavailable.' });
    res.status(500).json({ success: false, message: e.message });
  }
}

// Raw payment ledger (tbl_payment).
export async function payments(req, res) {
  try {
    const db = getAppDb();
    const rows = await db.collection('tbl_payment').find({}).sort({ created_at: -1 }).limit(500).toArray();
    res.json({ success: true, payments: rows });
  } catch (e) {
    if (e.message === 'APP_DB_OFFLINE') return res.status(503).json({ success: false, message: 'App database unavailable.' });
    res.status(500).json({ success: false, message: e.message });
  }
}

// Mirrors RazorpayController order/link creation. Calls Razorpay's REST API only
// when keys are configured; otherwise returns a clear "not configured" response
// (no outbound call, no secrets required for local dev).
export async function createOrder(req, res) {
  const key = process.env.RAZORPAY_KEY;
  const secret = process.env.RAZORPAY_SECRET;
  const amount = Number(req.body?.amount || 0);
  if (!amount) return res.status(400).json({ success: false, message: 'amount (in paise) is required.' });
  if (!key || !secret) {
    return res.status(501).json({
      success: false,
      message: 'Razorpay keys not configured. Set RAZORPAY_KEY and RAZORPAY_SECRET in .env to enable live order creation.',
    });
  }
  try {
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const resp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: req.body.currency || 'INR', receipt: req.body.receipt || `rcpt_${Date.now()}` }),
    });
    const order = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ success: false, message: order?.error?.description || 'Razorpay error.' });
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
