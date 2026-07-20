import { useEffect, useState } from 'react';
import api from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

// Ward Social Media Reports — SMS / Voice Call / WhatsApp message history
// (tbl_sms_report via /messaging/reports).
const TABS = [
  { key: 'Text', label: 'SMS Report' },
  { key: 'Audio', label: 'Voice Call Report' },
  { key: 'WhatsApp', label: 'WhatsApp Report' },
];

export default function SocialMediaReports() {
  const [type, setType] = useState('Text');
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (t) => {
    setErr(''); setLoading(true);
    api.get('/messaging/reports', { params: { type: t } })
      .then(({ data }) => setRows(data.rows || []))
      .catch((e) => { setErr(e.response?.data?.message || 'Unable to load reports.'); setRows([]); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(type); /* eslint-disable-next-line */ }, [type]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Social Media Reports</h1>
      <div className="row" style={{ marginBottom: 12 }}>
        {TABS.map((t) => (
          <button key={t.key} className={type === t.key ? '' : 'secondary'} onClick={() => setType(t.key)}>{t.label}</button>
        ))}
      </div>
      {err && <div className="alert warn">{err}</div>}
      <div style={{ color: '#d9534f', fontWeight: 700, margin: '4px 0 12px' }}>
        Note : The Report in this Area will only be Published if minimum 1,00,000 (SMS, Voice Call, Whatsapp) are sent
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Type</th><th>Message</th><th>Sender / To</th><th>Numbers</th><th>Date</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5}><Spinner label="Loading reports…" /></td></tr> : (<>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td>{r.message_type}</td>
                  <td>{r.message || '-'}</td>
                  <td>{r.sender_id || r.to || '-'}</td>
                  <td>{r.total_number ?? '-'}</td>
                  <td>{r.created_at}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 18 }}>No reports.</td></tr>}
            </>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
