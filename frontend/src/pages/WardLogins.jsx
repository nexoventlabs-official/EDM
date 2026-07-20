import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

// Mirrors admin/pages/wardlogins (index + view) — ward login list + booth
// management via live EPIC search. Creation lives on its own page (CreateWardLogin).
export default function WardLogins() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [detail, setDetail] = useState(null); // ward row whose booths are expanded
  const [loading, setLoading] = useState(true);

  // EPIC search state (mirrors view.blade.php inline add-booth)
  const [epic, setEpic] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState(null);   // { voter, assembly_name } resolved from EPIC
  const [boothErr, setBoothErr] = useState('');
  const [dirty, setDirty] = useState(false);   // unsaved booth changes for the open ward
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/ward-logins')
      .then(({ data }) => {
        setRows(data.rows || []);
        // keep the expanded detail in sync only when there are no unsaved edits
        setDetail((d) => (d && !dirty ? (data.rows || []).find((r) => r._id === d._id) || d : d));
      })
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load ward logins.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (id) => {
    if (!confirm('Are you sure you want to delete this Ward Login?')) return;
    await api.delete(`/ward-logins/${id}`);
    if (detail?._id === id) setDetail(null);
    load();
  };

  const openDetail = (r) => {
    if (dirty && detail?._id !== r._id && !confirm('You have unsaved booth changes. Discard them?')) return;
    setDetail(detail?._id === r._id ? null : r);
    setEpic(''); setFound(null); setBoothErr(''); setDirty(false);
  };

  // Search a voter by EPIC across assemblies (GET /dashboard/search-epic).
  const searchEpic = async () => {
    const val = epic.trim().toUpperCase();
    if (!val) { setBoothErr('Please enter an EPIC number.'); return; }
    setBoothErr(''); setFound(null); setSearching(true);
    try {
      const { data } = await api.get('/dashboard/search-epic', { params: { epic: val } });
      if (data.success && data.voter) setFound({ voter: data.voter, assembly_name: data.assembly_name });
      else setBoothErr(`No voter found with EPIC number: ${val}`);
    } catch (e) {
      setBoothErr(e.response?.data?.message || 'Search failed.');
    } finally { setSearching(false); }
  };

  // Build the booth object from the resolved voter and stage it locally.
  // Nothing is persisted until "Save Booths" is clicked.
  const addBooth = () => {
    if (!found?.voter) return;
    const v = found.voter;
    const booth = {
      assembly_no: parseInt(v.ASSEMBLY_NO, 10),
      assembly_name: found.assembly_name || v.AC_NAME || `AC ${v.ASSEMBLY_NO}`,
      part_no: parseInt(v.PART_NO, 10),
      booth_name: v.BOOTH_NAME || `Booth ${v.PART_NO}`,
    };
    const dupe = (detail.booths || []).some(
      (x) => Number(x.assembly_no) === booth.assembly_no && Number(x.part_no) === booth.part_no
    );
    if (dupe) { setBoothErr('This booth is already added to this ward.'); return; }
    setBoothErr('');
    setDetail((d) => ({ ...d, booths: [...(d.booths || []), booth] }));
    setDirty(true);
    setEpic(''); setFound(null);
  };

  // Remove a staged/existing booth locally (persisted on Save).
  const deleteBooth = (b) => {
    setDetail((d) => ({
      ...d,
      booths: (d.booths || []).filter(
        (x) => !(Number(x.assembly_no) === Number(b.assembly_no) && Number(x.part_no) === Number(b.part_no))
      ),
    }));
    setDirty(true);
  };

  // Persist the full booths list for the ward in one call.
  const saveBooths = async () => {
    if (!detail) return;
    setBoothErr(''); setSaving(true);
    try {
      const { data } = await api.post(`/ward-logins/${detail._id}/save-booths`, { booths: detail.booths || [] });
      if (data.success) {
        setDetail((d) => ({ ...d, booths: data.booths || d.booths }));
        setDirty(false);
        setMsg('Booths saved.');
        load();
      } else setBoothErr(data.message || 'Save failed.');
    } catch (e) {
      setBoothErr(e.response?.data?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Ward Logins List</h1>
      <p className="muted" style={{ marginTop: -8 }}>Local-body ward logins (user_group_id = 6). Username = category_w{'{ward}'}; random 6-digit passcode; each holds a list of booths.</p>
      {msg && <div className="alert warn">{msg}</div>}
      {err && <div className="alert err">{err}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>Ward Logins</strong>
          <button onClick={() => navigate('/ward-logins/create')}>+ Create Ward Login</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Ward Description</th><th>Body Type</th><th>Position</th><th>District</th>
                <th>Local Body</th><th>Ward No</th><th>Username / Mobile</th><th>Password</th>
                <th>Total Booths</th><th>Details</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={12}><Spinner label="Loading ward logins…" /></td></tr>}
              {!loading && rows.map((r) => (
                <tr key={r._id}>
                  <td>{r.id ?? '-'}</td>
                  <td><strong>{r.description || '-'}</strong></td>
                  <td>{r.candidate_type || '-'}</td>
                  <td>{r.position || '-'}</td>
                  <td>{r.district || '-'}</td>
                  <td>{r.local_body || '-'}</td>
                  <td><span className="badge-info">Ward {r.ward_id ?? '-'}</span></td>
                  <td><strong>{r.username}</strong></td>
                  <td><code>{r.passcode}</code></td>
                  <td><span className="badge-success">{(r.booths || []).length} Booths</span></td>
                  <td><button className="secondary" onClick={() => openDetail(r)}>{detail?._id === r._id ? 'Hide' : 'View'}</button></td>
                  <td><button className="danger" onClick={() => remove(r._id)}>Delete</button></td>
                </tr>
              ))}
              {!loading && !rows.length && <tr><td colSpan={12} className="muted" style={{ textAlign: 'center', padding: 18 }}>No ward logins yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <>
          {/* Live EPIC search → detected booth (mirrors wardlogins/view.blade.php) */}
          <div className="card epic-card">
            <h2 style={{ marginTop: 0 }}>Add New Booth to Ward — {detail.username} (Ward {detail.ward_id})</h2>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label>Enter EPIC Number</label>
                <input value={epic} onChange={(e) => setEpic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') searchEpic(); }}
                  placeholder="e.g. ALF2230738" style={{ width: '100%' }} />
              </div>
              <button onClick={searchEpic} disabled={searching}>{searching ? 'Searching…' : 'Search EPIC'}</button>
            </div>
            {boothErr && <div className="alert err" style={{ marginTop: 10 }}>{boothErr}</div>}

            {found && (
              <div className="epic-result">
                <div className="epic-col">
                  <h4>Detected Booth</h4>
                  <p>
                    <strong>Assembly No:</strong> {found.voter.ASSEMBLY_NO}<br />
                    <strong>Assembly Name:</strong> {found.assembly_name || found.voter.AC_NAME || `AC ${found.voter.ASSEMBLY_NO}`}<br />
                    <strong>Booth / Part No:</strong> {found.voter.PART_NO}<br />
                    <strong>Booth Name:</strong> <span style={{ color: '#1565c0', fontWeight: 600 }}>{found.voter.BOOTH_NAME || `Booth ${found.voter.PART_NO}`}</span>
                  </p>
                  <button className="success" onClick={addBooth}>+ Add Booth</button>
                </div>
                <div className="epic-col">
                  <h4>Voter for Confirmation</h4>
                  <p>
                    <strong>Name:</strong> {found.voter.VOTER_NAME_EN} / {found.voter.VOTER_NAME || ''}<br />
                    <strong>Relation:</strong> {(found.voter.RELATION_TYPE || 'Relation')}: {found.voter.RELATION_NAME_EN || ''} / {found.voter.RELATION_NAME || ''}<br />
                    <strong>Age/Gender:</strong> {found.voter.AGE} / {found.voter.GENDER}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Assigned booths */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Assembly Booths in this Ward</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {dirty && <span className="muted" style={{ color: '#c77700' }}>Unsaved changes</span>}
                <button className="success" onClick={saveBooths} disabled={!dirty || saving}>
                  {saving ? 'Saving…' : 'Save Booths'}
                </button>
              </div>
            </div>
            <table>
              <thead><tr><th>Assembly No</th><th>Assembly Name</th><th>Booth No</th><th>Booth Name / Address</th><th style={{ textAlign: 'center' }}>Action</th></tr></thead>
              <tbody>
                {(detail.booths || []).map((b, i) => (
                  <tr key={`${b.assembly_no}-${b.part_no}-${i}`}>
                    <td>{b.assembly_no}</td>
                    <td>{b.assembly_name}</td>
                    <td>{b.part_no}</td>
                    <td><strong>{b.booth_name}</strong></td>
                    <td style={{ textAlign: 'center' }}><button className="danger" onClick={() => deleteBooth(b)}>Delete</button></td>
                  </tr>
                ))}
                {!(detail.booths || []).length && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 14 }}>No booths assigned to this ward yet. Use the EPIC search above to add booths.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
