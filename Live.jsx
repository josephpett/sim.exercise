// LIVE MODE — calm facilitator ops + keyboard-first + participant capture workflow

const { useState: lUseState, useEffect: lUseEffect } = React;

function Live() {
  const s = useStore();
  if (s.state === 'idle') return <PreflightView />;

  return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <LiveHeader />
    <div style={{ flex: 1, overflow: 'hidden' }}>
      {s.me.role === 'facilitator' && <FacilitatorOps />}
      {s.me.role === 'participant' && <ParticipantOps />}
      {s.me.role === 'observer' && <ObserverOps />}
    </div>
  </div>;
}

function PreflightView() {
  const { scenario, start, me, accessTokenPayload, clearSession } = useStore();
  return <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 32 }}>
    <div style={{ maxWidth: 720, textAlign: 'center' }}>
      <Mono color='var(--accent)'>PHASE 1 ACCESS SCAFFOLD</Mono>
      <h1 style={{ fontSize: 32, margin: '10px 0 8px' }}>{scenario.name}</h1>
      <p style={{ color: 'var(--t2)', marginBottom: 20 }}>{scenario.type} · {scenario.framework}</p>
      <Card style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>Access status: <strong>{me.access}</strong>{accessTokenPayload ? ` · ${accessTokenPayload.role}/${accessTokenPayload.teamId}/${accessTokenPayload.seat || 'eoc_lead'}` : ''}</div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>Use link params to preview role-specific access (prototype scaffold):</div>
        <Mono>...?role=facilitator</Mono><br />
        <Mono>...?role=participant&team=t2&seat=eoc_lead</Mono><br />
        <Mono>...?role=participant&team=t2&seat=deputy</Mono><br />
        <Mono>...?role=participant&team=t2&seat=liaison</Mono><br />
        <Mono>...?access=&lt;signed-token&gt;</Mono><br />
        <Mono>...?role=observer</Mono>
      </Card>
      <div style={{ height: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
        <Btn variant='primary' size='lg' onClick={start}>▶ Start exercise</Btn>
        <Btn variant='quiet' size='sm' onClick={clearSession}>Reset local session</Btn>
      </div>
    </div>
  </div>;
}

function LiveHeader() {
  const { scenario, state, time, speed, setSpeed, pause, resume, end, currentPhase, me } = useStore();
  return <header style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)' }}>
    <div><div style={{ fontWeight: 700 }}>{scenario.name}</div><div style={{ fontSize: 11, color: 'var(--t3)' }}>Role: {me.role} · Access: {me.access} · Phase: {currentPhase.name}</div></div>
    <div style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700 }}>{fmtT(time)}</div>
    <div style={{ display: 'flex', gap: 3 }}>{[1, 2, 5, 10].map(x => <button key={x} onClick={() => setSpeed(x)} style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid var(--border)', background: speed === x ? 'var(--accent)' : 'var(--elev)', color: speed === x ? '#fff' : 'var(--t3)' }}>{x}×</button>)}</div>
    {state === 'live' ? <Btn size='sm' variant='quiet' onClick={pause}>Pause</Btn> : <Btn size='sm' variant='primary' onClick={resume}>Resume</Btn>}
    <Btn size='sm' variant='danger' onClick={end}>End</Btn>
  </header>;
}

function FacilitatorOps() {
  const { scenario, time, state, derived, sendInject, pause, resume, addNote } = useStore();
  const [noteText, setNoteText] = lUseState('');
  const [trayOpen, setTrayOpen] = lUseState(false);
  const [focusTeam, setFocusTeam] = lUseState(null);
  const [paletteOpen, setPaletteOpen] = lUseState(false);
  const [paletteCmd, setPaletteCmd] = lUseState('');

  const pending = scenario.injects.filter(i => !derived.sent.some(s => s.id === i.id));
  const nextUp = pending.sort((a, b) => a.scheduledT - b.scheduledT)[0];

  lUseEffect(() => {
    const onKey = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === ' ') { e.preventDefault(); if (nextUp) sendInject(nextUp.id); }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); document.getElementById('fac-note-input')?.focus(); }
      if (e.key.toLowerCase() === 'p') { e.preventDefault(); state === 'live' ? pause() : resume(); }
      if (['1', '2', '3', '4'].includes(e.key)) setFocusTeam('t' + e.key);
      if (e.key === '/') { e.preventDefault(); setPaletteOpen(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextUp, state, pause, resume]);

  const teamStatus = scenario.teams.map(t => ({
    team: t,
    waiting: derived.sent.filter(s => scenario.injects.find(i => i.id === s.id)?.targets.includes(t.id)).length - derived.actions.filter(a => a.teamId === t.id).length,
  }));

  const runCommand = () => {
    const cmd = paletteCmd.trim().toLowerCase();
    if (!cmd) return;
    if (cmd === 'fire next' && nextUp) sendInject(nextUp.id);
    else if (cmd === 'pause') pause();
    else if (cmd === 'resume') resume();
    else if (cmd.startsWith('focus ')) setFocusTeam(cmd.replace('focus ', 't'));
    else if (cmd.startsWith('note ')) addNote('Facilitator', cmd.replace('note ', ''));
    setPaletteCmd('');
  };

  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', height: '100%' }}>
    <div style={{ padding: 20, overflowY: 'auto' }}>
      <Card style={{ borderColor: 'var(--accent)', padding: 22 }}>
        <Mono color='var(--accent)' style={{ fontWeight: 700 }}>NOW CARD</Mono>
        {nextUp ? <>
          <h2 style={{ margin: '8px 0 6px', fontSize: 26 }}>{nextUp.title}</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>{nextUp.targets.map(tid => <TeamChip key={tid} team={scenario.teams.find(t => t.id === tid)} />)}</div>
          <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 10 }}>Channel: <strong>{nextUp.channel || 'email'}</strong> · Plan refs: {(nextUp.planRefs || []).join(', ') || '—'}</div>
          <pre style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, whiteSpace: 'pre-wrap' }}>{nextUp.content}</pre>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}><Btn variant='primary' size='lg' onClick={() => sendInject(nextUp.id)}>Space · Fire next inject</Btn><Btn variant='quiet' onClick={() => setTrayOpen(v => !v)}>{trayOpen ? 'Hide' : 'Show'} recent activity</Btn></div>
        </> : <Empty>All injects fired.</Empty>}
      </Card>

      <div style={{ height: 16 }} />
      <Section label='Team attention (4-dot strip)' right={<Mono>1–4 to focus</Mono>}>
        <div style={{ display: 'flex', gap: 10 }}>{teamStatus.map((s, idx) => <div key={s.team.id} style={{ padding: '8px 10px', borderRadius: 999, border: `1px solid ${focusTeam === s.team.id ? hueColor(s.team.hue) : 'var(--border)'}`, background: focusTeam === s.team.id ? 'color-mix(in oklch, var(--accent) 8%, transparent)' : 'var(--surface)' }}><Dot color={s.waiting > 0 ? 'var(--amber)' : hueColor(s.team.hue)} /> <Mono>{idx + 1}. {s.team.name} {s.waiting > 0 ? `· ${s.waiting} waiting` : '· up to date'}</Mono></div>)}</div>
      </Section>

      {trayOpen && <><div style={{ height: 16 }} /><Section label='Recent activity tray' right={<Mono>collapsible</Mono>}><div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{derived.sent.slice(-6).reverse().map(s => <Card key={s.id + s.t} style={{ padding: 8 }}><Mono color='var(--accent)'>T+{fmtMMSS(s.t)}</Mono> {scenario.injects.find(i => i.id === s.id)?.title}</Card>)}</div></Section></>}
    </div>

    <aside style={{ borderLeft: '1px solid var(--border)', background: 'var(--surface)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Section label='Keyboard shortcuts'><Mono>Space fire · N note · P pause · 1–4 focus · / palette</Mono></Section>
      {paletteOpen && <Card><Mono color='var(--accent)'>Command palette</Mono><div style={{ marginTop: 8, fontSize: 12, color: 'var(--t3)' }}>Try: <Mono>fire next</Mono>, <Mono>pause</Mono>, <Mono>resume</Mono>, <Mono>focus 1</Mono>, <Mono>note ...</Mono></div><div style={{ display: 'flex', gap: 6, marginTop: 8 }}><input value={paletteCmd} onChange={e => setPaletteCmd(e.target.value)} onKeyDown={e => e.key === 'Enter' && runCommand()} placeholder='/' style={{ ...pText, margin: 0 }} /><Btn size='sm' variant='primary' onClick={runCommand}>Run</Btn></div></Card>}
      <textarea id='fac-note-input' value={noteText} onChange={e => setNoteText(e.target.value)} placeholder='N → capture facilitator note' style={{ width: '100%', minHeight: 90, background: 'var(--elev)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--t1)', padding: 8 }} />
      <Btn variant='primary' onClick={() => { if (noteText.trim()) { addNote('Facilitator', noteText.trim()); setNoteText(''); } }}>Log note</Btn>
      <Section label='Immutable log (mock)'><Mono>{derived.sent.length + derived.actions.length + derived.artefacts.length + derived.notes.length} signed events</Mono></Section>
    </aside>
  </div>;
}

function ParticipantOps() {
  const { scenario, me, derived, logAction, addArtefact, state } = useStore();
  const teamId = me.teamId || 't1';
  const [selectedId, setSelectedId] = lUseState(null);
  const [actionText, setActionText] = lUseState('');
  const [consulted, setConsulted] = lUseState('');
  const [artifactType, setArtifactType] = lUseState('SITREP');
  const [artifactBody, setArtifactBody] = lUseState('');

  const feed = derived.sent.filter(s => scenario.injects.find(i => i.id === s.id)?.targets.includes(teamId));
  const selected = scenario.injects.find(i => i.id === (selectedId || feed[feed.length - 1]?.id));
  const teamActions = derived.actions.filter(a => a.teamId === teamId).slice().reverse();
  const teamArtefacts = derived.artefacts.filter(a => a.teamId === teamId).slice().reverse();
  const seat = me.seat || 'eoc_lead';

  const renderStimulus = (inj) => {
    if (!inj) return <Empty>Waiting for first inject.</Empty>;
    const body = <div style={{ fontSize: 13, lineHeight: 1.65 }}>{inj.content}</div>;
    if (inj.channel === 'news') return <Card style={{ borderLeft: '4px solid var(--amber)' }}><Mono>NEWS TICKER</Mono>{body}</Card>;
    if (inj.channel === 'dm') return <Card style={{ borderLeft: '4px solid var(--accent)' }}><Mono>DIRECT MESSAGE</Mono>{body}</Card>;
    if (inj.channel === 'phone') return <Card style={{ borderLeft: '4px solid var(--green)' }}><Mono>PHONE TRANSCRIPT</Mono>{body}</Card>;
    if (inj.channel === 'alert') return <Card style={{ borderLeft: '4px solid var(--red)' }}><Mono>ALERT</Mono>{body}</Card>;
    return <Card><Mono>EMAIL</Mono>{body}</Card>;
  };

  if (state === 'ended') {
    return <div style={{ padding: 24, overflowY: 'auto' }}>
      <h2 style={{ marginTop: 0 }}>Personal debrief</h2>
      <p style={{ color: 'var(--t2)' }}>Your own decisions and outputs for self-reflection.</p>
      <Section label='Your action log'>{teamActions.length === 0 ? <Empty>No actions logged.</Empty> : teamActions.map((a, i) => <Card key={i} style={{ marginBottom: 8 }}><Mono color='var(--accent)'>T+{fmtMMSS(a.t)}</Mono><div style={{ marginTop: 4 }}>{a.text}</div>{a.consulted && <Mono>Consulted: {a.consulted}</Mono>}</Card>)}</Section>
      <div style={{ height: 12 }} />
      <Section label='Your artefacts'>{teamArtefacts.length === 0 ? <Empty>No artefacts created.</Empty> : teamArtefacts.map((a, i) => <Card key={i} style={{ marginBottom: 8 }}><Mono>{a.kind}</Mono><div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.body}</div></Card>)}</Section>
    </div>;
  }

  return <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', height: '100%' }}>
    <aside style={{ borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
      <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}><Mono color='var(--accent)'>Stimulus inbox</Mono></div>
      {feed.slice().reverse().map(s => {
        const inj = scenario.injects.find(i => i.id === s.id);
        return <div key={s.id + s.t} onClick={() => setSelectedId(s.id)} style={{ padding: 10, borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selected?.id === s.id ? 'color-mix(in oklch, var(--accent) 7%, transparent)' : 'transparent' }}><div style={{ fontWeight: 600 }}>{inj.title}</div><Mono>{inj.channel || 'email'} · T+{fmtMMSS(s.t)}</Mono></div>;
      })}
    </aside>

    <main style={{ padding: 20, overflowY: 'auto' }}>
      <RolePanel seat={seat} selected={selected} teamActions={teamActions} teamArtefacts={teamArtefacts} />
      <div style={{ height: 12 }} />
      {renderStimulus(selected)}
      <div style={{ height: 14 }} />
      <Section label='Log what you did (no scoring)'><textarea value={actionText} onChange={e => setActionText(e.target.value)} placeholder='What did your team decide/do?' style={pInput} /><input value={consulted} onChange={e => setConsulted(e.target.value)} placeholder='Optional: who was consulted?' style={pText} /><Btn variant='primary' onClick={() => { if (actionText.trim() && selected) { logAction(teamId, selected.id, me.name || 'Participant', actionText.trim(), consulted.trim()); setActionText(''); setConsulted(''); } }}>Save action log</Btn></Section>
      <div style={{ height: 14 }} />
      <Section label='Artefact templates'><div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>{['SITREP', 'Press line', 'Resource request', 'IHR notification'].map(t => <button key={t} onClick={() => setArtifactType(t)} style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, background: artifactType === t ? 'var(--accent)' : 'var(--elev)', color: artifactType === t ? '#fff' : 'var(--t2)' }}>{t}</button>)}</div><textarea value={artifactBody} onChange={e => setArtifactBody(e.target.value)} placeholder={`Draft ${artifactType}...`} style={pInput} /><Btn variant='quiet' onClick={() => { if (artifactBody.trim() && selected) { addArtefact(teamId, selected.id, artifactType, `${artifactType} @ T+`, artifactBody.trim(), me.name || 'Participant'); setArtifactBody(''); } }}>Save artefact</Btn></Section>
    </main>

    <aside style={{ borderLeft: '1px solid var(--border)', padding: 12, overflowY: 'auto', background: 'var(--surface)' }}>
      <Section label='Shared team log (common operating picture)'><div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{teamActions.length === 0 && <Empty>No actions yet</Empty>}{teamActions.map((a, i) => <Card key={i}><Mono color='var(--accent)'>T+{fmtMMSS(a.t)}</Mono><div style={{ marginTop: 4, fontSize: 12 }}>{a.text}</div>{a.consulted && <Mono>Consulted: {a.consulted}</Mono>}</Card>)}</div></Section>
      <div style={{ height: 12 }} />
      <Section label='Team artefacts'>{teamArtefacts.length === 0 && <Empty>No artefacts yet</Empty>}{teamArtefacts.map((a, i) => <Card key={i} style={{ marginBottom: 6 }}><Mono>{a.kind}</Mono><div style={{ fontSize: 12, marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.body}</div></Card>)}</Section>
    </aside>
  </div>;
}

function ObserverOps() {
  const { scenario, derived, setEval, addNote } = useStore();
  const [note, setNote] = lUseState('');
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', height: '100%' }}>
    <div style={{ padding: 20, overflowY: 'auto' }}>
      <Section label='Observer stream'>{derived.sent.slice().reverse().map(s => {
        const inj = scenario.injects.find(i => i.id === s.id);
        const actions = derived.actions.filter(a => a.injectId === s.id).length;
        return <Card key={s.id + s.t} style={{ marginBottom: 8 }}><Mono color='var(--accent)'>T+{fmtMMSS(s.t)}</Mono><div style={{ marginTop: 4, fontWeight: 600 }}>{inj.title}</div><Mono>{actions} team action logs captured</Mono><div style={{ marginTop: 6 }}>{['Not obs.', 'Partial', 'Achieved', 'Exceeded'].map(r => <button key={r} onClick={() => setEval(inj.id, r)} style={{ marginRight: 4, border: '1px solid var(--border)', background: 'var(--elev)', color: 'var(--t2)', borderRadius: 4, padding: '2px 6px' }}>{r}</button>)}</div></Card>;
      })}</Section>
    </div>
    <aside style={{ borderLeft: '1px solid var(--border)', padding: 14, background: 'var(--surface)' }}>
      <Section label='Observer notes to AAR'><textarea value={note} onChange={e => setNote(e.target.value)} style={pInput} /><Btn variant='primary' onClick={() => { if (note.trim()) { addNote('Observer', note.trim()); setNote(''); } }}>Save note</Btn></Section>
    </aside>
  </div>;
}

const pInput = { width: '100%', minHeight: 90, background: 'var(--elev)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--t1)', padding: 8, boxSizing: 'border-box' };
const pText = { width: '100%', background: 'var(--elev)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--t1)', padding: 8, boxSizing: 'border-box', margin: '8px 0' };

function RolePanel({ seat, selected, teamActions, teamArtefacts }) {
  if (seat === 'deputy') {
    return <Card><Mono color='var(--accent)'>Deputy view</Mono><div style={{ marginTop: 6, fontSize: 13 }}>Primary focus: drafting and packaging artefacts.</div><div style={{ marginTop: 6, fontSize: 12, color: 'var(--t3)' }}>Current artefacts: {teamArtefacts.length}. Prioritize SITREP quality before submission.</div></Card>;
  }
  if (seat === 'liaison') {
    return <Card><Mono color='var(--accent)'>Liaison view</Mono><div style={{ marginTop: 6, fontSize: 13 }}>Primary focus: external coordination and handoffs.</div><div style={{ marginTop: 6, fontSize: 12, color: 'var(--t3)' }}>Latest inject: {selected ? selected.title : 'none yet'}. Check cross-team dependencies before logging action.</div></Card>;
  }
  return <Card><Mono color='var(--accent)'>EOC Lead view</Mono><div style={{ marginTop: 6, fontSize: 13 }}>Primary focus: decisions and escalation posture.</div><div style={{ marginTop: 6, fontSize: 12, color: 'var(--t3)' }}>Decision entries logged: {teamActions.length}. Ensure major decisions include who was consulted.</div></Card>;
}

Object.assign(window, { Live });
