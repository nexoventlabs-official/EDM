import json

with open('booth_full.json') as f:
    data = json.load(f)

ASSEMBLY_LABEL = 'AC2 PONNERI'
ASSEMBLY_TITLE = 'Ponneri'
SOURCE_DATE = '08-05-2026'
OUR_CAND = 'DR.RAVI.M.S'
TOTAL_BOOTHS = len(data)
TOTAL_CANDIDATES = len(data[0]['votes'])

# Party affiliation — confirmed for top 3 (98%+ of votes) via cross-verified public 2026
# result sources matching our exact vote totals/margin (110,439 vs 54,671, margin 55,768).
# Remaining 10 candidates (combined ~2% of votes) are unconfirmed individually and
# labeled Independent/Other.
PARTY = {
    'DR.RAVI.M.S': 'TVK',
    'DURAI CHANDRASEKAR': 'INC',
    'BALARAMAN.P': 'AIADMK',
}
def party_for(cand):
    return PARTY.get(cand, 'Independent/Other')

def class_bg(cls):
    return {'Stronghold': '#1a5c38', 'Lost': '#c0392b', 'Battleground': '#b9650f'}[cls]

def signed(n):
    return f"{'+' if n > 0 else ''}{n}"

def generate_html(b):
    ranked = sorted(b['votes'].items(), key=lambda x: -x[1])
    max_votes = ranked[0][1]
    our_rank = [c for c, _ in ranked].index(OUR_CAND) + 1
    cls = b['class']

    female_pct = round(b['female'] / b['registered'] * 100, 2) if b['registered'] else 0
    youth_pct = round(b['youth'] / b['registered'] * 100, 2) if b['registered'] else 0
    mobile_pct = round(b['with_mobile'] / b['registered'] * 100, 2) if b['registered'] else 0

    def cand_row_html(cand, votes, i):
        pct = round(votes / b['total_valid'] * 100, 2) if b['total_valid'] else 0
        width_pct = round(votes / max_votes * 100, 2) if max_votes else 0
        is_ours = cand == OUR_CAND
        fill_color = '#c0392b' if is_ours else ('#1a5c38' if i == 0 else '#9aa5b1')
        label = party_for(cand)
        return f'''<div class="cand-row">
      <span class="cand-rank">#{i+1}</span>
      <span class="cand-name {'ours' if is_ours else ''}">{label}</span>
      <div class="cand-track"><div class="cand-fill" style="width:{width_pct}%;background:{fill_color}"></div></div>
      <span class="cand-votes">{votes} ({pct:.2f}%)</span>
    </div>'''

    breakdown_html = ''.join(cand_row_html(c, v, i) for i, (c, v) in enumerate(ranked[:8]))

    top4 = ranked[:4]
    others_sum = sum(v for _, v in ranked[4:])
    donut_data = json.dumps([{'name': c, 'value': v} for c, v in top4] + [{'name': 'Others', 'value': others_sum}])

    diff = round(b['turnout_pct'] - b['avg_turnout_assembly'], 2)
    if abs(diff) > 5:
        turnout_extra = ('Unusually low turnout here — worth checking for access issues or voter apathy.'
                          if diff < 0 else
                          'Unusually high turnout here — strong mobilization, worth replicating elsewhere.')
    else:
        turnout_extra = 'Roughly in line with the rest of the constituency.'
    turnout_note = (f"This booth's turnout is <strong>{b['turnout_pct']:.2f}%</strong>, vs the assembly average of "
                     f"<strong>{b['avg_turnout_assembly']:.2f}%</strong> ({signed(diff)} points "
                     f"{'above' if diff >= 0 else 'below'} average). {turnout_extra}")

    if cls == 'Stronghold':
        note_html = (f"<strong>Maintain, low priority.</strong> Won by {b['margin_pct']:.2f}% margin "
                     f"(rank {b['rank']} of {TOTAL_BOOTHS}). Keep existing local contacts warm but this booth needs "
                     f"minimal incremental resourcing next cycle.")
    elif cls == 'Lost':
        note_html = (f"<strong>Needs root-cause investigation.</strong> Lost to {b['best_rival']} ({party_for(b['best_rival'])}) by "
                     f"{abs(b['margin'])} votes ({b['margin_pct']:.2f}%). Turnout was {b['turnout_pct']:.2f}% (not a "
                     f"participation problem) — the loss is about preference, not access. Investigate local "
                     f"leadership, rival's ground presence in {b['main_town'] or 'this area'}, and whether "
                     f"{mobile_pct:.2f}% mobile coverage limited digital outreach here.")
    else:
        need = abs(b['margin']) // 2 + 1
        note_html = (f"<strong>Highest-value booth for incremental effort.</strong> Margin is only "
                     f"{signed(b['margin'])} votes ({b['margin_pct']:.2f}%) — roughly {need} "
                     f"more votes would flip the result either direction. Prioritize this booth for "
                     f"door-to-door follow-up next cycle.")

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Booth {b['booth']} Report — {ASSEMBLY_TITLE}</title>
<script src="lib/echarts.min.js"></script>
<style>
  :root {{
    --ink:#0d0d0d; --paper:#f5f0e8; --accent:#c0392b; --muted:#6b6560; --rule:#d4cfc5;
    --high:#c0392b; --med:#e67e22; --low:#27ae60; --card-bg:#faf7f2; --stripe:#eee9df;
  }}
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family:'DM Sans',-apple-system,sans-serif; background:#ddd6c9; color:var(--ink); font-size:15px; line-height:1.6; }}
  .doc {{ max-width:980px; margin:30px auto; background:var(--paper); box-shadow:0 10px 40px rgba(0,0,0,0.15); }}
  .br-masthead {{ padding:40px 44px 32px; color:#fff; background:{class_bg(cls)}; position:relative; }}
  .br-masthead .label {{ font-family:'DM Mono',monospace; font-size:0.68rem; letter-spacing:0.18em; text-transform:uppercase; opacity:0.65; margin-bottom:12px; }}
  .br-masthead h1 {{ font-family:Georgia,serif; font-size:2.3rem; font-weight:900; line-height:1.15; margin-bottom:8px; }}
  .br-masthead .loc {{ font-size:0.95rem; opacity:0.8; max-width:600px; }}
  .br-class-badge {{ position:absolute; top:40px; right:60px; padding:9px 20px; border-radius:3px; font-family:'DM Mono',monospace; font-size:0.75rem; letter-spacing:0.1em; text-transform:uppercase; font-weight:700; background:rgba(255,255,255,0.18); color:#fff; border:1px solid rgba(255,255,255,0.4); }}
  .br-stat-bar {{ display:grid; grid-template-columns:repeat(6,1fr); background:var(--ink); color:#fff; }}
  .br-stat-item {{ padding:18px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.1); }}
  .br-stat-item:last-child {{ border-right:none; }}
  .br-stat-num {{ font-family:Georgia,serif; font-size:1.35rem; font-weight:700; display:block; }}
  .br-stat-lbl {{ font-size:0.6rem; text-transform:uppercase; letter-spacing:0.08em; opacity:0.6; margin-top:3px; display:block; }}
  .br-body {{ padding:40px 44px 16px; }}
  .br-section-heading {{ display:flex; align-items:center; gap:14px; margin:36px 0 18px; }}
  .br-section-heading:first-child {{ margin-top:0; }}
  .br-section-heading h3 {{ font-family:Georgia,serif; font-size:1.15rem; font-weight:700; }}
  .br-section-heading::after {{ content:''; flex:1; height:1px; background:var(--rule); }}
  .br-two-col {{ display:grid; grid-template-columns:1.3fr 1fr; gap:28px; align-items:center; }}
  .br-chart-sm {{ width:100%; height:260px; }}
  .cand-row {{ display:flex; align-items:center; gap:12px; padding:8px 0; }}
  .cand-rank {{ font-family:'DM Mono',monospace; font-size:0.72rem; color:var(--muted); min-width:20px; }}
  .cand-name {{ min-width:210px; font-size:0.86rem; font-weight:500; }}
  .cand-name.ours {{ color:var(--accent); font-weight:700; }}
  .cand-track {{ flex:1; height:14px; background:var(--stripe); border-radius:2px; overflow:hidden; }}
  .cand-fill {{ height:100%; border-radius:2px; }}
  .cand-votes {{ font-family:'DM Mono',monospace; font-size:0.8rem; min-width:90px; text-align:right; }}
  .br-demo-grid {{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }}
  .br-demo-card {{ background:var(--card-bg); border:1px solid var(--rule); padding:18px; text-align:center; }}
  .br-demo-num {{ font-family:Georgia,serif; font-size:1.5rem; font-weight:700; display:block; }}
  .br-demo-lbl {{ font-size:0.62rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted); margin-top:4px; display:block; }}
  .br-note {{ padding:20px 22px; border-left:4px solid; font-size:0.92rem; line-height:1.65; }}
  .br-note.stronghold {{ background:rgba(39,174,96,0.07); border-color:var(--low); }}
  .br-note.battleground {{ background:rgba(230,126,34,0.07); border-color:var(--med); }}
  .br-note.lost {{ background:rgba(192,57,43,0.07); border-color:var(--high); }}
  .br-footer {{ padding:20px 44px; background:var(--stripe); font-family:'DM Mono',monospace; font-size:0.66rem; color:var(--muted); display:flex; justify-content:space-between; }}
  @media print {{ body {{ background:#fff; }} .doc {{ box-shadow:none; margin:0; }} }}
</style>
</head>
<body>
<div class="doc">

  <div class="br-masthead">
    <div class="label">Booth Performance Report · Confidential · 2026 Election</div>
    <h1>Booth {b['booth']} — {b['main_town']}</h1>
    <div class="loc">{b['station_name']}</div>
    <span class="br-class-badge">{cls}</span>
  </div>

  <div class="br-stat-bar">
    <div class="br-stat-item"><span class="br-stat-num">{b['registered']:,}</span><span class="br-stat-lbl">Registered</span></div>
    <div class="br-stat-item"><span class="br-stat-num">{b['votes_polled']:,}</span><span class="br-stat-lbl">Votes Polled</span></div>
    <div class="br-stat-item"><span class="br-stat-num">{b['turnout_pct']:.2f}%</span><span class="br-stat-lbl">Turnout</span></div>
    <div class="br-stat-item"><span class="br-stat-num">{b['our_votes']}</span><span class="br-stat-lbl">Winner Votes</span></div>
    <div class="br-stat-item"><span class="br-stat-num">{signed(b['margin'])}</span><span class="br-stat-lbl">Margin</span></div>
    <div class="br-stat-item"><span class="br-stat-num">{b['rank']} / {TOTAL_BOOTHS}</span><span class="br-stat-lbl">Rank</span></div>
  </div>

  <div class="br-body">

    <div class="br-section-heading"><h3>§ 1 — Result Breakdown</h3></div>
    <div class="br-two-col">
      <div>{breakdown_html}</div>
      <div id="brDonut" class="br-chart-sm"></div>
    </div>

    <div class="br-section-heading"><h3>§ 2 — Turnout vs. Assembly Average</h3></div>
    <div class="br-two-col">
      <div id="brGauge" class="br-chart-sm"></div>
      <div style="font-size:0.92rem;color:var(--muted);">{turnout_note}</div>
    </div>

    <div class="br-section-heading"><h3>§ 3 — Who Lives Here</h3></div>
    <div class="br-demo-grid">
      <div class="br-demo-card"><span class="br-demo-num">{female_pct:.2f}%</span><span class="br-demo-lbl">Female</span></div>
      <div class="br-demo-card"><span class="br-demo-num">{b['avg_age']:.2f}</span><span class="br-demo-lbl">Avg Age</span></div>
      <div class="br-demo-card"><span class="br-demo-num">{youth_pct:.2f}%</span><span class="br-demo-lbl">Youth &lt;30</span></div>
      <div class="br-demo-card"><span class="br-demo-num">{mobile_pct:.2f}%</span><span class="br-demo-lbl">Mobile Coverage</span></div>
    </div>

    <div class="br-section-heading"><h3>§ 4 — Strategic Note</h3></div>
    <div class="br-note {cls.lower()}">{note_html}</div>

  </div>

  <div class="br-footer">
    <span>BOOTH {b['booth']} REPORT — {ASSEMBLY_LABEL} · Winning Candidate: {OUR_CAND} ({party_for(OUR_CAND)}) · Rank in this booth: {our_rank} of {TOTAL_CANDIDATES}</span>
    <span>Source: Form 20 Final Result Sheet ({SOURCE_DATE}) + Electoral Roll demographics · Party data confirmed for top 3 candidates only</span>
  </div>

</div>

<script>
(function() {{
  const donutData = {donut_data};
  const donutTotal = donutData.reduce((s,d) => s + d.value, 0);
  echarts.init(document.getElementById('brDonut'), null).setOption({{
    tooltip: {{ trigger:'item', formatter: p => `${{p.name}}: ${{p.value}} (${{(p.value/donutTotal*100).toFixed(2)}}%)` }},
    series: [{{
      type:'pie', radius:['42%','75%'],
      data: donutData,
      label: {{ fontSize:11, formatter: p => `${{p.name}}: ${{(p.value/donutTotal*100).toFixed(2)}}%` }}
    }}]
  }});
}})();

(function() {{
  const boothTurnout = {round(b['turnout_pct'], 2)};
  const avgTurnout = {round(b['avg_turnout_assembly'], 2)};
  const boothColor = boothTurnout >= avgTurnout ? '#1a5c38' : '#c0392b';
  echarts.init(document.getElementById('brGauge'), null).setOption({{
    grid: {{ left:110, right:60, top:20, bottom:20 }},
    xAxis: {{ type:'value', min:0, max:100, axisLabel:{{ formatter:'{{value}}%' }}, splitLine:{{ lineStyle:{{ color:'#eee9df' }} }} }},
    yAxis: {{ type:'category', data:['Assembly Avg','This Booth'], axisLabel:{{ fontSize:12, fontWeight:600 }} }},
    series: [{{
      type:'bar', barWidth:34,
      data: [
        {{ value: avgTurnout, itemStyle:{{ color:'#9aa5b1' }} }},
        {{ value: boothTurnout, itemStyle:{{ color: boothColor }} }}
      ],
      label: {{ show:true, position:'right', fontSize:13, fontWeight:700,
        formatter: p => `${{p.value.toFixed(2)}}%` }}
    }}]
  }});
}})();
</script>
</body>
</html>
'''

counts = {'Stronghold': 0, 'Battleground': 0, 'Lost': 0}
for b in data:
    html = generate_html(b)
    fname = f"Booth_{b['booth']}_Report.html"
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(html)
    counts[b['class']] += 1

print(f"Generated {len(data)} booth reports.")
print("Stronghold:", counts['Stronghold'], "Battleground:", counts['Battleground'], "Lost:", counts['Lost'])
