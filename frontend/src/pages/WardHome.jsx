import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import VoterDetailModal from '../components/VoterDetailModal.jsx';
import { IconCall, IconMail, IconWhatsApp, IconView } from '../components/Icons.jsx';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const digits = (m) => {
  let d = String(m || '').replace(/\D/g, '');
  if (d.length === 10) d = '91' + d;
  return d;
};

// Mirrors admin/pages/wardlogins/dashboard — Preview Mode (sample data) when no
// booths are assigned, else the assigned-booth list.
export default function WardHome() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  // sample voters table state
  const [sv, setSv] = useState({ rows: [], total: 0, page: 1, pageSize: 10 });
  const [search, setSearch] = useState('');
  const [detailVoter, setDetailVoter] = useState(null);

  useEffect(() => {
    api.get('/ward/home').then(({ data }) => setData(data)).catch((e) => setErr(e.response?.data?.message || 'Failed to load.'));
  }, []);

  const loadSample = (page = 1) => {
    api.get('/ward/sample-voters', { params: { page, pageSize: 10, search } })
      .then(({ data }) => setSv(data)).catch(() => {});
  };
  useEffect(() => { if (data?.isSample) loadSample(1); /* eslint-disable-next-line */ }, [data?.isSample]);

  if (err) return <div><h1 style={{ marginTop: 0 }}>Ward Dashboard</h1><div className="alert err">{err}</div></div>;
  if (!data) return <Spinner label="Loading…" />;

  const a = data.account;
  const pages = Math.ceil(sv.total / sv.pageSize) || 1;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Ward Dashboard</h1>
        <span className="badge-success" style={{ padding: '6px 12px', fontSize: 13 }}>Logged in as: Ward Admin</span>
      </div>

      {data.isSample && (
        <div className="alert warn" style={{ borderLeft: '5px solid #ffc107', marginTop: 14 }}>
          ⚠ This is sample data. Once the Government releases the official data, it will be updated immediately.
        </div>
      )}

      {/* Top 2-Column Section with Matched Card Heights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 16, alignItems: 'stretch', marginTop: 14 }}>
        <div className="card" style={{ height: '100%', margin: 0, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ marginTop: 0 }}>Ward Account Details</h2>
          <table style={{ flex: 1 }}><tbody>
            <tr><th style={{ width: '42%' }}>Ward Login</th><td><strong>{a.ward_login}</strong></td></tr>
            <tr><th>Body Type</th><td style={{ textTransform: 'capitalize' }}>{a.body_type}</td></tr>
            <tr><th>Position</th><td>{a.position}</td></tr>
            <tr><th>District</th><td>{a.district}</td></tr>
            <tr><th>Local Body</th><td>{a.local_body}</td></tr>
            <tr><th>Ward Number</th><td><span className="badge-info">Ward {a.ward_number}</span></td></tr>
            <tr><th>Username</th><td>{a.username}</td></tr>
          </tbody></table>
        </div>

        <div className="card" style={{ height: '100%', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {data.isSample ? (
            <>
              <div>
                <h2 style={{ marginTop: 0, color: '#2a5298' }}>Preview &amp; Demonstration Mode</h2>
                <h3 style={{ margin: '4px 0 8px', fontSize: 15 }}>Welcome to your Election Management Panel</h3>
                <p style={{ color: '#495057', lineHeight: 1.5, fontSize: 13.5, marginBottom: 12 }}>
                  This account is currently loading in <b>Preview Mode</b> because your constituency's polling booths have not been assigned by the system administrator yet.
                </p>
                <div style={{ background: '#e8f4fd', borderLeft: '4px solid #2b90d9', padding: '10px 14px', borderRadius: 6, color: '#1d68a4', marginBottom: 10, fontSize: 12.5, lineHeight: 1.5 }}>
                  <b>Dataset:</b> Demonstration records containing <b>{data.sample.booths} sample booths</b> and <b>{data.sample.voters} total voters</b>. Use the table below to preview search, filters, and voter contact actions.
                </div>
              </div>
              <div style={{ background: '#fafafc', border: '1px solid #e9ecef', borderRadius: 6, padding: '9px 12px', fontSize: 12.5, color: '#495057', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span><strong style={{ color: '#28a745' }}>✔ Account Status:</strong> Active &amp; Ready</span>
                <span className="muted" style={{ fontSize: 11.5 }}>All features unlock upon data release</span>
              </div>
            </>
          ) : (
            <>
              <h2 style={{ marginTop: 0 }}>Assigned Booths (Part Numbers)</h2>
              <table>
                <thead><tr><th>Assembly No</th><th>Assembly Name</th><th>Part No</th><th>Booth Name</th><th style={{ textAlign: 'right' }}>Total Voters</th><th></th></tr></thead>
                <tbody>
                  {(data.booths || []).map((b) => (
                    <tr key={b.part_no}>
                      <td>{b.assembly_no}</td><td>{b.assembly_name}</td><td><strong>{b.part_no}</strong></td><td>{b.booth_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#28a745' }}>{fmt(b.voter_count)}</td>
                      <td><Link to="/voters"><button>View Voters</button></Link></td>
                    </tr>
                  ))}
                  {!(data.booths || []).length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 16 }}>No booths assigned.</td></tr>}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* Sample Voters Database Section with Action Columns */}
      {data.isSample && (
        <div id="sample" className="card" style={{ marginTop: 16 }}>
          <h2>Sample Voters Database (Combined List)</h2>
          <div className="row">
            <div><label>Search</label><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="EPIC / name / mobile" /></div>
            <button onClick={() => loadSample(1)}>Search</button>
          </div>
          <div className="muted" style={{ margin: '8px 0' }}>Count: {fmt(sv.total)}</div>
          <table>
            <thead>
              <tr>
                <th>Epic</th>
                <th>Part No</th>
                <th>Elector Name</th>
                <th>Relation Name</th>
                <th>Age</th>
                <th>Mobile</th>
                <th>Gender</th>
                <th style={{ textAlign: 'center' }}>Call</th>
                <th style={{ textAlign: 'center' }}>SMS</th>
                <th style={{ textAlign: 'center' }}>WA</th>
                <th style={{ textAlign: 'center' }}>View</th>
              </tr>
            </thead>
            <tbody>
              {sv.rows.map((v) => {
                const mob = String(v.MOBILE_NUMBER || '').replace(/\D/g, '');
                const hasMob = mob.length >= 10;
                const d = digits(mob);
                return (
                  <tr key={v._id}>
                    <td><strong>{v.EPIC_NO}</strong></td>
                    <td>Part {v.PART_NO || 1}</td>
                    <td>{v.VOTER_NAME_EN}</td>
                    <td>{v.RELATION_NAME_EN} ({v.RELATION_TYPE || 'S/o'})</td>
                    <td>{v.AGE}</td>
                    <td>{v.MOBILE_NUMBER || '-'}</td>
                    <td>{v.GENDER}</td>
                    <td className="act-cell" style={{ textAlign: 'center' }}>
                      {hasMob ? <a className="act-btn" title="Call" href={`tel:+${d}`}><IconCall size={18} color="#d85028" /></a> : <span className="muted">—</span>}
                    </td>
                    <td className="act-cell" style={{ textAlign: 'center' }}>
                      {hasMob ? <a className="act-btn" title="SMS" href={`sms:+${d}`}><IconMail size={18} color="#d85028" /></a> : <span className="muted">—</span>}
                    </td>
                    <td className="act-cell" style={{ textAlign: 'center' }}>
                      {hasMob ? <a className="act-btn wa-btn" title="WhatsApp" target="_blank" rel="noreferrer" href={`https://wa.me/${d}`}><IconWhatsApp size={20} /></a> : <span className="muted">—</span>}
                    </td>
                    <td className="act-cell" style={{ textAlign: 'center' }}>
                      <button className="act-btn" title="View Details" onClick={() => setDetailVoter(v)} style={{ background: 'none', border: 'none', padding: 0 }}><IconView size={18} color="#d85028" /></button>
                    </td>
                  </tr>
                );
              })}
              {!sv.rows.length && <tr><td colSpan={11} className="muted" style={{ textAlign: 'center', padding: 16 }}>No records found.</td></tr>}
            </tbody>
          </table>
          {sv.total > sv.pageSize && (
            <div className="pager">
              <button className="secondary" disabled={sv.page <= 1} onClick={() => loadSample(sv.page - 1)}>Prev</button>
              <span className="muted">Page {sv.page} / {pages}</span>
              <button className="secondary" disabled={sv.page >= pages} onClick={() => loadSample(sv.page + 1)}>Next</button>
            </div>
          )}
        </div>
      )}

      {/* Voter Details Modal Popup */}
      {detailVoter && <VoterDetailModal voter={detailVoter} onClose={() => setDetailVoter(null)} />}
    </div>
  );
}
