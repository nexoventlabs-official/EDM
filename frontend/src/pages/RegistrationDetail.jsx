import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import { IconCall, IconMail, IconWhatsApp, IconAudio, IconEdit } from '../components/Icons.jsx';

// Port of admin/pages/view_registration.blade.php — registration summary + the
// candidate's social-media broadcast requests.
const ROLE_LABEL = {
  planning: 'Planning to Contest', confirmed: 'Confirmed Candidate',
  team: 'Campaign Team Member', functionary: 'Party Functionary',
};
const fmt = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};
const wa = (m) => { const d = String(m || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; };

function Row({ label, children }) {
  return (
    <div className="kv">
      <div className="kv-k">{label}</div>
      <div className="kv-v">{children}</div>
    </div>
  );
}

function ServiceBadge({ type, language }) {
  if (type === 'sms') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef2f0', color: '#d85028', border: '1px solid #ffccbc', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700 }}>
        <IconMail size={16} color="#d85028" /> SMS ({language || 'English'})
      </span>
    );
  }
  if (type === 'voice') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fdeded', color: '#e53935', border: '1px solid #fca5a5', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700 }}>
        <IconAudio size={16} color="#e53935" /> AUDIO SMS
      </span>
    );
  }
  if (type === 'whatsapp') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eefbf3', color: '#15803d', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700 }}>
        <IconWhatsApp size={18} /> WHATSAPP
      </span>
    );
  }
  return <span className="badge-info">{type}</span>;
}

export default function RegistrationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reg, setReg] = useState(null);
  const [requests, setRequests] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/registrations/${id}`)
      .then(({ data }) => {
        if (data.success) { setReg(data.registration); setRequests(data.socialRequests || []); }
        else setErr(data.message || 'Not found.');
      })
      .catch((e) => setErr(e.response?.data?.message || 'Registration not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner label="Loading…" />;
  if (err) return <div><div className="alert err">{err}</div><Link to="/registrations" className="btn-link">← Back to Registrations</Link></div>;

  const r = reg || {};
  const roleLabel = ROLE_LABEL[r.role] || r.role || '-';
  const editId = r._id || r.id;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="secondary" onClick={() => navigate('/registrations')}>← Back</button>
          <h1 style={{ margin: 0 }}>Registration Details</h1>
        </div>
        <button onClick={() => navigate(`/registrations/edit/${editId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconEdit size={16} color="#fff" /> Edit Details</button>
      </div>

      <div className="reg-grid">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Personal Information</h3>
          <Row label="Full Name"><strong>{r.full_name || r.firstname || '-'}</strong></Row>
          <Row label="Mobile Number">
            {r.mobile || '-'}
            {r.mobile && (
              <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <a className="act-btn" title="Call" href={`tel:+91${String(r.mobile).replace(/\D/g, '')}`}><IconCall size={18} color="#d85028" /></a>
                <a className="act-btn wa-btn" title="WhatsApp" target="_blank" rel="noreferrer" href={`https://api.whatsapp.com/send?phone=${wa(r.mobile)}`}><IconWhatsApp size={20} /></a>
              </span>
            )}
          </Row>
          <Row label="Passcode">{r.passcode ? <code style={{ background: '#e8f5e9', color: '#2e7d32', fontWeight: 700 }}>{r.passcode}</code> : '-'}</Row>
          <Row label="Registered At">{fmt(r.created_at)}</Row>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Political &amp; Position Details</h3>
          <Row label="Role">{roleLabel}</Row>
          <Row label="Affiliation"><span style={{ textTransform: 'capitalize' }}>{r.affiliation || '-'}</span></Row>
          {r.affiliation === 'affiliated' && <Row label="Party">{r.party || '-'}</Row>}
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginTop: 0 }}>Constituency Details</h3>
          <div className="reg-const">
            <Row label="District">{r.district || '-'}</Row>
            <Row label="Local Body Type"><span style={{ textTransform: 'capitalize' }}>{r.body_type || '-'}</span></Row>
            <Row label="Position">{r.position || '-'}</Row>
            <Row label="Union / Muni">{r.union_or_municipality || '-'}</Row>
            <Row label="Panchayat / Corp">{r.panchayat_or_corporation || '-'}</Row>
            <Row label="Ward Number">{r.ward_number || '-'}</Row>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Social Media Broadcast Requests</h3>
        {!requests.length ? (
          <div className="muted" style={{ textAlign: 'center', padding: 18 }}>No broadcast requests have been submitted by this candidate.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Service Type</th><th>Created At</th><th>Audience Filter</th><th>Requested Content / Media</th></tr></thead>
              <tbody>
                {requests.map((q, i) => (
                  <tr key={i}>
                    <td><ServiceBadge type={q.service_type} language={q.language} /></td>
                    <td>{fmt(q.created_at)}</td>
                    <td>
                      {q.all_voters || q.booth_no === 'All'
                        ? <strong style={{ color: '#1a237e' }}>All Voters in Ward</strong>
                        : (
                          <>
                            <div><strong>Booth No:</strong> Part {q.booth_no ?? '-'}</div>
                            {q.section_no && <div style={{ fontSize: 12, color: '#666' }}><strong>Section:</strong> {q.section_no}</div>}
                          </>
                        )}
                    </td>
                    <td>
                      {/* Audio Player Preview & Download Button for Voice SMS */}
                      {(q.service_type === 'voice' || q.has_audio) && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, maxWidth: 460, marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#e53935', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <IconAudio size={18} color="#e53935" /> Audio Message Recording
                            </span>
                            {(q.audio_url || q.media_urls?.[0]) ? (
                              <a href={q.audio_url || q.media_urls[0]} download className="button secondary" style={{ padding: '4px 12px', borderRadius: 14, fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                ⬇ Download Audio
                              </a>
                            ) : (
                              <span className="badge-info" style={{ fontSize: 11.5 }}>Audio Attached</span>
                            )}
                          </div>
                          <audio controls src={q.audio_url || q.media_urls?.[0] || ''} style={{ width: '100%', height: 38, borderRadius: 8 }} />
                        </div>
                      )}

                      {/* Photo Preview Thumbnail & Download Button for WhatsApp / Photo Attachment */}
                      {(q.service_type === 'whatsapp' || q.has_image || q.image_url || q.media_urls?.length > 0) && q.service_type !== 'voice' && (
                        <div style={{ marginBottom: 8 }}>
                          {(q.image_url || q.media_urls?.[0]) ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, maxWidth: 460, marginBottom: 8 }}>
                              <img src={q.image_url || q.media_urls[0]} alt="Attached Photo" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>Photo Attachment</div>
                                <div className="muted" style={{ fontSize: 12 }}>Image Media File</div>
                              </div>
                              <a href={q.image_url || q.media_urls[0]} download target="_blank" rel="noreferrer" className="button secondary" style={{ padding: '5px 14px', borderRadius: 14, fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                ⬇ Download Photo
                              </a>
                            </div>
                          ) : (
                            <div className="muted" style={{ fontSize: 12.5, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                              📷 Photo attached with request
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message Content Text Card */}
                      {q.message_content ? (
                        <div style={{ background: q.service_type === 'whatsapp' ? '#eefbf3' : '#f8fafc', border: q.service_type === 'whatsapp' ? '1px solid #a7f3d0' : '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 13.5, color: '#1e293b', maxWidth: 500, lineHeight: 1.5 }}>
                          {q.message_content}
                        </div>
                      ) : (
                        (!q.media_urls?.length && !q.has_image && !q.has_audio ? <span className="muted">—</span> : null)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
