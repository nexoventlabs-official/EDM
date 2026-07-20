import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

const boothReportUrl = (assemblyNo, booth) =>
  '/report-files/' + ['Booth_Reports', `ASS ${assemblyNo} Booth Reports`, `Booth_${booth}_Report.html`]
    .map(encodeURIComponent).join('/');

const boothReportAltUrl = (assemblyNo, booth) =>
  '/' + ['Booth_Reports', `ASS ${assemblyNo} Booth Reports`, `Booth_${booth}_Report.html`]
    .map(encodeURIComponent).join('/');

export default function PerformanceReport() {
  const { user } = useAuth();
  const assemblyNo = user?.assembly_id;
  const booth = user?.booth_id;
  const [status, setStatus] = useState('loading'); // loading | ok | missing | noscope
  const [reportUrl, setReportUrl] = useState('');

  useEffect(() => {
    if (!assemblyNo || !booth) {
      api.get('/reports/documents').then(({ data }) => {
        const found = (data.documents || []).find((d) => d.kind === 'booth' || d.key.startsWith('booth'));
        if (found && found.exists && found.url) {
          setReportUrl(found.url);
          setStatus('ok');
        } else {
          setStatus('noscope');
        }
      }).catch(() => setStatus('noscope'));
      return;
    }

    const u1 = boothReportUrl(assemblyNo, booth);
    const u2 = boothReportAltUrl(assemblyNo, booth);

    fetch(u1, { method: 'HEAD' })
      .then((r) => {
        if (r.ok) {
          setReportUrl(u1);
          setStatus('ok');
        } else {
          fetch(u2, { method: 'HEAD' })
            .then((r2) => {
              if (r2.ok) {
                setReportUrl(u2);
                setStatus('ok');
              } else {
                setStatus('missing');
              }
            })
            .catch(() => setStatus('missing'));
        }
      })
      .catch(() => setStatus('missing'));
  }, [assemblyNo, booth]);

  return (
    <div style={{
      margin: '-28px -32px',
      width: 'calc(100% + 64px)',
      height: 'calc(100vh - 48px)',
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      overflow: 'hidden'
    }}>
      {status === 'noscope' && <div style={{ padding: 20 }}><div className="alert warn">No booth is assigned to your account.</div></div>}
      {status === 'loading' && <div style={{ padding: 20 }}><Spinner label="Loading performance report…" /></div>}
      {status === 'missing' && <div style={{ padding: 20 }}><div className="alert warn">No performance report has been generated for this booth.</div></div>}
      {status === 'ok' && reportUrl && (
        <iframe title="Booth Performance Report" src={reportUrl} style={{ width: '100%', height: '100%', flex: 1, border: 'none', display: 'block' }} />
      )}
    </div>
  );
}
