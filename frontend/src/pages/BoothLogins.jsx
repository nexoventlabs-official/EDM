import { useEffect, useState } from 'react';
import api from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

// Mirrors "Booth Wise Login Credentials" (AssemblyController@boothLoginList/Ajax).
export default function BoothLogins() {
  const [assemblies, setAssemblies] = useState([]);
  const [assemblyId, setAssemblyId] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/assemblies').then(({ data }) => {
      const list = data.assemblies || [];
      setAssemblies(list);
      if (list.length) load(String(list[0].assembly_no)); // default: first assembly
      else setLoading(false);
    }).catch(() => setLoading(false));
    // eslint-disable-next-line
  }, []);

  const load = async (id) => {
    setAssemblyId(id); setRows([]); setErr('');
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/booth-logins', { params: { assembly_id: id } });
      setRows(data.rows || []);
    } catch (e) { setErr(e.response?.data?.message || 'Failed to load booth logins.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Booth-wise Logins</h1>
      <p className="muted" style={{ marginTop: -8 }}>One login per booth (PART_NO), user_group_id = 4. Passcode = MLA passcode + booth number.</p>
      <div className="card">
        <div className="row">
          <div><label>Assembly</label>
            <select value={assemblyId} onChange={(e) => load(e.target.value)}>
              <option value="">Select Assembly</option>
              {assemblies.map((a) => <option key={a.assembly_no} value={a.assembly_no}>{a.assembly_no} - {a.assembly_name}</option>)}
            </select></div>
        </div>
        {err && <div className="alert err">{err}</div>}
        <table>
          <thead><tr><th>Booth</th><th>Username</th><th>Passcode</th><th>Status</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={4}><Spinner label="Loading booth logins…" /></td></tr> : (<>
              {rows.map((r) => (
                <tr key={r.booth_no}><td>{r.booth_no}</td><td>{r.username}</td><td>{r.passcode}</td><td>{r.status}</td></tr>
              ))}
              {!rows.length && <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 18 }}>No booth logins for this assembly.</td></tr>}
            </>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
