import { useEffect, useState } from 'react';
import api from '../api/client.js';

// Port of web\admin\FlowImagesController + admin.pages.flow_images.
// Fixed set of WhatsApp Flow assets (registration headers + party flags). Each
// card shows the current media preview and lets you upload a new file, which is
// sent to the backend and stored on Cloudinary (folder election-flow-assets).
export default function FlowImages() {
  const [assets, setAssets] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');   // key currently uploading
  const [picked, setPicked] = useState({}); // key -> { file, preview }

  const load = () =>
    api.get('/flow-images')
      .then(({ data }) => setAssets(data.assets || []))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load.'));

  useEffect(() => { load(); }, []);

  const pick = (key, file) => {
    setErr(''); setMsg('');
    if (!file) { setPicked((p) => ({ ...p, [key]: null })); return; }
    if (file.size > 10 * 1024 * 1024) { setErr('File too large (max 10MB).'); return; }
    setPicked((p) => ({ ...p, [key]: { file, preview: URL.createObjectURL(file), isVideo: file.type.includes('video') } }));
  };

  const readAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]+;base64,/, ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const upload = async (key) => {
    const sel = picked[key];
    if (!sel?.file) { setErr('Choose a file first.'); return; }
    setErr(''); setMsg(''); setBusy(key);
    try {
      const fileBase64 = await readAsBase64(sel.file);
      const { data } = await api.post('/flow-images/upload', {
        key, filename: sel.file.name, mime: sel.file.type, fileBase64,
      });
      if (data.success) {
        setMsg(data.message || 'Uploaded.');
        setPicked((p) => ({ ...p, [key]: null }));
        load();
      } else {
        setErr(data.message || 'Upload failed.');
      }
    } catch (e) {
      setErr(e.response?.data?.message || 'Upload failed.');
    } finally { setBusy(''); }
  };

  const remove = async (key) => {
    if (!confirm('Remove this asset (also deletes it from Cloudinary)?')) return;
    setErr(''); setMsg('');
    try { await api.delete(`/flow-images/${key}`); setMsg('Removed.'); load(); }
    catch (e) { setErr(e.response?.data?.message || 'Delete failed.'); }
  };

  const renderPreview = (a) => {
    const sel = picked[a.key];
    if (sel?.preview) {
      return sel.isVideo
        ? <video src={sel.preview} className="fa-media" controls />
        : <img src={sel.preview} className="fa-media" alt="preview" />;
    }
    if (a.url) {
      return a.type === 'video'
        ? <video src={a.url} className="fa-media" controls />
        : <img src={a.url} className="fa-media" alt={a.name} />;
    }
    return <div className="fa-media fa-empty">No media uploaded</div>;
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>WhatsApp Flow Asset Manager</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Media used in WhatsApp Flow headers and party flags. Upload a file to store it on Cloudinary and register it here.
      </p>
      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert warn">{msg}</div>}

      <div className="fa-grid">
        {assets.map((a) => {
          const sel = picked[a.key];
          return (
            <div className="card fa-card" key={a.key}>
              <div className="fa-head">
                <strong>{a.name}</strong>
                <span className={`badge ${a.type === 'video' ? 'badge-video' : 'badge-image'}`}>{a.type}</span>
              </div>
              <div className="muted fa-desc">{a.description}</div>
              <code className="fa-key">{a.key}</code>

              {renderPreview(a)}

              <div className="fa-actions">
                <input
                  type="file"
                  accept={a.default_type === 'video' || a.type === 'video' ? 'image/*,video/*' : 'image/*'}
                  onChange={(e) => pick(a.key, e.target.files?.[0])}
                />
                <button disabled={!sel?.file || busy === a.key} onClick={() => upload(a.key)}>
                  {busy === a.key ? 'Uploading…' : a.url ? 'Replace' : 'Upload'}
                </button>
                {a.url && <button className="danger" disabled={busy === a.key} onClick={() => remove(a.key)}>Delete</button>}
              </div>
            </div>
          );
        })}
        {!assets.length && <div className="muted">No flow assets defined.</div>}
      </div>
    </div>
  );
}
