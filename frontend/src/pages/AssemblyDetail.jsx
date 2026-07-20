import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

export default function AssemblyDetail() {
  const { no } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');

  const load = () =>
    api.get(`/assemblies/${no}`).then(({ data }) => setD(data)).catch((e) => setErr(e.response?.data?.message || 'Failed.'));
  useEffect(() => { load(); }, [no]);

  const startEdit = () => {
    const a = d.assembly;
    setForm({
      assembly_name: a.assembly_name || '', district: a.district || '',
      total_voters: a.total_voters || 0, male_voters: a.male_voters || 0,
      female_voters: a.female_voters || 0, third_gender_voters: a.third_gender_voters ?? a.other_voters ?? 0,
    });
    setEditing(true); setMsg('');
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setMsg('');
    try {
      const { data } = await api.put(`/assemblies/${no}`, form);
      if (data.success) { setEditing(false); setMsg('Assembly updated.'); load(); }
    } catch (e) { setMsg(e.response?.data?.message || 'Update failed.'); }
  };

  if (err) return <div className="alert err">{err}</div>;
  if (!d) return <Spinner label="Loading…" />;
  const a = d.assembly;

  return (
    <div>
      <Link to="/assemblies" className="muted">← Assemblies</Link>
      <h1 style={{ marginTop: 6 }}>{a.assembly_no} — {a.assembly_name}</h1>
      {msg && <div className="alert warn">{msg}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Stored counts (tbl_assembly_consitituency)</h2>
          {!editing && <button onClick={startEdit}>Edit</button>}
        </div>
        {!editing ? (
          <table><tbody>
            <tr><th>Total</th><td>{fmt(a.total_voters)}</td><th>Male</th><td>{fmt(a.male_voters)}</td></tr>
            <tr><th>Female</th><td>{fmt(a.female_voters)}</td><th>Other</th><td>{fmt(a.third_gender_voters ?? a.other_voters)}</td></tr>
            <tr><th>District</th><td>{a.district || '-'}</td><th>Collection</th><td>{a.table_name || `ass_${a.assembly_no}`}</td></tr>
          </tbody></table>
        ) : (
          <div>
            <div className="row">
              <div><label>Name</label><input value={form.assembly_name} onChange={set('assembly_name')} /></div>
              <div><label>District</label><input value={form.district} onChange={set('district')} /></div>
            </div>
            <div className="row">
              <div><label>Total</label><input value={form.total_voters} onChange={set('total_voters')} /></div>
              <div><label>Male</label><input value={form.male_voters} onChange={set('male_voters')} /></div>
              <div><label>Female</label><input value={form.female_voters} onChange={set('female_voters')} /></div>
              <div><label>Other</label><input value={form.third_gender_voters} onChange={set('third_gender_voters')} /></div>
            </div>
            <button onClick={save}>Save</button>{' '}
            <button className="secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Live gender counts (from voter collection)</h2>
        {d.liveCounts ? (
          <table><tbody>
            <tr><th>Total</th><td>{fmt(d.liveCounts.total)}</td><th>Male</th><td>{fmt(d.liveCounts.male)}</td></tr>
            <tr><th>Female</th><td>{fmt(d.liveCounts.female)}</td><th>Other</th><td>{fmt(d.liveCounts.other)}</td></tr>
          </tbody></table>
        ) : <div className="alert warn">Voter database is unreachable — live counts unavailable.</div>}
      </div>
    </div>
  );
}
