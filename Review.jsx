// REVIEW MODE — replay + templated PER + lessons tracker + plan-clause analysis

const { useState: rUseState, useEffect: rUseEffect, useMemo: rUseMemo } = React;

function Review() {
  const { scenario, events, state, realTime, scrubT, setScrubT } = useStore();
  const [playing, setPlaying] = rUseState(false);
  const [playSpeed, setPlaySpeed] = rUseState(4);
  const [tab, setTab] = rUseState('timeline');
  const duration = Math.max(realTime, scenario.phases[scenario.phases.length - 1].start + 600);
  const currentT = scrubT ?? realTime;

  rUseEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setScrubT(t => { const cur = t ?? 0; const next = cur + playSpeed; if (next >= duration) { setPlaying(false); return duration; } return next; }), 100);
    return () => clearInterval(id);
  }, [playing, playSpeed, duration]);

  if (state !== 'ended' && events.length === 0) return <div style={{ padding: 60, textAlign: 'center' }}><Mono color='var(--t3)' style={{ letterSpacing: '0.12em' }}>NO DATA TO REVIEW YET</Mono><p style={{ color: 'var(--t2)', fontSize: 13, marginTop: 12 }}>Run the exercise first, then return for replay + AAR.</p></div>;

  return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <header style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div><h1 style={{ fontSize: 18, margin: 0 }}>After-Action Review</h1><p style={{ fontSize: 11, color: 'var(--t3)', margin: '3px 0 0' }}>{events.length} events · {fmtT(realTime)} duration</p></div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, background: 'var(--elev)', padding: 3, borderRadius: 7, border: '1px solid var(--border)' }}>
        {[['timeline', 'Timeline replay'], ['aar', 'PER + lessons']].map(([id, lbl]) => <button key={id} onClick={() => setTab(id)} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', background: tab === id ? 'var(--accent)' : 'transparent', color: tab === id ? '#fff' : 'var(--t3)', borderRadius: 4 }}>{lbl}</button>)}
      </div>
    </header>

    {tab === 'timeline' && <TimelineReplay duration={duration} currentT={currentT} playing={playing} setPlaying={setPlaying} playSpeed={playSpeed} setPlaySpeed={setPlaySpeed} />}
    {tab === 'aar' && <AARReport />}
  </div>;
}

function TimelineReplay({ duration, currentT, playing, setPlaying, playSpeed, setPlaySpeed }) {
  const { scenario, events, setScrubT } = useStore();
  const shown = events.filter(e => e.t <= currentT).slice(-60).reverse();

  return <div style={{ flex: 1, display: 'grid', gridTemplateRows: '1fr auto', overflow: 'hidden' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden' }}>
      <div style={{ padding: 24, overflowY: 'auto' }}><ReplayBoard currentT={currentT} /></div>
      <aside style={{ borderLeft: '1px solid var(--border)', overflowY: 'auto', background: 'var(--surface)' }}><div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}><Mono>Event stream · T+{fmtT(currentT)}</Mono></div>{shown.map((e, i) => <EventRow key={i} e={e} scenario={scenario} />)}</aside>
    </div>
    <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}><Btn size='md' variant={playing ? 'danger' : 'primary'} onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play'}</Btn><div style={{ display: 'flex', gap: 3 }}>{[1, 4, 10, 30].map(s => <button key={s} onClick={() => setPlaySpeed(s)} style={{ padding: '4px 9px', border: '1px solid var(--border)', borderRadius: 4, background: playSpeed === s ? 'var(--accent)' : 'var(--elev)', color: playSpeed === s ? '#fff' : 'var(--t3)' }}>{s}×</button>)}</div><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20 }}>{fmtT(currentT)}</div><div style={{ flex: 1 }} /><Mono>{fmtT(duration)} total</Mono></div>
      <input type='range' min={0} max={duration} value={currentT} onChange={e => setScrubT(+e.target.value)} style={{ width: '100%' }} />
    </div>
  </div>;
}

function ReplayBoard({ currentT }) {
  const { scenario, events } = useStore();
  const snap = rUseMemo(() => {
    const sent = []; const actions = []; const artefacts = [];
    events.forEach(e => { if (e.t > currentT) return; if (e.type === 'SEND') sent.push(e); if (e.type === 'ACTION') actions.push(e); if (e.type === 'ARTEFACT') artefacts.push(e); });
    return { sent, actions, artefacts };
  }, [events, currentT]);

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <Section label='State at this moment'><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}><Card><Mono>Injects fired</Mono><div style={{ fontSize: 24, fontWeight: 700 }}>{snap.sent.length}</div></Card><Card><Mono>Action logs</Mono><div style={{ fontSize: 24, fontWeight: 700 }}>{snap.actions.length}</div></Card><Card><Mono>Artefacts</Mono><div style={{ fontSize: 24, fontWeight: 700 }}>{snap.artefacts.length}</div></Card></div></Section>
    <Section label='Plan clauses stressed'><div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{snap.sent.slice(-8).map((s, i) => { const inj = scenario.injects.find(x => x.id === s.injectId); return <Card key={i}><Mono color='var(--accent)'>#{inj.ord}</Mono> {inj.title}<div style={{ marginTop: 4, fontSize: 12, color: 'var(--t2)' }}>{(inj.planRefs || []).join(', ') || 'No linkage'}</div></Card>; })}</div></Section>
  </div>;
}

function EventRow({ e, scenario }) {
  const label = e.type;
  const text = e.type === 'SEND' ? scenario.injects.find(i => i.id === e.injectId)?.title : e.type === 'ACTION' ? e.text : e.type === 'ARTEFACT' ? `${e.kind}: ${e.title}` : e.text || e.rating || JSON.stringify(e);
  return <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12 }}><Mono>T+{fmtMMSS(e.t)}</Mono> <Mono color='var(--accent)'>{label}</Mono><div style={{ marginTop: 2 }}>{text}</div></div>;
}

function AARReport() {
  const { scenario, events, derived, realTime, exportEventsJSON, exportMELCSV } = useStore();
  const [template, setTemplate] = rUseState('WHO SimEx');
  const [narrative, setNarrative] = rUseState('');
  const stats = rUseMemo(() => {
    const totalSent = events.filter(e => e.type === 'SEND').length;
    const totalActions = events.filter(e => e.type === 'ACTION').length;
    const totalArtefacts = events.filter(e => e.type === 'ARTEFACT').length;
    return { totalSent, totalActions, totalArtefacts };
  }, [events]);

  const generate = async () => {
    const summary = `${scenario.name}. Duration ${fmtT(realTime)}. ${stats.totalSent} injects, ${stats.totalActions} action logs, ${stats.totalArtefacts} artefacts. Key notes: ${derived.notes.slice(-3).map(n => n.text).join(' | ') || 'none'}.`;
    setNarrative(await window.claude.complete(`Draft a concise post-exercise report narrative in ${template} tone using: ${summary}`));
  };

  const downloadText = (filename, text, mime = 'text/plain;charset=utf-8') => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clauseRows = scenario.injects.map(i => ({
    inj: i,
    stressed: events.some(e => e.type === 'SEND' && e.injectId === i.id),
    evidenced: events.some(e => (e.type === 'ACTION' || e.type === 'ARTEFACT') && e.injectId === i.id),
  }));

  return <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}><div style={{ maxWidth: 900, margin: '0 auto' }}>
    <h1 style={{ marginTop: 0 }}>Templated Post Exercise Report</h1>
    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>{['WHO SimEx', 'NHS England', 'OCHA'].map(t => <button key={t} onClick={() => setTemplate(t)} style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, background: template === t ? 'var(--accent)' : 'var(--elev)', color: template === t ? '#fff' : 'var(--t2)' }}>{t}</button>)}<Btn size='sm' variant='quiet' onClick={generate}>Generate AI narrative</Btn></div>
    <Card><Mono color='var(--accent)'>{template} template preview (export stub)</Mono><div style={{ marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{narrative || 'Generate narrative to populate this section.'}</div></Card>

    <div style={{ height: 18 }} />
    <Section label='Lessons Identified → Lessons Learned tracker (single-exercise prototype)'>
      <Card><div style={{ fontSize: 13 }}>Recurring theme: <strong>Comms approval delay</strong></div><Mono>Seen in this exercise. In production, this aggregates across historical exercises.</Mono><div style={{ marginTop: 8 }}><Chip hue={65}>Action owner: Comms Lead</Chip> <Chip hue={25}>Due: 30 days</Chip> <Chip hue={145}>Status: Open</Chip></div></Card>
    </Section>

    <div style={{ height: 18 }} />
    <Section label='Plan clause failure analysis'>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{clauseRows.map((r, i) => <Card key={i}><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Mono color='var(--accent)'>#{r.inj.ord}</Mono><div style={{ flex: 1 }}>{r.inj.title}<div style={{ fontSize: 12, color: 'var(--t3)' }}>{(r.inj.planRefs || []).join(', ') || 'No plan linkage'}</div></div><Chip hue={r.stressed ? 25 : 260}>{r.stressed ? 'Stressed' : 'Not stressed'}</Chip><Chip hue={r.evidenced ? 145 : 65}>{r.evidenced ? 'Evidence captured' : 'Evidence gap'}</Chip></div></Card>)}</div>
    </Section>

    <div style={{ height: 18 }} />
    <Section label='Export structured data'>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Btn variant='primary' onClick={() => downloadText('simex-events.json', exportEventsJSON(), 'application/json;charset=utf-8')}>Download events JSON</Btn>
        <Btn variant='quiet' onClick={() => downloadText('simex-mel.csv', exportMELCSV(), 'text/csv;charset=utf-8')}>Download MEL CSV</Btn>
      </div>
    </Section>
  </div></div>;
}

Object.assign(window, { Review });
