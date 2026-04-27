
// DESIGN MODE — MELT-first editing + rule builder + inject library view

const { useState: dUseState } = React;

function Design() {
  const { scenario, setScenario } = useStore();
  const [selId, setSelId] = dUseState(null);
  const [tab, setTab] = dUseState('melt'); // melt | rules | objectives

  const sel = scenario.injects.find(i => i.id === selId);
  const update = (id, patch) => setScenario(s => ({ ...s, injects: s.injects.map(i => i.id === id ? { ...i, ...patch } : i) }));
  const addInject = () => {
    const id = 'i' + Date.now().toString(36).slice(-3);
    const next = { id, ord: scenario.injects.length + 1, phase: 'p1', scheduledT: 0, type: 'scheduled', title: 'New inject', content: '', targets: [], caps: [], objs: [] };
    setScenario(s => ({ ...s, injects: [...s.injects, next] }));
    setSelId(id);
  };
  const del = (id) => {
    setScenario(s => ({ ...s, injects: s.injects.filter(i => i.id !== id) }));
    if (selId === id) setSelId(null);
  };

  const aiDraft = () => {
    if (!sel) return;
    update(sel.id, { content: sel.content + (sel.content ? '\n\n' : '') + '[AI-drafted continuation based on scenario context — edit freely.]' });
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* left tabs */}
      <aside style={{ width: 68, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 4, flexShrink: 0 }}>
        {[
          { id: 'melt', label: 'MEL', icon: '▦' },
          { id: 'rules', label: 'Logic', icon: '⇅' },
          { id: 'objectives', label: 'Goals', icon: '◎' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            width: 52, padding: '8px 0', border: 'none', background: tab === t.id ? 'var(--elev)' : 'transparent',
            color: tab === t.id ? 'var(--accent)' : 'var(--t3)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700 }}>{t.label}</span>
          </button>
        ))}
      </aside>

      {tab === 'melt' && <MELDesign scenario={scenario} selId={selId} setSelId={setSelId} addInject={addInject} del={del} update={update} sel={sel} aiDraft={aiDraft} />}
      {tab === 'rules' && <RulesView scenario={scenario} />}
      {tab === 'objectives' && <ObjectivesView scenario={scenario} />}
    </div>
  );
}

function MELDesign({ scenario, selId, setSelId, addInject, del, update, sel, aiDraft }) {
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: sel ? '1px solid var(--border)' : 'none' }}>
        <header style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Master Events List</h1>
            <p style={{ fontSize: 12, color: 'var(--t3)', margin: '3px 0 0' }}>{scenario.injects.length} injects · {scenario.phases.length} phases · Single source of truth</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Btn variant="quiet" size="sm">Import CSV</Btn>
            <Btn variant="quiet" size="sm">Export</Btn>
            <Btn variant="primary" size="sm" onClick={addInject}>+ New inject</Btn>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['#', 'Scheduled', 'Title', 'Phase', 'Type', 'Targets', 'Capabilities', 'Objectives', ''].map(h => (
                  <th key={h} style={{ position: 'sticky', top: 0, background: 'var(--bg)', padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--t3)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenario.injects.map(inj => {
                const ph = scenario.phases.find(p => p.id === inj.phase);
                const active = selId === inj.id;
                return (
                  <tr key={inj.id} onClick={() => setSelId(inj.id)} style={{ cursor: 'pointer', background: active ? 'color-mix(in oklch, var(--accent) 8%, transparent)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}><Mono>{String(inj.ord).padStart(2, '0')}</Mono></td>
                    <td style={{ padding: '10px 14px' }}><Mono color="var(--t2)">T+{fmtMMSS(inj.scheduledT)}</Mono></td>
                    <td style={{ padding: '10px 14px', maxWidth: 280 }}>
                      <div style={{ fontWeight: 600, color: 'var(--t1)' }}>{inj.title}</div>
                      {inj.rule && <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>⇅ {inj.rule.trigger === 'ack' ? `Fires 5m after ${inj.rule.onInject} ack'd by ${inj.rule.byTeam}` : `Fires if ${inj.rule.onInject} not ack'd by ${inj.rule.byTeam} within ${inj.rule.thresholdMin}m`}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>{ph && <Chip hue={ph.hue} small>{ph.name}</Chip>}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <Chip small hue={inj.type === 'immediate' ? 25 : inj.type === 'conditional' ? 65 : 195}>{inj.type}</Chip>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {inj.targets.map(tid => { const t = scenario.teams.find(t => t.id === tid); return t ? <TeamChip key={tid} team={t} small /> : null; })}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {inj.caps.map(c => <span key={c} style={{ fontSize: 10, color: 'var(--t3)', background: 'var(--elev)', padding: '1px 6px', borderRadius: 3, border: '1px solid var(--border)' }}>{c}</span>)}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {inj.objs.map(oid => { const o = scenario.objectives.find(o => o.id === oid); return o ? <Mono key={oid} color="var(--accent)">{o.code}</Mono> : null; })}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={e => { e.stopPropagation(); del(inj.id); }} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 14 }}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Phase separators visualisation */}
          <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>Timeline</div>
            <TimelineRuler scenario={scenario} />
          </div>
        </div>
      </div>

      {sel && <InjectEditor inj={sel} scenario={scenario} onUpdate={patch => update(sel.id, patch)} onClose={() => setSelId(null)} aiDraft={aiDraft} />}
    </>
  );
}

function TimelineRuler({ scenario }) {
  const maxT = 4000;
  return (
    <div style={{ position: 'relative', height: 60, background: 'var(--elev)', border: '1px solid var(--border)', borderRadius: 6 }}>
      {/* phase bands */}
      {scenario.phases.map((p, i) => {
        const end = scenario.phases[i + 1]?.start ?? maxT;
        return <div key={p.id} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(p.start / maxT) * 100}%`, width: `${((end - p.start) / maxT) * 100}%`, background: `color-mix(in oklch, ${hueColor(p.hue)} 10%, transparent)`, borderRight: '1px dashed var(--border)' }}>
          <div style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, fontWeight: 700, color: hueColor(p.hue), letterSpacing: '0.04em', textTransform: 'uppercase' }}>{p.name}</div>
        </div>;
      })}
      {/* inject marks */}
      {scenario.injects.map(inj => {
        const ph = scenario.phases.find(p => p.id === inj.phase);
        return <div key={inj.id} title={inj.title} style={{ position: 'absolute', top: '50%', left: `${(inj.scheduledT / maxT) * 100}%`, width: 8, height: 8, borderRadius: '50%', background: hueColor(ph.hue), transform: 'translate(-50%, 0)', cursor: 'pointer', boxShadow: '0 0 0 2px var(--surface)' }} />;
      })}
    </div>
  );
}

function InjectEditor({ inj, scenario, onUpdate, onClose, aiDraft }) {
  return (
    <aside style={{ width: 420, background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
      <header style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Mono color="var(--accent)">{String(inj.ord).padStart(2, '0')}</Mono>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)' }}>Inject editor</span>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 20 }}>×</button>
      </header>
      <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Title">
          <input value={inj.title} onChange={e => onUpdate({ title: e.target.value })} style={inputStyle} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Phase"><select value={inj.phase} onChange={e => onUpdate({ phase: e.target.value })} style={inputStyle}>{scenario.phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Type"><select value={inj.type} onChange={e => onUpdate({ type: e.target.value })} style={inputStyle}>{['scheduled', 'immediate', 'conditional'].map(t => <option key={t}>{t}</option>)}</select></Field>
        </div>
        <Field label="Scheduled T+ (seconds)"><input type="number" value={inj.scheduledT} onChange={e => onUpdate({ scheduledT: +e.target.value })} style={inputStyle} /></Field>
        <Field label="Target teams">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {scenario.teams.map(t => {
              const on = inj.targets.includes(t.id);
              return <button key={t.id} onClick={() => onUpdate({ targets: on ? inj.targets.filter(x => x !== t.id) : [...inj.targets, t.id] })} style={{ border: `1px solid ${on ? hueColor(t.hue) : 'var(--border)'}`, background: on ? `color-mix(in oklch, ${hueColor(t.hue)} 18%, transparent)` : 'var(--elev)', color: on ? hueColor(t.hue) : 'var(--t2)', borderRadius: 5, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t.name}</button>;
            })}
          </div>
        </Field>
        <Field label="Content"><textarea rows={10} value={inj.content} onChange={e => onUpdate({ content: e.target.value })} style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.6, resize: 'vertical' }} /></Field>
        <Btn size="sm" variant="quiet" onClick={aiDraft}>✦ Draft continuation with AI</Btn>
        <Field label="Capabilities">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {scenario.capabilities.map(c => { const on = inj.caps.includes(c); return <button key={c} onClick={() => onUpdate({ caps: on ? inj.caps.filter(x => x !== c) : [...inj.caps, c] })} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'color-mix(in oklch, var(--accent) 15%, transparent)' : 'transparent', color: on ? 'var(--accent)' : 'var(--t3)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: on ? 600 : 400 }}>{c}</button>; })}
          </div>
        </Field>
        <Field label="Objectives">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {scenario.objectives.map(o => { const on = inj.objs.includes(o.id); return <button key={o.id} onClick={() => onUpdate({ objs: on ? inj.objs.filter(x => x !== o.id) : [...inj.objs, o.id] })} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'color-mix(in oklch, var(--accent) 15%, transparent)' : 'transparent', color: on ? 'var(--accent)' : 'var(--t3)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: on ? 700 : 500 }}>{o.code}</button>; })}
          </div>
        </Field>

        {inj.rule && (
          <div style={{ background: 'var(--elev)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: 6 }}>⇅ Conditional rule</div>
            <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.6 }}>
              {inj.rule.trigger === 'ack'
                ? <>Fires <strong>{inj.rule.delayS}s</strong> after inject <Mono>{inj.rule.onInject}</Mono> is acknowledged by team <Mono>{inj.rule.byTeam}</Mono>.</>
                : <>Fires if inject <Mono>{inj.rule.onInject}</Mono> is not acknowledged by team <Mono>{inj.rule.byTeam}</Mono> within <strong>{inj.rule.thresholdMin} min</strong>.</>}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

const inputStyle = { width: '100%', boxSizing: 'border-box', background: 'var(--elev)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--t1)', fontFamily: 'inherit', fontSize: 13, padding: '7px 10px', outline: 'none' };

function Field({ label, children }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)' }}>{label}</span>
    {children}
  </label>;
}

function RulesView({ scenario }) {
  const withRules = scenario.injects.filter(i => i.rule);
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Scenario logic</h1>
        <p style={{ fontSize: 13, color: 'var(--t3)', margin: '0 0 28px', maxWidth: 600 }}>Conditional injects that fire based on participant behaviour — the branching engine that makes a scripted scenario respond to real decisions.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {withRules.map(inj => {
            const source = scenario.injects.find(i => i.id === inj.rule.onInject);
            const team = scenario.teams.find(t => t.id === inj.rule.byTeam);
            return (
              <div key={inj.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16 }}>
                <Card>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 4 }}>When</div>
                  <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.5 }}>
                    {inj.rule.trigger === 'ack' ? (
                      <>Inject <Mono color="var(--accent)">{source?.ord.toString().padStart(2, '0')}</Mono> <strong>{source?.title}</strong> is acknowledged by <TeamChip team={team} small />, wait <Mono>{inj.rule.delayS}s</Mono>.</>
                    ) : (
                      <>Inject <Mono color="var(--accent)">{source?.ord.toString().padStart(2, '0')}</Mono> <strong>{source?.title}</strong> is <span style={{ color: 'var(--red)', fontWeight: 600 }}>NOT</span> acknowledged by <TeamChip team={team} small /> within <Mono>{inj.rule.thresholdMin}m</Mono>.</>
                    )}
                  </div>
                </Card>
                <div style={{ fontSize: 18, color: 'var(--accent)' }}>→</div>
                <Card style={{ borderColor: 'var(--accent)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>Then trigger</div>
                  <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.5 }}>
                    <Mono color="var(--accent)">{inj.ord.toString().padStart(2, '0')}</Mono> <strong>{inj.title}</strong>
                  </div>
                </Card>
              </div>
            );
          })}
          <button style={{ padding: '18px', border: '1px dashed var(--border)', borderRadius: 10, background: 'transparent', color: 'var(--t3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>+ Add conditional rule</button>
        </div>
      </div>
    </div>
  );
}

function ObjectivesView({ scenario }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Exercise objectives</h1>
        <p style={{ fontSize: 13, color: 'var(--t3)', margin: '0 0 28px' }}>{scenario.framework}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {scenario.objectives.map(o => {
            const linked = scenario.injects.filter(i => i.objs.includes(o.id));
            return (
              <Card key={o.id}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <Mono color="var(--accent)" style={{ fontSize: 12, fontWeight: 700 }}>{o.code}</Mono>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{o.text}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {linked.map(inj => <span key={inj.id} style={{ fontSize: 10, background: 'var(--elev)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 3, color: 'var(--t2)' }}>#{String(inj.ord).padStart(2, '0')} {inj.title}</span>)}
                    </div>
                  </div>
                  <Mono>{linked.length} injects</Mono>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Design });
