import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/Spinner.jsx';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const boothUrl = (no, part) => '/report-files/' + [`Booth_Reports`, `ASS ${no} Booth Reports`, `Booth_${part}_Report.html`].map(encodeURIComponent).join('/');

// Booth Report — mirrors ReportController@boothReport (scoped to the login's
// assembly). Per-booth gender breakdown + link to each booth's HTML report.
export default function BoothReport() {
  const { user } = useAuth();
  const isAdmin = Number(user?.group_id || 1) === 1;

  const [assemblies, setAssemblies] = useState([]);
  const [assemblyId, setAssemblyId] = useState('');
  const [data, setData] = useState(null);
  const [htmlBooths, setHtmlBooths] = useState(new Set());
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (id) => {
    setErr(''); setLoading(true); setData(null);
    try {
      const params = isAdmin && id ? { assemblyId: id } : {};
      const { data } = await api.get('/reports/booth', { params });
      setData(data);
      try {
        const { data: bl } = await api.get('/reports/booth-report-list', { params });
        setHtmlBooths(new Set((bl.booths || []).map(Number)));
      } catch { setHtmlBooths(new Set()); }
    } catch (e) { setErr(e.response?.data?.message || 'Unable to load booth report.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isAdmin) api.get('/assemblies').then(({ data }) => setAssemblies(data.assemblies || [])).catch(() => {});
    else load();
    // eslint-disable-next-line
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Booth Report</h1>
      {isAdmin && (
        <div className="card">
          <div className="row">
            <div><label>Assembly</label>
              <select value={assemblyId} onChange={(e) => { setAssemblyId(e.target.value); load(e.target.value); }}>
                <option value="">Select Assembly</option>
                {assemblies.map((a) => <option key={a.assembly_no} value={a.assembly_no}>{a.assembly_no} - {a.assembly_name}</option>)}
              </select></div>
          </div>
        </div>
      )}
      {loading && <Spinner label="Loading report…" />}
      {err && <div className="alert warn">{err}</div>}

      {data && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>{data.assembly_no} — {data.assembly_name} · {data.district}</p>
          <div className="tiles">
            <div className="tile green"><div>Total</div><h3>{fmt(data.totals.total)}</h3></div>
            <div className="tile orange"><div>Male</div><h3>{fmt(data.totals.male)}</h3></div>
            <div className="tile blue"><div>Female</div><h3>{fmt(data.totals.female)}</h3></div>
            <div className="tile red"><div>Other</div><h3>{fmt(data.totals.other)}</h3></div>
          </div>
          <div className="card">
            <table>
              <thead><tr><th>Booth</th><th>Name</th><th>Total</th><th>Male</th><th>Female</th><th>Other</th><th>Report</th></tr></thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.part_no}>
                    <td>{r.part_no}</td><td>{r.booth_name}</td>
                    <td>{fmt(r.total)}</td><td>{fmt(r.male)}</td><td>{fmt(r.female)}</td><td>{fmt(r.other)}</td>
                    <td>{htmlBooths.has(Number(r.part_no))
                      ? <a href={boothUrl(data.assembly_no, r.part_no)} target="_blank" rel="noreferrer"><button className="secondary">Open</button></a>
                      : <span className="muted">—</span>}</td>
                  </tr>
                ))}
                {!data.rows.length && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 18 }}>No booth data.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
