import bcrypt from 'bcryptjs';
import { signToken } from '../middleware/auth.js';
import { findByCredentials, nextUserId, existsByMobile, insertUser, blankUser, findWardMainAdmin, maxUserId } from '../models/userModel.js';
import { isAppDbOnline, getAppDb } from '../config/db.js';
import { ROLES, ROLE_NAME, roleHome } from '../constants/roles.js';

// Mirrors LoginController@submitLogin: match tbl_user by mobile_no + password_str,
// then route by user_group_id. Keeps an admin/admin bootstrap for first use.
export async function login(req, res) {
  const username = (req.body?.username ?? req.body?.email ?? '').toString().trim();
  const password = (req.body?.password ?? '').toString().trim();
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  // Bootstrap super admin (works even with no app DB / no users yet)
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const claims = { sub: 'admin', name: 'Super Admin', group_id: ROLES.SUPER_ADMIN };
    return res.json({
      success: true,
      token: signToken(claims),
      user: { name: 'Super Admin', group_id: ROLES.SUPER_ADMIN, role: 'Super Admin', home: roleHome(ROLES.SUPER_ADMIN) },
    });
  }

  if (!isAppDbOnline()) {
    return res.status(503).json({ success: false, message: 'App database unavailable. Use the admin bootstrap login or configure MONGO_APP_URL.' });
  }

  try {
    const user = await findByCredentials(username, password);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid login or password.' });
    if (Number(user.is_active ?? 1) !== 1 && Number(user.user_group_id) !== ROLES.MLA) {
      return res.status(403).json({ success: false, message: 'Your account is deactivated.' });
    }

    const groupId = Number(user.user_group_id || 0);
    // Booth (group 4) requires a booth_id, mirroring redirectByGroup.
    if (groupId === ROLES.BOOTH && !user.booth_id) {
      return res.status(403).json({ success: false, message: 'Must have at least one booth for login access.' });
    }

    const hasBooths = Array.isArray(user.booths) && user.booths.length > 0;
    const claims = {
      sub: String(user._id),
      name: user.first_name || user.mobile_no,
      group_id: groupId,
      assembly_id: user.assembly_id ?? null,
      booth_id: user.booth_id ?? null,
      ward_id: user.ward_id ?? null,
    };
    return res.json({
      success: true,
      token: signToken(claims),
      user: {
        name: claims.name,
        group_id: groupId,
        role: ROLE_NAME[groupId] || 'User',
        assembly_id: claims.assembly_id,
        booth_id: claims.booth_id,
        ward_id: claims.ward_id,
        has_booths: hasBooths,
        home: roleHome(groupId),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Login failed: ' + e.message });
  }
}

// Public candidate registration — mirrors the /register flow on the landing page.
// Creates a tbl_user (ward-scoped by default) and returns generated credentials.
export async function register(req, res) {
  const b = req.body || {};
  const fullName = (b.full_name || b.firstname || '').toString().trim();
  const mobile = (b.mobile || b.mobile_no || '').toString().replace(/\D/g, '');
  if (!fullName || !mobile) {
    return res.status(400).json({ success: false, message: 'Full name and mobile number are required.' });
  }
  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number.' });
  }
  if (!isAppDbOnline()) {
    return res.status(503).json({ success: false, message: 'Registration is temporarily unavailable. Please try again shortly.' });
  }
  try {
    const db = getAppDb();
    const passcode = String(Math.floor(100000 + Math.random() * 900000));
    const district = b.district || '';
    const bodyType = b.body_type || '';
    const position = b.position || '';
    const localBody = b.union_or_municipality || b.panchayat_or_corporation || '';
    const wardNoRaw = b.ward_number || b.ward_id || '';
    const cleanWard = String(wardNoRaw).replace(/[^0-9]/g, '') || String(wardNoRaw);

    // 1) Upsert enquiry record (feeds the admin Registrations page — mirrors tbl_enquiry).
    const enquiry = {
      full_name: fullName, firstname: fullName, mobile,
      district, role: b.role || '', affiliation: b.affiliation || '', party: b.party || '',
      body_type: bodyType, position,
      union_or_municipality: b.union_or_municipality || '',
      panchayat_or_corporation: b.panchayat_or_corporation || '',
      ward_number: cleanWard, passcode,
    };
    const existingEnq = await db.collection('tbl_enquiry').findOne({ mobile });
    if (existingEnq) await db.collection('tbl_enquiry').updateOne({ mobile }, { $set: enquiry });
    else await db.collection('tbl_enquiry').insertOne({ ...enquiry, created_at: new Date().toISOString() });

    // 2) Ward accounts (two-tier): one main-admin per combination + one user login per mobile.
    if (district && localBody && cleanWard) {
      const main = await findWardMainAdmin({ district_id: district, category_name: localBody, ward_id: cleanWard, candidate_type: bodyType, position });
      if (!main) {
        const cleanLocalBody = localBody.toLowerCase().replace(/[^a-z0-9]/g, '');
        const adminUsername = `${cleanLocalBody}_w${cleanWard}`;
        const id = (await maxUserId()) + 1;
        await db.collection('tbl_user').insertOne({
          ...blankUser(), id, user_group_id: ROLES.WARD,
          first_name: `${district} - ${localBody} - Ward ${cleanWard}`,
          mobile_no: adminUsername, password_str: String(Math.floor(100000 + Math.random() * 900000)),
          district_id: district, category_name: localBody, ward_id: cleanWard,
          candidate_type: bodyType, position, booths: [],
        });
      }

      const userExists = await db.collection('tbl_user').findOne({ mobile_no: mobile });
      if (!userExists) {
        const id = (await maxUserId()) + 1;
        await db.collection('tbl_user').insertOne({
          ...blankUser(), id, user_group_id: ROLES.WARD,
          first_name: fullName, mobile_no: mobile, password_str: passcode,
          district_id: district, category_name: localBody, ward_id: cleanWard,
          candidate_type: bodyType, position, is_user_login: true, booths: [],
        });
      } else {
        await db.collection('tbl_user').updateOne({ mobile_no: mobile }, { $set: {
          password_str: passcode, district_id: district, category_name: localBody,
          ward_id: cleanWard, candidate_type: bodyType, position, first_name: fullName,
        } });
      }
    }

    return res.json({ success: true, message: 'Registration successful!', username: mobile, passcode });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Registration failed: ' + e.message });
  }
}

export function me(req, res) {
  res.json({ success: true, user: { ...req.user, role: ROLE_NAME[req.user.group_id] || 'User', home: roleHome(req.user.group_id) } });
}
