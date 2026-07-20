import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import VoterList from './pages/VoterList.jsx';
import AssemblyList from './pages/AssemblyList.jsx';
import AssemblyDetail from './pages/AssemblyDetail.jsx';
import BoothList from './pages/BoothList.jsx';
import MlaList from './pages/MlaList.jsx';
import MlaImages from './pages/MlaImages.jsx';
import BoothLogins from './pages/BoothLogins.jsx';
import WardLogins from './pages/WardLogins.jsx';
import CreateWardLogin from './pages/CreateWardLogin.jsx';
import AssemblyAnalytics from './pages/AssemblyAnalytics.jsx';
import HtmlReport from './pages/HtmlReport.jsx';
import BoothReport from './pages/BoothReport.jsx';
import PerformanceReport from './pages/PerformanceReport.jsx';
import WardHome from './pages/WardHome.jsx';
import SocialMedia from './pages/SocialMedia.jsx';
import SocialMediaReports from './pages/SocialMediaReports.jsx';
import Registrations from './pages/Registrations.jsx';
import RegistrationDetail from './pages/RegistrationDetail.jsx';
import RegistrationEdit from './pages/RegistrationEdit.jsx';
import Subscriptions from './pages/Subscriptions.jsx';
import FlowImages from './pages/FlowImages.jsx';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/register" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="voters" element={<VoterList />} />
        <Route path="assemblies" element={<AssemblyList />} />
        <Route path="assemblies/:no" element={<AssemblyDetail />} />
        <Route path="booths" element={<BoothList />} />
        <Route path="mla-list" element={<MlaList />} />
        <Route path="mla-images" element={<MlaImages />} />
        {/* Role-based login management */}
        <Route path="booth-logins" element={<BoothLogins />} />
        <Route path="ward-logins" element={<WardLogins />} />
        <Route path="ward-logins/create" element={<CreateWardLogin />} />
        {/* Role-scoped dashboards (super/mp/mla/booth/ward/king/dsa/tele) */}
        <Route path="assembly-details" element={<AssemblyAnalytics />} />
        <Route path="assembly-analytics" element={<AssemblyAnalytics />} />
        <Route path="candidate-briefing" element={<HtmlReport docKey="candidate-briefing" title="Candidate Briefing" />} />
        <Route path="field-operations" element={<HtmlReport docKey="field-operations" title="Field Operations Manual" />} />
        <Route path="booth-report" element={<BoothReport />} />
        <Route path="performance-report" element={<PerformanceReport />} />
        <Route path="booth/dashboard" element={<AssemblyAnalytics />} />
        <Route path="ward/dashboard" element={<WardHome />} />
        <Route path="ward/social-media" element={<SocialMedia />} />
        <Route path="ward/social-media-reports" element={<SocialMediaReports />} />
        {/* Registrations, Subscriptions, Flow Images */}
        <Route path="registrations" element={<Registrations />} />
        <Route path="registrations/view/:id" element={<RegistrationDetail />} />
        <Route path="registrations/edit/:id" element={<RegistrationEdit />} />
        <Route path="payments" element={<Subscriptions />} />
        <Route path="flow-images" element={<FlowImages />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
