import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div className="sidebar-overlay" onClick={() => setNavOpen(false)} />}
      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button className="nav-toggle" aria-label="Toggle menu" onClick={() => setNavOpen((v) => !v)}>
              <span /><span /><span />
            </button>
            <strong>Election Data Management</strong>
          </div>
          <div>
            <span className="muted user-label" style={{ marginRight: 12 }}>{user?.name} ({user?.role})</span>
            <button className="secondary" onClick={logout}>Logout</button>
          </div>
        </div>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
