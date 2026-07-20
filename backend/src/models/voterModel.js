import { getVoterDb } from '../config/db.js';
import { toObjectId } from '../utils/objectId.js';

export const collectionForAc = (acNo) => `ass_${parseInt(acNo, 10)}`;

const INT_FIELDS = ['ID', 'ASSEMBLY_NO', 'PART_NO', 'SECTION_NO', 'AGE'];

// Build the same filter the Laravel VoterListFilter builds, but index-friendly:
//   EPIC-like (letters+digits) -> exact/prefix on EPIC_NO (indexed)
//   digits only                -> prefix on MOBILE_NUMBER (indexed)
//   otherwise (name)           -> substring on name fields
function buildQuery({ min_age, max_age, boothId, partNos, gender, has_mobile, search_text }) {
  const q = {};
  if (min_age || max_age) {
    q.AGE = {};
    if (min_age) q.AGE.$gte = parseInt(min_age, 10);
    if (max_age) q.AGE.$lte = parseInt(max_age, 10);
  }
  // Ward scope: restrict to a set of booths (PART_NO in [...]). Empty set -> no rows.
  if (Array.isArray(partNos)) {
    q.PART_NO = { $in: partNos.map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n)) };
  } else if (boothId) {
    q.PART_NO = parseInt(boothId, 10);
  }
  if (gender) q.GENDER = gender;
  if (has_mobile === '1' || has_mobile === 1 || has_mobile === true) {
    q.MOBILE_NUMBER = { $nin: ['', null] };
  }

  const term = (search_text || '').trim();
  if (term) {
    const hasLetter = /[A-Za-z]/.test(term);
    const hasDigit = /[0-9]/.test(term);
    const hasSpace = /\s/.test(term);
    if (hasLetter && hasDigit && !hasSpace) {
      const epic = term.toUpperCase();
      q.EPIC_NO = /^[A-Z]{1,4}[0-9]{5,9}$/.test(epic) ? epic : { $regex: '^' + epic };
    } else if (hasDigit && !hasLetter && !hasSpace) {
      q.MOBILE_NUMBER = { $regex: '^' + term };
    } else {
      q.$or = [
        { VOTER_NAME_EN: { $regex: term, $options: 'i' } },
        { VOTER_NAME: { $regex: term } },
        { RELATION_NAME_EN: { $regex: term, $options: 'i' } },
      ];
    }
  }
  return q;
}

export async function filterVoters(assemblyId, filters, { page = 1, pageSize = 25 } = {}) {
  const db = getVoterDb();
  const coll = db.collection(collectionForAc(assemblyId));
  const query = buildQuery(filters);
  const skip = (Math.max(1, page) - 1) * pageSize;

  const [rows, total] = await Promise.all([
    coll.find(query).sort({ MOBILE_NUMBER: -1 }).skip(skip).limit(pageSize).toArray(),
    coll.countDocuments(query),
  ]);
  return { rows, total, page: Number(page), pageSize };
}

// Gender counts for one booth (PART_NO) within an assembly — for booth/ward dashboards.
export async function genderCountsForParts(assemblyId, partNos) {
  const db = getVoterDb();
  const coll = db.collection(collectionForAc(assemblyId));
  const match = {};
  if (Array.isArray(partNos) && partNos.length) {
    match.PART_NO = { $in: partNos.map((p) => parseInt(p, 10)).filter((n) => !Number.isNaN(n)) };
  }
  const agg = await coll.aggregate([
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $group: { _id: '$GENDER', c: { $sum: 1 } } },
  ]).toArray();
  let total = 0, male = 0, female = 0;
  for (const g of agg) {
    total += g.c;
    if (g._id === 'Male') male = g.c;
    else if (g._id === 'Female') female = g.c;
  }
  return { total, male, female, other: total - male - female };
}

// Assembly analytics — gender + age-group counts and per-booth coordinates,
// mirroring ReportController@assemblyDetails / analyticsData in the Laravel app.
export async function assemblyAnalytics(assemblyId, booth = null) {
  const db = getVoterDb();
  const coll = db.collection(collectionForAc(assemblyId));

  // Booth-scoped view (booth-wise login) restricts everything to one PART_NO.
  const partNo = booth != null && booth !== '' ? parseInt(booth, 10) : null;
  const match = partNo != null && !Number.isNaN(partNo) ? [{ $match: { PART_NO: partNo } }] : [];

  const [countsAgg, boothsAgg] = await Promise.all([
    coll.aggregate([
      ...match,
      { $group: {
          _id: null,
          total: { $sum: 1 },
          male: { $sum: { $cond: [{ $eq: ['$GENDER', 'Male'] }, 1, 0] } },
          female: { $sum: { $cond: [{ $eq: ['$GENDER', 'Female'] }, 1, 0] } },
          youth: { $sum: { $cond: [{ $and: [{ $gte: ['$AGE', 18] }, { $lte: ['$AGE', 35] }] }, 1, 0] } },
          middle: { $sum: { $cond: [{ $and: [{ $gte: ['$AGE', 36] }, { $lte: ['$AGE', 59] }] }, 1, 0] } },
          senior: { $sum: { $cond: [{ $gte: ['$AGE', 60] }, 1, 0] } },
      } },
    ]).toArray(),
    coll.aggregate([
      ...match,
      { $group: {
          _id: '$PART_NO',
          booth_name: { $first: '$BOOTH_NAME' },
          latitude: { $first: '$LATITUDE' },
          longitude: { $first: '$LONGITUDE' },
      } },
      { $sort: { _id: 1 } },
    ]).toArray(),
  ]);

  const c = countsAgg[0] || { total: 0, male: 0, female: 0, youth: 0, middle: 0, senior: 0 };
  const other = c.total - c.male - c.female;
  const booths = boothsAgg
    .filter((b) => b._id !== null && b._id !== '')
    .map((b) => ({
      part_no: parseInt(b._id, 10),
      booth_name: b.booth_name || '',
      lat: b.latitude != null && b.latitude !== '' ? parseFloat(b.latitude) : null,
      lng: b.longitude != null && b.longitude !== '' ? parseFloat(b.longitude) : null,
    }));

  return {
    total: c.total, male: c.male, female: c.female, other,
    youth: c.youth, middle: c.middle, senior: c.senior,
    booths,
  };
}

// Returns a streaming cursor of all voters matching the filter (for CSV export).
export function voterExportCursor(assemblyId, filters, fields) {
  const db = getVoterDb();
  const coll = db.collection(collectionForAc(assemblyId));
  const projection = fields ? Object.fromEntries(fields.map((f) => [f, 1])) : undefined;
  return coll.find(buildQuery(filters), projection ? { projection } : {}).sort({ PART_NO: 1 });
}

// Mirrors VoterController@updateMobile — set MOBILE_NUMBER on one voter.
export async function updateVoterMobile(assemblyId, id, mobile) {
  const db = getVoterDb();
  const coll = db.collection(collectionForAc(assemblyId));
  const oid = toObjectId(id);
  const filter = oid ? { _id: oid } : { EPIC_NO: String(id).toUpperCase() };
  const clean = String(mobile ?? '').trim();
  const res = await coll.updateOne(filter, { $set: { MOBILE_NUMBER: clean } });
  return res.matchedCount > 0;
}

export async function getVoter(assemblyId, id) {
  const db = getVoterDb();
  const coll = db.collection(collectionForAc(assemblyId));
  const oid = toObjectId(id);
  const doc = (oid && (await coll.findOne({ _id: oid }))) || (await coll.findOne({ EPIC_NO: String(id).toUpperCase() }));
  return doc;
}

// Global EPIC search across all ass_* collections (mirrors DashboardController@searchEpic).
export async function searchEpic(epic) {
  const db = getVoterDb();
  const target = String(epic || '').trim().toUpperCase();
  if (!target) return null;
  const names = (await db.listCollections().toArray())
    .map((c) => c.name)
    .filter((n) => /^ass_\d+$/.test(n))
    .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));

  const start = Date.now();
  for (const name of names) {
    const v = await db.collection(name).findOne({ EPIC_NO: target });
    if (v) return { voter: v, elapsed_ms: Date.now() - start };
  }
  return { voter: null, elapsed_ms: Date.now() - start };
}

export { INT_FIELDS };
