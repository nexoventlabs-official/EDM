import React from 'react';

export default function VoterDetailModal({ voter, onClose }) {
  if (!voter) return null;

  const get = (keys, fallback = '-') => {
    for (const k of keys) {
      if (voter[k] !== undefined && voter[k] !== null && String(voter[k]).trim() !== '') {
        return String(voter[k]);
      }
    }
    return fallback;
  };

  const epic = get(['EPIC_NO', 'epic_no', 'voter_id'], '');
  const nameTa = get(['VOTER_NAME_TA', 'voter_name_ta', 'VOTER_NAME', 'voter_name'], '');
  const nameEn = get(['VOTER_NAME_EN', 'voter_name_en', 'name'], '');

  const cleanNameTa = (nameTa && nameTa !== nameEn) ? nameTa.replace(/\s*-\s*$/, '') : '';
  const titleText = `Voter Detail${cleanNameTa ? ` - (${cleanNameTa}${epic ? ` - ${epic}` : ''})` : epic ? ` - ${epic}` : ''}`;

  const twoColPairs = [
    [
      { label: 'Voter ID (EPIC)', value: get(['EPIC_NO', 'epic_no', 'voter_id']) },
      { label: 'Voter Name (English)', value: nameEn },
    ],
    [
      { label: 'Voter Name (Tamil)', value: cleanNameTa || get(['VOTER_NAME_TA', 'voter_name_ta', 'VOTER_NAME', 'voter_name']) },
      { label: 'Relation Type', value: get(['RELATION_TYPE', 'relation_type']) },
    ],
    [
      { label: 'Relation Name (English)', value: get(['RELATION_NAME_EN', 'relation_name_en']) },
      { label: 'Relation Name (Tamil)', value: get(['RELATION_NAME_TA', 'relation_name_ta', 'RELATION_NAME', 'relation_name']) },
    ],
    [
      { label: 'Mobile', value: get(['MOBILE_NUMBER', 'mobile_number', 'mobile']) },
      { label: 'Age', value: get(['AGE', 'age']) },
    ],
    [
      { label: 'Gender', value: get(['GENDER', 'gender']) },
      { label: 'House No', value: get(['HOUSE_NO', 'house_no']) },
    ],
    [
      { label: 'Assembly No', value: get(['ASSEMBLY_NO', 'ac_no', 'assembly_no']) },
      { label: 'Assembly Name', value: get(['AC_NAME', 'ac_name', 'assembly_name']) },
    ],
    [
      { label: 'Part No', value: get(['PART_NO', 'part_no']) },
      { label: 'Section No', value: get(['SECTION_NO', 'section_no']) },
    ],
  ];

  const fullWidthRows = [
    { label: 'Section Name', value: get(['SECTION_NAME', 'section_name', 'SECTION_NAME_EN', 'SECTION_NAME_TA'], '') },
    { label: 'Part Name', value: get(['PART_NAME', 'part_name', 'PART_NAME_EN', 'PART_NAME_TA'], '') },
    { label: 'Polling Station (English)', value: get(['BOOTH_NAME', 'booth_name', 'POLLING_STATION_NAME', 'polling_station', 'polling_station_name'], '') },
    { label: 'Polling Station (Tamil)', value: get(['BOOTH_NAME_TM', 'BOOTH_NAME_TA', 'booth_name_tm', 'booth_name_ta', 'POLLING_STATION_NAME_TM', 'POLLING_STATION_NAME_TA'], '') },
    { label: 'Polling Station Address', value: get(['POLLING_STATION_ADDRESS', 'polling_station_address', 'BOOTH_ADDRESS', 'booth_address'], '') },
    { label: 'Polling Station Address (Tamil)', value: get(['POLLING_STATION_ADDRESS_TM', 'POLLING_STATION_ADDRESS_TA', 'polling_station_address_tm', 'polling_station_address_ta', 'BOOTH_ADDRESS_TM', 'BOOTH_ADDRESS_TA'], '') },
  ].filter((r) => r.value !== '' && r.value !== '-');

  const bottomPair = [
    { label: 'District', value: get(['DISTRICT_NAME', 'district', 'district_name']) },
    { label: 'Pincode', value: get(['PINCODE', 'pincode', 'postal_code']) },
  ];

  const lblStyle = {
    background: '#ffffff',
    color: '#334155',
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    padding: '10px 14px',
    width: '22%',
    fontSize: '13px',
    verticalAlign: 'middle',
  };

  const valStyle = {
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: 600,
    border: '1px solid #e2e8f0',
    padding: '10px 14px',
    width: '28%',
    fontSize: '13.5px',
    verticalAlign: 'middle',
    wordBreak: 'break-word',
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 880, width: '94%', borderRadius: 12, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{titleText}</h2>
          <button className="modal-close" onClick={onClose} style={{ fontSize: 22, color: '#64748b', cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
        </div>

        {/* Body Grid Table */}
        <div style={{ padding: 20, maxHeight: '82vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <tbody>
              {/* 2-column paired rows */}
              {twoColPairs.map((pair, idx) => (
                <tr key={idx}>
                  <td style={lblStyle}>{pair[0].label}</td>
                  <td style={valStyle}>{pair[0].value}</td>
                  <td style={lblStyle}>{pair[1].label}</td>
                  <td style={valStyle}>{pair[1].value}</td>
                </tr>
              ))}

              {/* Full width rows (Section Name, Part Name, Polling Station EN & Tamil, etc.) */}
              {fullWidthRows.map((fw, idx) => (
                <tr key={`fw-${idx}`}>
                  <td style={lblStyle}>{fw.label}</td>
                  <td colSpan={3} style={{ ...valStyle, width: '78%' }}>{fw.value}</td>
                </tr>
              ))}

              {/* Bottom pair (District & Pincode) */}
              <tr>
                <td style={lblStyle}>{bottomPair[0].label}</td>
                <td style={valStyle}>{bottomPair[0].value}</td>
                <td style={lblStyle}>{bottomPair[1].label}</td>
                <td style={valStyle}>{bottomPair[1].value}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
