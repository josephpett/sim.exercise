// DESIGN MODE — inline MEL editing + facilitator automation + scenario remix

const { useState: dUseState, useRef: dUseRef } = React;

function Design() {
  const { scenario, setScenario, scenarioLibrary, forkScenario } = useStore();
  const [selId, setSelId] = dUseState(null);
  const [tab, setTab] = dUseState('melt');
  const cellRefs = dUseRef({});

  const sel = scenario.injects.find(i => i.id === selId);
  const update = (id, patch) => setScenario(s => ({ ...s, injects: s.injects.map(i => i.id === id ? { ...i, ...patch } : i) }));
  const addInject = () => {
    const id = 'i' + Date.now().toString(36).slice(-4);
    const next = { id, ord: scenario.injects.length + 1, phase: 'p1', scheduledT: 0, type: 'scheduled', channel: 'email', planRefs: [], title: 'New inject', content: '', targets: [], caps: [], objs: [] };
    setScenario(s => ({ ...s, injects: [...s.injects, next] }));
    setSelId(id);
  };
  const del = (id) => setScenario(s => ({ ...s, injects: s.injects.filter(i => i.id !== id) }));

  const onPasteRow = (inj, field, text) => {
    if (!text.includes('\n') && !text.includes('\t')) return update(inj.id, { [field]: text });
    const rows = text.trim().split(/\r?\n/).map(r => r.split('\t'));
    const fields = ['scheduledT', 'title', 'phase', 'type', 'channel', 'planRefs'];
    setScenario(s => ({
      ...s,
      injects: s.injects.map((item, idx) => {
        const sourceIndex = s.injects.findIndex(x => x.id === inj.id);
        const row = rows[idx - sourceIndex];
        if (!row) return item;
        const patch = {};
        fields.forEach((f, i) => {
          if (row[i] == null) return;
          if (f === 'scheduledT') patch[f] = Number(row[i]) || 0;
          else if (f === 'planRefs') patch[f] = row[i].split(';').map(x => x.trim()).filter(Boolean);
          else patch[f] = row[i];
        });
        return { ...item, ...patch };
      })
    }));
  };

  const moveCell = (id, key) => {
    const [rid, col] = id.split(':');
    const rowIdx = scenario.injects.findIndex(i => i.id === rid);
    const cols = ['scheduledT', 'title', 'phase', 'type', 'channel', 'planRefs'];
    const colIdx = cols.indexOf(col);
    const dir = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[key];
    if (!dir) return;
    const nr = scenario.injects[rowIdx + dir[0]]?.id;
    const nc = cols[colIdx + dir[1]];
    if (!nr || !nc) return;
    const ref = cellRefs.current[`${nr}:${nc}`];
    if (ref) ref.focus();
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <aside style={{ width: 68, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 4, flexShrink: 0 }}>
        {[
          { id: 'melt', label: 'MEL', icon: '▦' },
          { id: 'rules', label: 'Auto', icon: '⇅' },
          { id: 'objectives', label: 'Goals', icon: '◎' },
          { id: 'library', label: 'Mix', icon: '⎇' },
        ].map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ width: 52, padding: '8px 0', border: 'none', background: tab === t.id ? 'var(--elev)' : 'transparent', color: tab === t.id ? 'var(--accent)' : 'var(--t3)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 18 }}>{t.icon}</span><span style={{ fontSize: 9, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700 }}>{t.label}</span></button>)}
      </aside>

      {tab === 'melt' && <MELDesign {...{ scenario, selId, setSelId, addInject, del, update, sel, onPasteRow, moveCell, cellRefs }} />}
      {tab === 'rules' && <RulesView scenario={scenario} />}
      {tab === 'objectives' && <ObjectivesView scenario={scenario} />}
      {tab === 'library' && <LibraryView scenario={scenario} scenarioLibrary={scenarioLibrary} forkScenario={forkScenario} />}
    </div>
  );
}

function MELDesign({ scenario, selId, setSelId, addInject, del, update, sel, onPasteRow, moveCell, cellRefs }) {
  const cols = [
    { key: 'scheduledT', label: 'T+ sec', parse: v => Number(v) || 0 },
    { key: 'title', label: 'Title', parse: v => v },
    { key: 'phase', label: 'Phase', parse: v => v },
    { key: 'type', label: 'Type', parse: v => v },
    { key: 'channel', label: 'Channel', parse: v => v },
    { key: 'planRefs', label: 'Plan/SOP', parse: v => v.split(';').map(x => x.trim()).filter(Boolean) },
  ];

  return <>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: sel ? '1px solid var(--border)' : 'none' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Master Events List (inline editable)</h1>
          <p style={{ fontSize: 12, color: 'var(--t3)', margin: '3px 0 0' }}>Arrow keys + Tab navigation · multi-cell paste from Excel supported.</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}><Btn variant='quiet' size='sm'>Import CSV</Btn><Btn variant='quiet' size='sm'>Export</Btn><Btn variant='primary' size='sm' onClick={addInject}>+ New inject</Btn></div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr><th style={thStyle}>#</th>{cols.map(c => <th key={c.key} style={thStyle}>{c.label}</th>)}<th style={thStyle}>Targets</th><th style={thStyle}></th></tr></thead>
          <tbody>
            {scenario.injects.map(inj => <tr key={inj.id} onClick={() => setSelId(inj.id)} style={{ background: selId === inj.id ? 'color-mix(in oklch, var(--accent) 8%, transparent)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
              <td style={tdStyle}><Mono>{String(inj.ord).padStart(2, '0')}</Mono></td>
              {cols.map(c => <td key={c.key} style={tdStyle}><input ref={el => cellRefs.current[`${inj.id}:${c.key}`] = el} value={c.key === 'planRefs' ? (inj.planRefs || []).join('; ') : inj[c.key] ?? ''} onChange={e => update(inj.id, { [c.key]: c.parse(e.target.value) })} onPaste={e => { e.preventDefault(); onPasteRow(inj, c.key, e.clipboardData.getData('text')); }} onKeyDown={e => moveCell(`${inj.id}:${c.key}`, e.key)} style={cellInput} /></td>)}
              <td style={tdStyle}>{inj.targets.map(tid => <TeamChip key={tid} team={scenario.teams.find(t => t.id === tid)} small />)}</td>
              <td style={tdStyle}><button onClick={e => { e.stopPropagation(); del(inj.id); }} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 14 }}>×</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
    {sel && <InjectEditor inj={sel} scenario={scenario} onUpdate={patch => update(sel.id, patch)} onClose={() => setSelId(null)} />}
  </>;
}

function InjectEditor({ inj, scenario, onUpdate, onClose }) {
  return <aside style={{ width: 420, background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
    <header style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}><Mono color='var(--accent)'>{String(inj.ord).padStart(2, '0')}</Mono><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)' }}>Inject editor</span><button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 20 }}>×</button></header>
    <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label='Title'><input value={inj.title} onChange={e => onUpdate({ title: e.target.value })} style={inputStyle} /></Field>
      <Field label='Stimulus channel'><select value={inj.channel || 'email'} onChange={e => onUpdate({ channel: e.target.value })} style={inputStyle}>{['email', 'news', 'dm', 'phone', 'alert'].map(t => <option key={t}>{t}</option>)}</select></Field>
      <Field label='Plan / SOP linkage'><input value={(inj.planRefs || []).join('; ')} onChange={e => onUpdate({ planRefs: e.target.value.split(';').map(x => x.trim()).filter(Boolean) })} placeholder='e.g. Mass Casualty Plan §4.2' style={inputStyle} /></Field>
      <Field label='Content'><textarea rows={9} value={inj.content} onChange={e => onUpdate({ content: e.target.value })} style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }} /></Field>
    </div>
  </aside>;
}

function RulesView({ scenario }) {
  const withRules = scenario.injects.filter(i => i.rule);
  return <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}><div style={{ maxWidth: 900, margin: '0 auto' }}>
    <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>MEL automation for facilitators</h1>
    <p style={{ fontSize: 13, color: 'var(--t3)', margin: '0 0 28px', maxWidth: 680 }}>Automation rules support facilitator-side branching so scenarios react to team behaviour. Participants only experience realistic stimulus flow, not game-like consequences.</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{withRules.map(inj => {
      const src = scenario.injects.find(i => i.id === inj.rule.onInject);
      return <div key={inj.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16 }}><Card><Mono>When</Mono><div style={{ fontSize: 13, marginTop: 6 }}>Inject <strong>#{src?.ord}</strong> is not logged by team <strong>{inj.rule.byTeam}</strong> within {inj.rule.thresholdMin} min.</div></Card><div style={{ color: 'var(--accent)' }}>→</div><Card style={{ borderColor: 'var(--accent)' }}><Mono color='var(--accent)'>Then trigger</Mono><div style={{ fontSize: 13, marginTop: 6 }}><strong>#{inj.ord}</strong> {inj.title}</div></Card></div>;
    })}</div>
  </div></div>;
}

function ObjectivesView({ scenario }) {
  return <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}><div style={{ maxWidth: 900, margin: '0 auto' }}><h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Exercise objectives</h1><p style={{ fontSize: 13, color: 'var(--t3)', margin: '0 0 28px' }}>{scenario.framework}</p>{scenario.objectives.map(o => <Card key={o.id} style={{ marginBottom: 8 }}><div style={{ display: 'flex', gap: 12 }}><Mono color='var(--accent)'>{o.code}</Mono><div>{o.text}</div></div></Card>)}</div></div>;
}

function LibraryView({ scenario, scenarioLibrary, forkScenario }) {
  return <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}><div style={{ maxWidth: 900, margin: '0 auto' }}><h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Scenario library / remix</h1><p style={{ fontSize: 13, color: 'var(--t3)', margin: '0 0 20px' }}>Provenance is tracked so teams can fork and adapt scenarios safely.</p><Btn variant='primary' onClick={forkScenario}>Fork current scenario</Btn><div style={{ height: 12 }} />{scenarioLibrary.map(s => <Card key={s.id} style={{ marginBottom: 8 }}><div style={{ fontWeight: 700 }}>{s.name}</div><div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{s.provenance}</div><div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>{s.type} · {s.framework}</div></Card>)}</div></div>;
}

const inputStyle = { width: '100%', boxSizing: 'border-box', background: 'var(--elev)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--t1)', fontFamily: 'inherit', fontSize: 13, padding: '7px 10px', outline: 'none' };
const thStyle = { position: 'sticky', top: 0, background: 'var(--bg)', padding: '10px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--t3)', borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '8px', verticalAlign: 'top' };
const cellInput = { width: '100%', background: 'var(--elev)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--t1)', padding: '5px 8px', fontSize: 12, outline: 'none' };
function Field({ label, children }) { return <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)' }}>{label}</span>{children}</label>; }

Object.assign(window, { Design });
