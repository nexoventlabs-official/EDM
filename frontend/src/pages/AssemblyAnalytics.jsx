import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Chart, registerables } from 'chart.js';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/Spinner.jsx';

// Fix Leaflet's default marker icons — serve them from /public/leaflet so the
// paths resolve reliably (the bundler-import approach renders broken pins).
const boothIcon = L.icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
Chart.register(...registerables);

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

// Mirrors ReportController@assemblyDetails — TN district map (Leaflet + OSM),
// gender tiles, and age-group distribution graph, scoped to the login's assembly.
export default function AssemblyAnalytics() {
  const { user } = useAuth();
  const isAdmin = Number(user?.group_id || 1) === 1;

  const [assemblies, setAssemblies] = useState([]);
  const [assemblyId, setAssemblyId] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null);
  const chartEl = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (isAdmin) {
      api.get('/assemblies').then(({ data }) => {
        const list = data.assemblies || [];
        setAssemblies(list);
        if (list.length) { setAssemblyId(String(list[0].assembly_no)); load(String(list[0].assembly_no)); } // default: first assembly
      }).catch(() => {});
    } else {
      load();
    }
    // eslint-disable-next-line
  }, []);

  const load = async (id) => {
    setErr(''); setLoading(true);
    try {
      const params = isAdmin && id ? { assemblyId: id } : {};
      const { data } = await api.get('/reports/assembly-analytics', { params });
      setData(data);
    } catch (e) { setErr(e.response?.data?.message || 'Unable to load analytics.'); setData(null); }
    finally { setLoading(false); }
  };

  // Render / refresh the Leaflet map when booth data arrives.
  useEffect(() => {
    if (!data || !mapEl.current) return;
    if (!mapRef.current) {
      mapRef.current = L.map(mapEl.current, { scrollWheelZoom: false }).setView([11.1271, 78.6569], 7);
      
      const googleStreets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps',
      });

      const googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps',
      });

      const osmColor = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });

      googleStreets.addTo(mapRef.current);

      L.control.layers({
        'Google Maps (Default)': googleStreets,
        'Google Satellite': googleHybrid,
        'OpenStreetMap': osmColor,
      }).addTo(mapRef.current);

      markersRef.current = L.layerGroup().addTo(mapRef.current);
    }
    markersRef.current.clearLayers();
    const pts = (data.booths || []).filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng) && (b.lat !== 0 || b.lng !== 0));
    pts.forEach((b) => {
      L.marker([b.lat, b.lng], { icon: boothIcon }).bindPopup(`<b>Booth ${b.part_no}</b><br/>${b.booth_name || ''}`).addTo(markersRef.current);
    });
    if (pts.length === 1) {
      mapRef.current.setView([pts[0].lat, pts[0].lng], 14);
    } else if (pts.length) {
      mapRef.current.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])).pad(0.1));
    }
    setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 100);
  }, [data]);

  // Render / refresh the age-group bar chart.
  useEffect(() => {
    if (!data || !chartEl.current) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(chartEl.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Youth (18-35)', 'Middle-aged (36-59)', 'Senior (60+)'],
        datasets: [{
          label: 'Voters',
          data: [data.youth, data.middle, data.senior],
          backgroundColor: ['#2e9e5b', '#e8871e', '#d9534f'],
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { callback: (v) => Number(v).toLocaleString('en-IN') } } },
      },
    });
  }, [data]);

  // Cleanup on unmount.
  useEffect(() => () => {
    if (chartRef.current) chartRef.current.destroy();
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
  }, []);

  const isBooth = !!(data && data.booth);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
            {isBooth ? `Welcome to ${data?.assembly_name || ''} (Booth ${data?.booth || ''}) Dashboard` : 'Assembly Details'}
          </h1>
          {data && (
            <div style={{ fontSize: 14, color: '#666', marginTop: 4, fontWeight: 600 }}>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{isBooth ? 'BOOTH LOCATION MAP' : 'TN DISTRICT MAP'}: </span>
              <span style={{ color: '#d9534f', fontWeight: 700 }}>{(data.district || '').toUpperCase()}</span>
              {data.assembly_name && <span> · {data.assembly_no} - {data.assembly_name}</span>}
            </div>
          )}
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontWeight: 600, fontSize: 14 }}>Assembly:</label>
            <select value={assemblyId} onChange={(e) => { setAssemblyId(e.target.value); load(e.target.value); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ccc', fontWeight: 600, background: '#fff' }}>
              <option value="">Select Assembly</option>
              {assemblies.map((a) => <option key={a.assembly_no} value={a.assembly_no}>{a.assembly_no} - {a.assembly_name}</option>)}
            </select>
          </div>
        )}
      </div>

      {err && <div className="alert err">{err}</div>}
      {loading && <Spinner label="Loading analytics…" />}

      {data && (
        <>
          {/* Top 2-Column Grid: Full View Map on Left, 2x2 Stat Cards on Right */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 20, alignItems: 'stretch' }}>
            {/* Full View Map Card */}
            <div className="card" style={{ margin: 0, padding: 0, overflow: 'hidden', height: '100%', minHeight: 330, borderRadius: 16 }}>
              <div ref={mapEl} style={{ width: '100%', height: '100%', minHeight: 330 }} />
            </div>

            {/* 4 Stat Tiles in Perfectly Aligned 2x2 Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div className="tile green" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 24px', minHeight: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8, marginBottom: 8 }}>Total Voters</div>
                <h3 style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{fmt(data.total)}</h3>
              </div>
              <div className="tile blue" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 24px', minHeight: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8, marginBottom: 8 }}>Male</div>
                <h3 style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{fmt(data.male)}</h3>
              </div>
              <div className="tile red" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 24px', minHeight: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8, marginBottom: 8 }}>Female</div>
                <h3 style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{fmt(data.female)}</h3>
              </div>
              <div className="tile orange" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 24px', minHeight: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8, marginBottom: 8 }}>Others</div>
                <h3 style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{fmt(data.other)}</h3>
              </div>
            </div>
          </div>

          {/* Bottom Full-Width Card: Age Group Distribution */}
          <div className="card">
            <h2>{isBooth ? 'Booth Stats & Distribution' : 'Age Group Distribution'}</h2>
            <div className="row" style={{ marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
              <span className="badge-success">Youth (18-35): {fmt(data.youth)}</span>{' '}
              <span className="badge-info" style={{ background: '#e8871e' }}>Middle-aged (36-59): {fmt(data.middle)}</span>{' '}
              <span className="badge-info" style={{ background: '#d9534f' }}>Senior (60+): {fmt(data.senior)}</span>
            </div>
            <div style={{ height: 280 }}><canvas ref={chartEl} /></div>
          </div>

          <p className="muted">{data.assembly_no} — {data.assembly_name} · {(data.booths || []).length} booths mapped</p>
        </>
      )}
    </div>
  );
}
