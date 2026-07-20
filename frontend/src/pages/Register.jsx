import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { RURAL_POSITIONS, URBAN_POSITIONS, districtsFor, bodiesFor } from '../data/localBodies.js';

const PARTIES = ['DMK', 'AIADMK', 'BJP', 'INC', 'NTK', 'PMK', 'VCK', 'MDMK', 'AMMK', 'DMDK', 'TVK', 'Independent', 'Other'];
const ROLES = [['planning', 'Planning to Contest'], ['confirmed', 'Confirmed Candidate'], ['team', 'Campaign Team Member'], ['functionary', 'Party Functionary']];

// Mirrors createlogin.blade.php — the public candidate registration landing page.
export default function Register() {
  const [f, setF] = useState({
    full_name: '', mobile: '', role: '', affiliation: '', party: '',
    body_type: '', position: '', district: '', local_body: '', ward_number: '',
  });
  const [done, setDone] = useState(null); // { username, passcode }
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const positions = f.body_type === 'urban' ? URBAN_POSITIONS : f.body_type === 'rural' ? RURAL_POSITIONS : [];
  const districts = useMemo(() => (f.position ? districtsFor(f.position) : []), [f.position]);
  const bodies = useMemo(() => bodiesFor(f.position, f.district), [f.position, f.district]);
  const wards = useMemo(() => {
    const b = bodies.find((x) => x.name === f.local_body);
    return b ? Array.from({ length: b.wards }, (_, i) => i + 1) : [];
  }, [bodies, f.local_body]);
  const isUrban = f.body_type === 'urban';

  // progress across the visible required fields
  const required = ['full_name', 'mobile', 'role', 'affiliation', 'body_type', 'position', 'district']
    .concat(isUrban ? ['local_body', 'ward_number'] : []);
  const pct = Math.round((required.filter((k) => String(f[k] || '').trim()).length / required.length) * 100);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!f.full_name.trim() || !/^\d{10}$/.test(f.mobile)) { setErr('Enter your name and a valid 10-digit mobile number.'); return; }
    setLoading(true);
    try {
      const payload = {
        full_name: f.full_name, mobile: f.mobile, role: f.role, affiliation: f.affiliation,
        party: f.party, body_type: f.body_type, position: f.position, district: f.district,
        panchayat_or_corporation: f.local_body, ward_number: f.ward_number,
      };
      const { data } = await api.post('/auth/register', payload);
      if (data.success) setDone({ username: data.username, passcode: data.passcode });
      else setErr(data.message || 'Registration failed.');
    } catch (e2) { setErr(e2.response?.data?.message || 'Registration failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="tricolor-bar" />
      <header className="reg-header">
        <div className="reg-brand">🗳 Election Data Management 2026</div>
        <Link to="/login" className="gov-link" style={{ color: '#1a237e' }}>Login →</Link>
      </header>

      <div className="reg-split">
        <div className="reg-hero">
          <div>
            <div className="eyebrow">Tamil Nadu Local Body Elections · 2026</div>
            <h1>Everything you need to contest 2026.</h1>
            <p>Register to access constituency insights, campaign resources, and election support.</p>
            <div className="reg-stats">
              <div><div className="n">38</div><div className="l">Districts</div></div>
              <div><div className="n">2026</div><div className="l">Election cycle</div></div>
              <div><div className="n">&lt;2 min</div><div className="l">To register</div></div>
            </div>
          </div>
        </div>

        <div className="reg-form-wrap">
          <div className="reg-card">
            {!done ? (
              <>
                <div className="progress-head">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    <span>Form completion</span><span>{pct}%</span>
                  </div>
                  <div className="reg-progress"><div style={{ width: `${pct}%` }} /></div>
                </div>
                <form className="reg-body" onSubmit={submit}>
                  {/* 01 details */}
                  <div><span className="reg-step-no">01</span><span className="reg-step-title">Your details</span></div>
                  <div className="reg-field" style={{ marginTop: 12 }}>
                    <label>Full name</label>
                    <input value={f.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="As per voter ID" />
                  </div>
                  <div className="reg-field">
                    <label>Mobile number</label>
                    <input value={f.mobile} maxLength={10} onChange={(e) => set('mobile', e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile" />
                  </div>

                  <div className="reg-sep" />
                  {/* 02 role & affiliation */}
                  <div><span className="reg-step-no">02</span><span className="reg-step-title">Role &amp; affiliation</span></div>
                  <div className="reg-field" style={{ marginTop: 12 }}>
                    <label>Your role</label>
                    <div className="reg-options">
                      {ROLES.map(([v, lbl]) => (
                        <button type="button" key={v} className={`reg-opt ${f.role === v ? 'active' : ''}`} onClick={() => set('role', v)}>{lbl}</button>
                      ))}
                    </div>
                  </div>
                  <div className="reg-field">
                    <label>Political affiliation</label>
                    <div className="reg-options">
                      <button type="button" className={`reg-opt ${f.affiliation === 'affiliated' ? 'active' : ''}`} onClick={() => set('affiliation', 'affiliated')}>Affiliated with a party</button>
                      <button type="button" className={`reg-opt ${f.affiliation === 'independent' ? 'active' : ''}`} onClick={() => { set('affiliation', 'independent'); set('party', ''); }}>Independent</button>
                    </div>
                  </div>
                  {f.affiliation === 'affiliated' && (
                    <div className="reg-field">
                      <label>Party</label>
                      <select value={f.party} onChange={(e) => set('party', e.target.value)}>
                        <option value="">Select party</option>
                        {PARTIES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="reg-sep" />
                  {/* 03 constituency */}
                  <div><span className="reg-step-no">03</span><span className="reg-step-title">Your constituency</span></div>
                  <div className="reg-field" style={{ marginTop: 12 }}>
                    <label>Local body type</label>
                    <div className="reg-options">
                      <button type="button" className={`reg-opt ${f.body_type === 'rural' ? 'active' : ''}`} onClick={() => setF((s) => ({ ...s, body_type: 'rural', position: '', district: '', local_body: '', ward_number: '' }))}>
                        Rural Local Body<br /><small className="muted">Panchayats, Unions, District Panchayat</small>
                      </button>
                      <button type="button" className={`reg-opt ${f.body_type === 'urban' ? 'active' : ''}`} onClick={() => setF((s) => ({ ...s, body_type: 'urban', position: '', district: '', local_body: '', ward_number: '' }))}>
                        Urban Local Body<br /><small className="muted">Town Panchayats, Municipalities, Corporations</small>
                      </button>
                    </div>
                  </div>
                  {!!positions.length && (
                    <div className="reg-field">
                      <label>Position you're contesting</label>
                      <select value={f.position} onChange={(e) => setF((s) => ({ ...s, position: e.target.value, district: '', local_body: '', ward_number: '' }))}>
                        <option value="">Select position</option>
                        {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  )}
                  {!!f.position && (
                    <div className="reg-field">
                      <label>District</label>
                      <select value={f.district} onChange={(e) => setF((s) => ({ ...s, district: e.target.value, local_body: '', ward_number: '' }))}>
                        <option value="">Select your district</option>
                        {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  )}
                  {isUrban && !!f.district && (
                    <div className="reg-field">
                      <label>{f.position}</label>
                      <select value={f.local_body} onChange={(e) => setF((s) => ({ ...s, local_body: e.target.value, ward_number: '' }))}>
                        <option value="">Select {f.position.toLowerCase()}</option>
                        {bodies.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                  )}
                  {isUrban && !!wards.length && (
                    <div className="reg-field">
                      <label>Ward Number</label>
                      <select value={f.ward_number} onChange={(e) => set('ward_number', e.target.value)}>
                        <option value="">Select ward</option>
                        {wards.map((w) => <option key={w} value={`ward-${w}`}>Ward {w}</option>)}
                      </select>
                    </div>
                  )}

                  {err && <div className="alert err" style={{ marginTop: 16 }}>{err}</div>}
                  <button className="reg-submit" disabled={loading}>{loading ? 'Processing…' : 'Submit registration'}</button>
                </form>
              </>
            ) : (
              <div className="reg-success">
                <div style={{ fontSize: 40 }}>✅</div>
                <h2 style={{ margin: '10px 0 4px' }}>Registration Successful!</h2>
                <p className="muted">Your login credentials were generated from your mobile number. Copy them below.</p>
                <div className="reg-cred">
                  <div style={{ marginBottom: 12 }}><div className="k">Username</div><div className="v">{done.username}</div></div>
                  <div><div className="k">Passcode / Password</div><div className="v">{done.passcode}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="secondary" style={{ flex: 1 }} onClick={() => navigator.clipboard?.writeText(done.passcode)}>Copy Passcode</button>
                  <Link to="/login" style={{ flex: 1 }}><button className="gov-btn" style={{ width: '100%' }}>Login Now</button></Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
