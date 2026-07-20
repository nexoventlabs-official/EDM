import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Role-gated navigation — mirrors admin/layout/nav.blade.php, which shows a
// different link set per user_group_id. Each entry is [path, label].
const MENUS = {
  // 1 = Super Admin — mirrors the PHP admin top nav (topheader.blade.php):
  // Dashboard, MLA List, Assembly (List / Details / Booth Wise Login),
  // Booth List, Voters List, Subscriptions, Registrations, Flow Images, Ward Logins.
  1: [
    ['/dashboard', 'Dashboard'],
    ['/mla-list', 'MLA List'],
    ['/mla-images', 'MLA Images'],
    ['/assemblies', 'Assembly List'],
    ['/assembly-analytics', 'Assembly Details'],
    ['/booth-logins', 'Booth Wise Login'],
    ['/booths', 'Booth List'],
    ['/voters', 'Voters List'],
    ['/payments', 'Subscriptions'],
    ['/registrations', 'Registrations'],
    ['/flow-images', 'Flow Images'],
    ['/ward-logins', 'Ward Logins'],
  ],
  // 3 = MLA / Assembly — mirrors the assembly-login nav bar
  3: [
    ['/assembly-details', 'Assembly Details'],
    ['/voters', 'Voters List'],
    ['/booth-report', 'Booth Report'],
    ['/candidate-briefing', 'Candidate Briefing'],
    ['/field-operations', 'Field Operations'],
  ],
  // 4 / 11 = Booth Agent — mirrors the booth-login nav (Dashboard, Voters, Performance)
  4: [
    ['/booth/dashboard', 'Dashboard'],
    ['/voters', 'Voters List'],
    ['/performance-report', 'Performance Report'],
  ],
  // 6 = Ward Agent — Home + Voter List only when booths are assigned;
  //     Social Media + Social Media Reports always (see wardMenu()).
  6: [
    ['/ward/social-media', 'Social Media'],
    ['/ward/social-media-reports', 'Social Media Reports'],
  ],
};
MENUS[11] = MENUS[4]; // Booth (alt)

// Ward menu: Home + Voter List appear only once the admin assigns booths
// (mirrors topheader.blade.php hasWardBooths gate); social links always show.
function wardMenu(user) {
  const hasBooths = user?.has_booths !== false && user?.has_booths !== 0;
  if (!hasBooths) {
    return [
      ['/ward/dashboard', 'Home'],
      ['/ward/dashboard#sample', 'Sample Data'],
      ['/voters', 'Voter List 🔒', null, true],
      ['/ward/social-media', 'Social Media'],
      ['/ward/social-media-reports', 'Social Media Reports'],
    ];
  }
  return [
    ['/ward/dashboard', 'Home'],
    ['/voters', 'Voter List'],
    ['/ward/social-media', 'Social Media'],
    ['/ward/social-media-reports', 'Social Media Reports'],
  ];
}

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { user } = useAuth();
  const groupId = Number(user?.group_id || 1);
  const links = groupId === 6 ? wardMenu(user) : (MENUS[groupId] || MENUS[1]);

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="brand">EDM</div>
      <nav>
        {links.map(([to, label, realTo, isLocked]) => (
          <NavLink
            key={to}
            to={realTo || to}
            onClick={onClose}
            className={({ isActive }) => `${isActive ? 'active' : ''}${isLocked ? ' locked-link' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
