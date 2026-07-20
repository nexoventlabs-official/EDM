import { useEffect, useState } from 'react';
import api from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [online, setOnline] = useState(true);
  const [epic, setEpic] = useState('');
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api.get('/dashboard/stats').then(({ data }) => {
      if (data.success) { setStats(data.stats); setOnline(data.voterDbOnline); }
    }).catch(() => {});
  }, []);

  const search = async (e) => {
    e.preventDefault();
    setSearching(true); setResult(null);
    try {
      const { data } = await api.get('/dashboard/search-epic', { params: { epic } });
      setResult(data);
    } catch { setResult({ success: false, message: 'Search failed.' }); }
    finally { setSearching(false); }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      {!online && <div className="alert warn">Live voter database is currently unreachable — counts below are the last known stored totals.</div>}
      <div className="tiles">
        <div className="tile green"><div>Total Voters</div><h3>{stats ? fmt(stats.totalVoters) : '…'}</h3></div>
        <div className="tile orange"><div>Male Voters</div><h3>{stats ? fmt(stats.maleVoters) : '…'}</h3></div>
        <div className="tile blue"><div>Female Voters</div><h3>{stats ? fmt(stats.femaleVoters) : '…'}</h3></div>
        <div className="tile red"><div>Other Voters</div><h3>{stats ? fmt(stats.otherVoters) : '…'}</h3></div>
      </div>

      <div className="card">
        <h2>Global EPIC Search</h2>
        <form className="row" onSubmit={search}>
          <div>
            <label>EPIC Number</label>
            <input placeholder="e.g. TAU3799640" value={epic} onChange={(e) => setEpic(e.target.value)} style={{ width: 260 }} />
          </div>
          <button disabled={searching}>{searching ? 'Searching…' : 'Search'}</button>
        </form>
        {searching && <Spinner label="Searching…" />}
        {!searching && result && (
          result.success ? (
            <table>
              <tbody>
                <tr><th>EPIC</th><td>{result.voter.EPIC_NO}</td></tr>
                <tr><th>Name (EN)</th><td>{result.voter.VOTER_NAME_EN}</td></tr>
                <tr><th>Name (TA)</th><td>{result.voter.VOTER_NAME}</td></tr>
                <tr><th>Relation Type</th><td>{result.voter.RELATION_TYPE}</td></tr>
                <tr><th>Assembly</th><td>{result.assembly_name} (#{result.voter.ASSEMBLY_NO})</td></tr>
                <tr><th>Part / Age / Gender</th><td>{result.voter.PART_NO} / {result.voter.AGE} / {result.voter.GENDER}</td></tr>
                <tr><th>Found in</th><td>{result.elapsed_ms} ms</td></tr>
              </tbody>
            </table>
          ) : <div className="alert err">{result.message || 'Not found.'}</div>
        )}
      </div>
    </div>
  );
}
