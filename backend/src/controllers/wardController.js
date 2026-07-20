import { getVoterDb, getAppDb, isAppDbOnline } from '../config/db.js';
import { findById, findWardMainAdmin } from '../models/userModel.js';
import { getAssembly } from '../models/assemblyModel.js';
import { collectionForAc } from '../models/voterModel.js';
import { ROLES } from '../constants/roles.js';

// A per-mobile ward user login inherits its booths from the main-admin combination.
async function effectiveBooths(rec) {
  if (!rec) return [];
  if (rec.is_user_login) {
    try {
      const main = await findWardMainAdmin({ district_id: rec.district_id, category_name: rec.category_name, ward_id: rec.ward_id, candidate_type: rec.candidate_type, position: rec.position });
      return Array.isArray(main?.booths) ? main.booths : [];
    } catch { return []; }
  }
  return Array.isArray(rec.booths) ? rec.booths : [];
}

const SAMPLE_BOOTHS = 47;
const SAMPLE_VOTERS = 705;

// Resolve the ward user's own record (or, for a super admin previewing, none).
async function wardRecord(req) {
  const u = req.user || {};
  if (u.sub && u.sub !== 'admin') { try { return await findById(u.sub); } catch { /* offline */ } }
  return null;
}

function account(rec, u) {
  return {
    ward_login: rec?.first_name || u?.name || '-',
    body_type: rec?.candidate_type || '-',
    position: rec?.position || '-',
    district: rec?.district_id || '-',
    local_body: rec?.category_name || '-',
    ward_number: rec?.ward_id ?? '-',
    username: rec?.mobile_no || '-',
  };
}

// GET /ward/home — sample/preview mode when no booths assigned, else the
// assigned-booth list (mirrors admin/pages/wardlogins/dashboard).
export async function home(req, res) {
  const u = req.user || {};
  const rec = await wardRecord(req);
  const booths = await effectiveBooths(rec);

  if (!booths.length) {
    return res.json({
      success: true, isSample: true,
      account: account(rec, u),
      sample: { booths: SAMPLE_BOOTHS, voters: SAMPLE_VOTERS },
    });
  }

  // Assigned mode — per-booth voter counts from the assembly's voter roll.
  const assemblyNo = rec?.assembly_id;
  let assembly = null;
  try { assembly = await getAssembly(assemblyNo); } catch { /* app db offline */ }
  let rows = [];
  try {
    const db = getVoterDb();
    const coll = db.collection(collectionForAc(assemblyNo));
    const parts = booths.map((b) => parseInt(b, 10)).filter((n) => !Number.isNaN(n));
    const agg = await coll.aggregate([
      { $match: { PART_NO: { $in: parts } } },
      { $group: { _id: '$PART_NO', booth_name: { $first: '$BOOTH_NAME' }, voter_count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();
    rows = agg.map((r) => ({
      assembly_no: assemblyNo, assembly_name: assembly?.assembly_name || `Assembly ${assemblyNo}`,
      part_no: r._id, booth_name: r.booth_name || '', voter_count: r.voter_count,
    }));
  } catch { /* voter db offline -> empty rows */ }

  res.json({ success: true, isSample: false, account: account(rec, u), assembly_no: assemblyNo, booths: rows });
}

// Deterministic sample voter dataset for Preview Mode (705 records).
const FIRST = ['Arun', 'Priya', 'Karthik', 'Deepa', 'Suresh', 'Meena', 'Ravi', 'Lakshmi', 'Vijay', 'Kavya', 'Mohan', 'Divya', 'Ganesh', 'Anitha', 'Bala'];
const LAST = ['Kumar', 'Raj', 'Murugan', 'Devi', 'Selvam', 'Rani', 'Krishnan', 'Priya', 'Nathan', 'Bharathi'];
const REL = ['Father', 'Mother', 'Husband', 'Wife'];

function buildSampleVoters() {
  const rows = [];
  for (let i = 1; i <= SAMPLE_VOTERS; i++) {
    const g = i % 2 === 0 ? 'Female' : 'Male';
    const fn = FIRST[i % FIRST.length];
    const ln = LAST[(i * 3) % LAST.length];
    rows.push({
      _id: `sample_${i}`,
      EPIC_NO: `SMP${String(1000000 + i)}`,
      VOTER_NAME_EN: `${fn} ${ln}`,
      RELATION_NAME_EN: `${LAST[(i * 7) % LAST.length]}`,
      RELATION_TYPE: REL[i % REL.length],
      AGE: 18 + (i % 62),
      MOBILE_NUMBER: `9${String(100000000 + (i * 12345) % 899999999)}`,
      GENDER: g,
      PART_NO: 1 + (i % SAMPLE_BOOTHS),
      HOUSE_NO: String(1 + (i % 250)),
      VOTER_NAME: `${fn} ${ln}`,
    });
  }
  return rows;
}
const SAMPLE_CACHE = buildSampleVoters();

// Sample booth list (Preview Mode) — mirrors the 47 demo booths.
function sampleBoothList() {
  return Array.from({ length: SAMPLE_BOOTHS }, (_, i) => ({
    assembly_no: 0, assembly_name: 'Sample Assembly', part_no: i + 1, booth_name: `Sample Booth ${i + 1}`,
  }));
}

// Resolve the ward's booth list (assigned or sample) for the social-media form.
async function wardBooths(rec) {
  const booths = await effectiveBooths(rec);
  if (!booths.length) return { isSample: true, boothList: sampleBoothList() };
  const assemblyNo = rec?.assembly_id;
  let assembly = null;
  try { assembly = await getAssembly(assemblyNo); } catch { /* offline */ }
  let boothList = [];
  try {
    const db = getVoterDb();
    const coll = db.collection(collectionForAc(assemblyNo));
    const parts = booths.map((b) => parseInt(b, 10)).filter((n) => !Number.isNaN(n));
    const agg = await coll.aggregate([
      { $match: { PART_NO: { $in: parts } } },
      { $group: { _id: '$PART_NO', booth_name: { $first: '$BOOTH_NAME' } } },
      { $sort: { _id: 1 } },
    ]).toArray();
    boothList = agg.map((r) => ({ assembly_no: assemblyNo, assembly_name: assembly?.assembly_name || `Assembly ${assemblyNo}`, part_no: r._id, booth_name: r.booth_name || '' }));
  } catch { /* offline */ }
  return { isSample: false, boothList };
}

// GET /ward/social-media — booth list + which service requests already exist.
export async function socialMedia(req, res) {
  const rec = await wardRecord(req);
  const { isSample, boothList } = await wardBooths(rec);
  const existingRequests = {};
  if (isAppDbOnline() && rec?._id) {
    try {
      const reqs = await getAppDb().collection('tbl_social_request')
        .find({ ward_user_id: String(rec._id) }).project({ service_type: 1 }).toArray();
      for (const r of reqs) existingRequests[r.service_type] = true;
    } catch { /* ignore */ }
  }
  res.json({ success: true, isSample, boothList, existingRequests });
}

// GET /ward/social-media/booth-sections — section numbers for a booth.
export async function boothSections(req, res) {
  const { assembly_no, part_no, is_sample } = req.query;
  if (is_sample === '1' || is_sample === 1) {
    return res.json([1, 2, 3, 4]); // sample sections
  }
  try {
    const db = getVoterDb();
    const coll = db.collection(collectionForAc(assembly_no));
    const sections = await coll.distinct('SECTION_NO', { PART_NO: parseInt(part_no, 10) });
    res.json(sections.map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b));
  } catch { res.json([]); }
}

// POST /ward/social-media/request — store a broadcast service request for admin fulfilment.
export async function socialMediaRequest(req, res) {
  const rec = await wardRecord(req);
  const b = req.body || {};
  const type = b.service_type;
  if (!['sms', 'voice', 'whatsapp'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Invalid service type.' });
  }
  const allVoters = b.all_voters === '1' || b.all_voters === 1 || b.all_voters === true;
  if (!allVoters && !b.booth) return res.status(400).json({ success: false, message: 'Select a booth or choose All Voters.' });
  if (type === 'sms' && !(b.sms_message_content || '').trim()) return res.status(400).json({ success: false, message: 'SMS message is required.' });
  if (type === 'whatsapp' && !(b.whatsapp_message_content || '').trim()) return res.status(400).json({ success: false, message: 'WhatsApp message is required.' });
  if (!isAppDbOnline()) return res.status(503).json({ success: false, message: 'App database unavailable.' });
  try {
    const hasImg = !!b.has_image || ((type === 'whatsapp' || type === 'sms') && !!b.file_data_url);
    const hasAud = !!b.has_audio || (type === 'voice' && !!b.file_data_url);
    const doc = {
      ward_user_id: rec ? String(rec._id) : null,
      ward_username: rec?.mobile_no || null,
      candidate_mobile: String(rec?.mobile_no || '').replace(/\D/g, '') || null,
      service_type: type,
      all_voters: allVoters,
      booth: allVoters ? null : (b.booth || null),
      section_no: allVoters ? null : (b.section_no || null),
      language: b.language || null,
      message: type === 'sms' ? (b.sms_message_content || '') : type === 'whatsapp' ? (b.whatsapp_message_content || '') : '',
      has_image: hasImg,
      has_audio: hasAud,
      image_url: hasImg && b.file_data_url ? b.file_data_url : null,
      audio_url: hasAud && b.file_data_url ? b.file_data_url : null,
      media_urls: b.file_data_url ? [b.file_data_url] : [],
      file_name: b.file_name || null,
      status: 'Pending',
      created_at: new Date().toISOString(),
    };
    await getAppDb().collection('tbl_social_request').insertOne(doc);
    res.json({ success: true, message: 'Your request has been submitted successfully.' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /ward/sample-voters — paginated + searchable sample dataset for Preview Mode.
export function sampleVoters(req, res) {
  const search = (req.query.search || '').trim().toLowerCase();
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 10);
  let rows = SAMPLE_CACHE;
  if (search) {
    rows = rows.filter((r) =>
      r.EPIC_NO.toLowerCase().includes(search) ||
      r.VOTER_NAME_EN.toLowerCase().includes(search) ||
      String(r.MOBILE_NUMBER).includes(search));
  }
  const total = rows.length;
  const start = (Math.max(1, page) - 1) * pageSize;
  res.json({ success: true, total, page, pageSize, rows: rows.slice(start, start + pageSize) });
}
