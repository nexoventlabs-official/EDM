import { filterVoters, getVoter, voterExportCursor, updateVoterMobile } from '../models/voterModel.js';
import { findById } from '../models/userModel.js';
import { ROLES } from '../constants/roles.js';

// Determines the voter-data scope for the logged-in user, mirroring
// VoterController@VoterListFilter role handling in the Laravel app:
//   1 SuperAdmin / 7 Telecaller / 10 DSA / 2 MP -> may pick any assembly
//   3 MLA   -> locked to their assembly
//   4/11 Booth -> locked to their assembly + booth
//   6 Ward  -> locked to their assembly + their list of booths
async function resolveScope(req) {
  const u = req.user || {};
  const g = Number(u.group_id || 0);
  if (g === ROLES.SUPER_ADMIN || g === ROLES.MP || g === ROLES.TELECALLER || g === ROLES.DSA || !g) {
    return { forced: false, assemblyId: req.query.assemblyId || req.body?.assemblyId || '' };
  }
  let rec = null;
  if (u.sub && u.sub !== 'admin') { try { rec = await findById(u.sub); } catch { /* offline */ } }
  const assemblyId = rec?.assembly_id ?? u.assembly_id ?? '';
  if (g === ROLES.BOOTH || g === ROLES.BOOTH_ALT) {
    return { forced: true, assemblyId, boothId: rec?.booth_id ?? u.booth_id ?? '' };
  }
  if (g === ROLES.WARD) {
    return { forced: true, assemblyId, partNos: Array.isArray(rec?.booths) ? rec.booths : [] };
  }
  // MLA (3) and any other scoped role -> assembly only
  return { forced: true, assemblyId };
}

const EXPORT_FIELDS = ['EPIC_NO', 'PART_NO', 'VOTER_NAME_EN', 'VOTER_NAME', 'RELATION_NAME_EN', 'RELATION_NAME', 'MOBILE_NUMBER', 'AGE', 'GENDER', 'SECTION_NAME', 'BOOTH_NAME'];
const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Mirrors VoterController@VoterListFilter
export async function list(req, res) {
  const scope = await resolveScope(req);
  if (!scope.assemblyId) {
    return res.status(400).json({ success: false, message: scope.forced ? 'No assembly is assigned to your account.' : 'assemblyId is required.' });
  }
  try {
    const filters = {
      min_age: req.query.min_age, max_age: req.query.max_age,
      boothId: req.query.boothId, gender: req.query.gender,
      has_mobile: req.query.has_mobile, search_text: req.query.search_text,
    };
    // Enforce role scope (overrides anything the client sent).
    if (scope.boothId) filters.boothId = scope.boothId;
    if (scope.partNos) filters.partNos = scope.partNos;
    const result = await filterVoters(
      scope.assemblyId,
      filters,
      { page: Number(req.query.page || 1), pageSize: Number(req.query.pageSize || 25) }
    );
    res.json({ success: true, scope: { assemblyId: scope.assemblyId, boothId: scope.boothId ?? null, forced: scope.forced }, ...result });
  } catch (e) {
    if (e.message === 'VOTER_DB_OFFLINE') {
      return res.status(503).json({ success: false, message: 'Voter database is currently unavailable.' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
}

// Mirrors VoterController export — stream filtered voters as CSV.
export async function exportCsv(req, res) {
  const scope = await resolveScope(req);
  const assemblyId = scope.assemblyId;
  if (!assemblyId) return res.status(400).json({ success: false, message: scope.forced ? 'No assembly is assigned to your account.' : 'assemblyId is required.' });
  try {
    const filters = {
      min_age: req.query.min_age, max_age: req.query.max_age, boothId: req.query.boothId,
      gender: req.query.gender, has_mobile: req.query.has_mobile, search_text: req.query.search_text,
    };
    if (scope.boothId) filters.boothId = scope.boothId;
    if (scope.partNos) filters.partNos = scope.partNos;
    const cursor = voterExportCursor(assemblyId, filters, EXPORT_FIELDS);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="voters_ac_${assemblyId}.csv"`);
    res.write(EXPORT_FIELDS.join(',') + '\n');
    for await (const doc of cursor) {
      res.write(EXPORT_FIELDS.map((f) => csvCell(doc[f])).join(',') + '\n');
    }
    res.end();
  } catch (e) {
    if (res.headersSent) return res.end();
    if (e.message === 'VOTER_DB_OFFLINE') {
      return res.status(503).json({ success: false, message: 'Voter database is currently unavailable.' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
}

// Mirrors VoterController@updateMobile
export async function updateMobile(req, res) {
  const { assemblyId, id, mobile } = req.body || {};
  if (!assemblyId || !id) return res.status(400).json({ success: false, message: 'assemblyId and id are required.' });
  try {
    const ok = await updateVoterMobile(assemblyId, id, mobile);
    if (!ok) return res.status(404).json({ success: false, message: 'Voter not found.' });
    res.json({ success: true, message: 'Mobile number updated.' });
  } catch (e) {
    if (e.message === 'VOTER_DB_OFFLINE') {
      return res.status(503).json({ success: false, message: 'Voter database is currently unavailable.' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
}

// Mirrors VoterController@getVoter (viewvoterdetail)
export async function detail(req, res) {
  const { assemblyId, id } = req.query;
  if (!assemblyId || !id) return res.status(400).json({ success: false, message: 'assemblyId and id are required.' });
  try {
    const voter = await getVoter(assemblyId, id);
    if (!voter) return res.status(404).json({ success: false, message: 'Voter not found.' });
    res.json({ success: true, voter });
  } catch (e) {
    if (e.message === 'VOTER_DB_OFFLINE') {
      return res.status(503).json({ success: false, message: 'Voter database is currently unavailable.' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
}
