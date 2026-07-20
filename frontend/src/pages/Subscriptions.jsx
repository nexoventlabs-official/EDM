import { useEffect, useState } from 'react';
import api from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

// Mirrors web\admin\PaymentController@subscriptionList — paid assembly (MLA) subscriptions.
export default function Subscriptions() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/payments/subscriptions')
      .then(({ data }) => setRows(data.subscriptions || []))
      .catch((e) => setErr(e.response?.data?.message || 'Unable to load subscriptions.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter((r) => !q || (r.name || '').toLowerCase().includes(q.toLowerCase()) || (r.assembly_name || '').toLowerCase().includes(q.toLowerCase()) || String(r.mobile_no).includes(q));
  const totalRevenue = filtered.reduce((t, r) => t + Number(r.amount || 0), 0);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Subscriptions / Payments</h1>
      {err && <div className="alert warn">{err}</div>}
      <div className="tiles">
        <div className="tile green"><div>Active Subscriptions</div><h3>{fmt(filtered.length)}</h3></div>
        <div className="tile blue"><div>Total Revenue (₹)</div><h3>{fmt(totalRevenue)}</h3></div>
      </div>
      <div className="card">
        <div className="row"><div><label>Search</label><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="name / assembly / mobile" /></div></div>
        <table>
          <thead><tr><th>Name</th><th>Mobile</th><th>Assembly</th><th>District</th><th>Amount (₹)</th><th>Txn ID</th><th>Date</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7}><Spinner label="Loading…" /></td></tr> : (<>
              {filtered.map((r) => (
                <tr key={r._id}>
                  <td>{r.name}</td><td>{r.mobile_no}</td><td>{r.assembly_name}</td><td>{r.district}</td>
                  <td>{fmt(r.amount)}</td><td>{r.transaction_id}</td><td>{r.payment_date || '-'}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 18 }}>No subscriptions.</td></tr>}
            </>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
