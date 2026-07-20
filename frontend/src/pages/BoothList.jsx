import { useEffect, useState } from 'react';
import api from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

export default function BoothList() {
  const [assemblies, setAssemblies] = useState([]);
  const [assemblyId, setAssemblyId] = useState('');
  const [booths, setBooths] = useState([]);
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
    setAssemblyId(id); setBooths([]); setErr('');
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/booths', { params: { assemblyId: id } });
      setBooths(data.booths || []);
    } catch (e) { setErr(e.response?.data?.message || 'Failed to load booths.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Booth List</h1>
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
          <thead><tr><th>Part No</th><th>Booth Name</th><th>Section</th><th>Lat/Long Status</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={4}><Spinner label="Loading booths…" /></td></tr> : (<>
              {booths.map((b) => (
                <tr key={b.part_no}>
                  <td>{b.part_no}</td><td>{b.booth_name}</td><td>{b.section_name}</td>
                  <td>
                    {b.has_coords
                      ? <span className="badge-success">Available</span>
                      : <span className="badge-info" style={{ background: '#d9534f' }}>Not Available</span>}
                  </td>
                </tr>
              ))}
              {!booths.length && <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 18 }}>No booths.</td></tr>}
            </>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
