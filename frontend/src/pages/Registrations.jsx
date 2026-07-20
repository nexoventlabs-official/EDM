import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import { IconCall, IconMail, IconWhatsApp, IconAudio, IconView, IconEdit } from '../components/Icons.jsx';

// Mirrors the admin Registrations page (tbl_enquiry) — candidate sign-ups with
// district / position / body-type filters, generated passcode, social-media
// broadcast request icons, and per-row actions (view / edit / call / whatsapp).
const wa = (m) => { const d = String(m || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; };

// Compact icon for a requested social service (matches the detail page colours).
function ReqIcon({ type }) {
  if (type === 'sms') {
    return (
      <span title="SMS request" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: '#fef2f0', border: '1px solid #ffccbc', margin: '0 2px' }}>
        <IconMail size={16} color="#d85028" />
      </span>
    );
  }
  if (type === 'voice') {
    return (
      <span title="Audio SMS request" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: '#fdeded', border: '1px solid #fca5a5', margin: '0 2px' }}>
        <IconAudio size={16} color="#e53935" />
      </span>
    );
  }
  if (type === 'whatsapp') {
    return (
      <span title="WhatsApp request" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: '#eefbf3', border: '1px solid #a7f3d0', margin: '0 2px' }}>
        <IconWhatsApp size={18} />
      </span>
    );
  }
  return null;
}

export default function Registrations() {
  const navigate = useNavigate();
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pageSize: 25 });
  const [f, setF] = useState({ search: '', district: '', position: '', body_type: '' });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async (page = 1) => {
    setErr(''); setLoading(true);
    try {
      const { data } = await api.get('/registrations', { params: { ...f, page, pageSize: 25 } });
      setData(data);
    } catch (e) { setErr(e.response?.data?.message || 'Unable to load registrations.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, []);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const pages = Math.ceil(data.total / data.pageSize) || 1;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Registrations</h1>
      <div className="card">
        <div className="row">
          <div><label>Search</label><input value={f.search} onChange={set('search')} placeholder="name / mobile" /></div>
          <div><label>District</label><input value={f.district} onChange={set('district')} placeholder="District" /></div>
          <div><label>Position</label>
            <select value={f.position} onChange={set('position')}>
              <option value="">All</option><option>Corporation</option><option>Municipality</option><option>Town Panchayat</option>
              <option>Village Panchayat Ward Member</option><option>Village Panchayat President</option>
              <option>Panchayat Union Ward Member</option><option>District Panchayat Ward Member</option>
            </select></div>
          <div><label>Body Type</label>
            <select value={f.body_type} onChange={set('body_type')}><option value="">All</option><option value="urban">Urban</option><option value="rural">Rural</option></select>
          </div>
          <button onClick={() => load(1)} disabled={loading}>{loading ? 'Loading…' : 'Filter'}</button>
        </div>
        {err && <div className="alert err">{err}</div>}
        <div className="muted">Count: {data.total.toLocaleString('en-IN')}</div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr>
              <th>Name</th><th>Mobile</th><th>District</th><th>Position</th><th>Body Type</th><th>Local Body</th><th>Ward</th>
              <th>Passcode</th><th style={{ textAlign: 'center' }}>Requests</th><th>Registered</th><th style={{ textAlign: 'center' }}>Action</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={11}><Spinner label="Loading registrations…" /></td></tr>}
              {!loading && data.rows.map((r) => {
                const id = r._id || r.id;
                return (
                  <tr key={id}>
                    <td>
                      <button className="linklike" onClick={() => navigate(`/registrations/view/${id}`)}>{r.full_name}</button>
                    </td>
                    <td>{r.mobile}</td><td>{r.district}</td><td>{r.position}</td>
                    <td style={{ textTransform: 'capitalize' }}>{r.body_type}</td>
                    <td>{r.local_body}</td><td>{r.ward_number}</td>
                    <td>{r.passcode && r.passcode !== '-' ? <code style={{ background: '#e8f5e9', color: '#2e7d32', fontWeight: 700 }}>{r.passcode}</code> : <span className="muted">—</span>}</td>
                    <td style={{ textAlign: 'center' }}>
                      {r.requests?.length
                        ? <span className="req-icons">{r.requests.map((t, i) => <ReqIcon key={i} type={t} />)}</span>
                        : <span className="muted">None</span>}
                    </td>
                    <td>{r.created_at}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} className="act-cell">
                      {r.mobile && r.mobile !== '-' && (
                        <>
                          <a className="act-btn" title="Call" href={`tel:+91${String(r.mobile).replace(/\D/g, '')}`}><IconCall size={18} color="#d85028" /></a>
                          <a className="act-btn wa-btn" title="WhatsApp" target="_blank" rel="noreferrer" href={`https://api.whatsapp.com/send?phone=${wa(r.mobile)}`}><IconWhatsApp size={20} /></a>
                        </>
                      )}
                      <button className="act-btn" title="View" onClick={() => navigate(`/registrations/view/${id}`)} style={{ background: 'none', border: 'none', padding: 0 }}><IconView size={18} color="#d85028" /></button>
                      <button className="act-btn" title="Edit" onClick={() => navigate(`/registrations/edit/${id}`)} style={{ background: 'none', border: 'none', padding: 0 }}><IconEdit size={18} color="#d85028" /></button>
                    </td>
                  </tr>
                );
              })}
              {!loading && !data.rows.length && <tr><td colSpan={11} className="muted" style={{ textAlign: 'center', padding: 18 }}>No registrations.</td></tr>}
            </tbody>
          </table>
        </div>
        {!loading && data.total > data.pageSize && (
          <div className="pager">
            <button className="secondary" disabled={data.page <= 1} onClick={() => load(data.page - 1)}>Prev</button>
            <span className="muted">Page {data.page} / {pages}</span>
            <button className="secondary" disabled={data.page >= pages} onClick={() => load(data.page + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
