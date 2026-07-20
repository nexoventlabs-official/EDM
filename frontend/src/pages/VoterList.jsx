import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/Spinner.jsx';
import { IconCall, IconMail, IconWhatsApp, IconView } from '../components/Icons.jsx';

// Roles that may pick any assembly (mirrors VoterController: 1 SuperAdmin, 2 MP, 7 Telecaller, 10 DSA).
const CHOOSE_ROLES = [1, 2, 7, 10];

// Normalise a mobile to a 91-prefixed digit string for tel/sms/whatsapp links.
const digits = (m) => {
  let d = String(m || '').replace(/\D/g, '');
  if (d.length === 10) d = '91' + d;
  return d;
};

export default function VoterList() {
  const { user } = useAuth();
  const groupId = Number(user?.group_id || 1);
  const canChoose = CHOOSE_ROLES.includes(groupId);
  const lockedAssembly = canChoose ? '' : String(user?.assembly_id ?? '');
  const isBooth = groupId === 4 || groupId === 11;
  const isWard = groupId === 6;
  const lockedBooth = isBooth ? String(user?.booth_id ?? '') : '';

  const [assemblies, setAssemblies] = useState([]);
  const [f, setF] = useState({
    assemblyId: lockedAssembly, gender: '', min_age: '', max_age: '',
    boothId: lockedBooth, has_mobile: '', search_text: '',
  });
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pageSize: 25 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [detail, setDetail] = useState(null);

  if (isWard && (user?.has_booths === false || user?.has_booths === 0)) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>Voter List 🔒</h1>
        <div className="alert warn" style={{ borderLeft: '5px solid #ffc107', marginTop: 14, padding: 18 }}>
          <h3 style={{ margin: '0 0 8px', color: '#856404' }}>🔒 Access Locked (Preview &amp; Demonstration Mode)</h3>
          <p style={{ margin: '0 0 14px', lineHeight: 1.5, color: '#664d03' }}>
            Your ward account is currently in <b>Preview &amp; Demonstration Mode</b> because polling booths have not been assigned by your system administrator yet. Official constituency voter list access will unlock automatically once your polling booths are assigned.
          </p>
          <div>
            <a href="/ward/dashboard#sample" className="button" style={{ display: 'inline-block', padding: '9px 18px', background: '#2b90d9', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>
              View Sample Data List →
            </a>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    api.get('/assemblies').then(({ data }) => {
      const list = data.assemblies || [];
      setAssemblies(list);
      // Admin/chooser roles: default to the first assembly and load it.
      if (canChoose && !f.assemblyId && list.length) {
        const first = String(list[0].assembly_no);
        setF((s) => ({ ...s, assemblyId: first }));
        load(1, first);
      } else if (canChoose) {
        setLoading(false); // chooser role but nothing to auto-load
      }
    }).catch(() => setLoading(false));
    if (!canChoose && lockedAssembly) load(1);
    else if (!canChoose && !lockedAssembly) setLoading(false);
    // eslint-disable-next-line
  }, []);

  const assemblyName = assemblies.find((a) => String(a.assembly_no) === String(f.assemblyId))?.assembly_name;

  const load = async (page = 1, assemblyOverride) => {
    const assemblyId = assemblyOverride ?? f.assemblyId;
    if (canChoose && !assemblyId) { setErr('Please select an assembly.'); return; }
    setErr(''); setLoading(true);
    try {
      const { data } = await api.get('/voters', { params: { ...f, assemblyId, page, pageSize: 25 } });
      setData(data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Unable to load voter data.');
      setData({ rows: [], total: 0, page: 1, pageSize: 25 });
    } finally { setLoading(false); }
  };

  const openDetail = async (row) => {
    // Show immediately from the row, then enrich from the detail endpoint.
    setDetail(row);
    try {
      const { data } = await api.get('/voters/detail', { params: { assemblyId: f.assemblyId, id: row._id } });
      if (data.success) setDetail(data.voter);
    } catch { /* keep row data */ }
  };

  const pages = Math.ceil(data.total / data.pageSize) || 1;
  const scopeLabel = isBooth ? `Booth ${lockedBooth}` : isWard ? 'Your ward booths' : 'Your assembly';

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Voters List</h1>
      {!canChoose && (
        <div className="alert warn">
          Scoped to <strong>{assemblyName ? `${f.assemblyId} - ${assemblyName}` : `Assembly ${f.assemblyId || '—'}`}</strong> · {scopeLabel}.
        </div>
      )}
      <div className="card">
        <div className="row">
          {canChoose ? (
            <div><label>Assembly</label>
              <select value={f.assemblyId} onChange={(e) => setF({ ...f, assemblyId: e.target.value })}>
                <option value="">Select Assembly</option>
                {assemblies.map((a) => <option key={a.assembly_no} value={a.assembly_no}>{a.assembly_no} - {a.assembly_name}</option>)}
              </select></div>
          ) : (
            <div><label>Assembly</label>
              <input value={assemblyName ? `${f.assemblyId} - ${assemblyName}` : f.assemblyId} disabled readOnly style={{ width: 220, background: '#eef1f6' }} /></div>
          )}
          <div><label>Gender</label>
            <select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>
              <option value="">All</option><option>Male</option><option>Female</option>
            </select></div>
          {!isWard && (
            <div><label>Booth (Part No)</label>
              <input style={{ width: 100, ...(isBooth ? { background: '#eef1f6' } : {}) }} value={f.boothId}
                readOnly={isBooth} disabled={isBooth}
                onChange={(e) => setF({ ...f, boothId: e.target.value })} /></div>
          )}
          <div><label>Min Age</label><input style={{ width: 80 }} value={f.min_age} onChange={(e) => setF({ ...f, min_age: e.target.value })} /></div>
          <div><label>Max Age</label><input style={{ width: 80 }} value={f.max_age} onChange={(e) => setF({ ...f, max_age: e.target.value })} /></div>
          <div><label>Mobile only</label>
            <select value={f.has_mobile} onChange={(e) => setF({ ...f, has_mobile: e.target.value })}>
              <option value="">All</option><option value="1">With mobile</option>
            </select></div>
          <div><label>Search (EPIC / mobile / name)</label><input style={{ width: 220 }} value={f.search_text} onChange={(e) => setF({ ...f, search_text: e.target.value })} /></div>
          <button onClick={() => load(1)} disabled={loading}>{loading ? 'Loading…' : 'Filter'}</button>
        </div>
        {err && <div className="alert err">{err}</div>}
        <div className="muted">Count: {data.total.toLocaleString('en-IN')}</div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr>
              <th>EPIC</th><th>Part No</th><th>SLNO</th><th>Elector Name</th><th>Relation Name</th><th>Mobile</th><th>Age</th><th>Gender</th>
              <th style={{ textAlign: 'center' }}>Call</th><th style={{ textAlign: 'center' }}>SMS</th><th style={{ textAlign: 'center' }}>WA</th><th style={{ textAlign: 'center' }}>View</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={12}><Spinner label="Loading voters…" /></td></tr>}
              {!loading && data.rows.map((v) => {
                const d = digits(v.MOBILE_NUMBER);
                const hasMob = d.length >= 10;
                return (
                  <tr key={v._id}>
                    <td style={{ color: '#2f7bd6', fontWeight: 600 }}>{v.EPIC_NO}</td>
                    <td>{v.PART_NO}</td>
                    <td>{v.SLNO ?? v.ID ?? '-'}</td>
                    <td>{v.VOTER_NAME_EN}</td>
                    <td>{v.RELATION_NAME_EN}</td>
                    <td>{v.MOBILE_NUMBER || '-'}</td>
                    <td>{v.AGE}</td>
                    <td>{v.GENDER}</td>
                    <td className="act-cell">{hasMob ? <a className="act-btn" title="Call" href={`tel:+${d}`}><IconCall size={20} color="#d85028" /></a> : <span className="muted">—</span>}</td>
                    <td className="act-cell">{hasMob ? <a className="act-btn" title="SMS" href={`sms:+${d}`}><IconMail size={20} color="#d85028" /></a> : <span className="muted">—</span>}</td>
                    <td className="act-cell">{hasMob ? <a className="act-btn wa-btn" title="WhatsApp" target="_blank" rel="noreferrer" href={`https://wa.me/${d}`}><IconWhatsApp size={22} /></a> : <span className="muted">—</span>}</td>
                    <td className="act-cell"><button className="act-btn" title="View Details" onClick={() => openDetail(v)} style={{ background: 'none', border: 'none', padding: 0 }}><IconView size={20} color="#d85028" /></button></td>
                  </tr>
                );
              })}
              {!loading && !data.rows.length && <tr><td colSpan={12} className="muted" style={{ textAlign: 'center', padding: 18 }}>No voters loaded.</td></tr>}
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

      {detail && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setDetail(null); }}>
          <div className="modal-box">
            <div className="modal-head">
              <h2>Voter Details — {detail.EPIC_NO}</h2>
              <button className="modal-close" onClick={() => setDetail(null)}>×</button>
            </div>
            <div className="modal-body">
              <table><tbody>
                {Object.entries(detail).filter(([k]) => k !== '_id').map(([k, val]) => (
                  <tr key={k}><th style={{ width: 220 }}>{k}</th><td>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</td></tr>
                ))}
              </tbody></table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
