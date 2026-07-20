// Mirrors tbl_user_group / user_group_id from the Laravel app.
export const ROLES = {
  SUPER_ADMIN: 1,
  MP: 2,
  MLA: 3,        // assembly-wise login
  BOOTH: 4,      // booth-wise login
  WARD: 6,       // ward-wise login
  TELECALLER: 7,
  KING: 8,
  TELE: 9,
  DSA: 10,
  BOOTH_ALT: 11, // booth-type (booth_id optional)
};

export const ROLE_NAME = {
  1: 'Super Admin', 2: 'MP', 3: 'MLA / Assembly', 4: 'Booth Agent',
  6: 'Ward Agent', 7: 'Telecaller', 8: 'King', 9: 'Tele', 10: 'DSA', 11: 'Booth Agent',
};

// Front-end landing route per role (mirrors LoginController@redirectByGroup).
export function roleHome(groupId) {
  const map = {
    1: '/dashboard',
    2: '/mp/dashboard',
    3: '/assembly-details',
    4: '/booth/dashboard',
    11: '/booth/dashboard',
    6: '/ward/dashboard',
    7: '/telecaller/dashboard',
    8: '/king/users',
    9: '/tele/users',
    10: '/dsa/dashboard',
  };
  return map[Number(groupId)] || '/dashboard';
}
