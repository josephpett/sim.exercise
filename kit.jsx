
// REVIEW MODE — event-log replay with scrubber, AAR generation

const { useState: rUseState, useEffect: rUseEffect, useMemo: rUseMemo } = React;

function Review() {
  const { scenario, events, state, realTime, scrubT, setScrubT, derived } = useStore();
  const [playing, setPlaying] = rUseState(false);
  const [playSpeed, setPlaySpeed] = rUseState(4);
  const [tab, setTab] = rUseState('timeline'); // timeline | aar

  const duration = Math.max(realTime, scenario.phases[scenario.phases.length - 1].start + 600);
  const currentT = scrubT ?? realTime;

  rUseEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setScrubT(t => {
      const cur = t ?? 0;
      const next = cur + playSpeed;
      if (next >= duration) { setPlaying(false); return duration; }
      return next;
    }), 100);
    return () => clearInterval(id);
  }, [playing, playSpeed, duration]);

  if (state !== 'ended' && events.length === 0) {
    return <div style={{ padding: 60, textAlign: 'center' }}>
      <Mono color="var(--t3)" style={{ letterSpacing: '0.12em' }}>NO DATA TO REVIEW YET</Mono>
      <p style={{ color: 'var(--t2)', fontSize: 13, marginTop: 12 }}>Start and run the exercise, then return here for replay and AAR.</p>
    </div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>After-Action Review</h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', margin: '3px 0 0' }}>{events.length} events captured · {fmtT(realTime)} exercise duration</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, background: 'var(--elev)', padding: 3, borderRadius: 7, border: '1px solid var(--border)' }}>
          {[['timeline', 'Timeline replay'], ['aar', 'AAR report']].map(([id, lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', background: tab === id ? 'var(--accent)' : 'transparent', color: tab === id ? '#fff' : 'var(--t3)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>{lbl}</button>
          ))}
        </div>
      </header>

      {tab === 'timeline' && <TimelineReplay duration={duration} currentT={currentT} playing={playing} setPlaying={setPlaying} playSpeed={playSpeed} setPlaySpeed={setPlaySpeed} />}
      {tab === 'aar' && <AARReport />}
    </div>
  );
}

function TimelineReplay({ duration, currentT, playing, setPlaying, playSpeed, setPlaySpeed }) {
  const { scenario, events, setScrubT, derived } = useStore();

  // Events up to currentT, reversed for recency
  const shownEvents = events.filter(e => e.t <= currentT).slice(-50).reverse();

  return (
    <div style={{ flex: 1, display: 'grid', gridTemplateRows: '1fr auto', overflow: 'hidden' }}>
      {/* Replay canvas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', overflow: 'hidden' }}>
        <div style={{ padding: 24, overflowY: 'auto' }}>
          <ReplayBoard currentT={currentT} />
        </div>
        <aside style={{ borderLeft: '1px solid var(--border)', background: 'var(--surface)', overflowY: 'auto' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
            <Mono style={{ letterSpacing: '0.08em' }}>EVENT STREAM · T+{fmtT(currentT)}</Mono>
          </div>
          <div>
            {shownEvents.map((e, i) => <EventRow key={events.length - i} e={e} scenario={scenario} />)}
          </div>
        </aside>
      </div>

      {/* Scrubber */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <Btn size="md" variant={playing ? 'danger' : 'primary'} onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pause' : '▶ Play'}</Btn>
          <div style={{ display: 'flex', gap: 3, background: 'var(--bg)', padding: 3, borderRadius: 6, border: '1px solid var(--border)' }}>
            {[1, 4, 10, 30].map(s => <button key={s} onClick={() => setPlaySpeed(s)} style={{ padding: '4px 9px', fontSize: 11, fontWeight: 600, background: playSpeed === s ? 'var(--accent)' : 'transparent', color: playSpeed === s ? '#fff' : 'var(--t3)', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>{s}×</button>)}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: 'var(--t1)' }}>{fmtT(currentT)}</div>
          <div style={{ flex: 1 }} />
          <Mono>{fmtT(duration)} total</Mono>
        </div>
        <Scrubber duration={duration} currentT={currentT} onScrub={setScrubT} />
      </div>
    </div>
  );
}

function Scrubber({ duration, currentT, onScrub }) {
  const { scenario, events } = useStore();
  // Event density marks
  return (
    <div style={{ position: 'relative', height: 56 }}>
      {/* Phase bands */}
      <div style={{ position: 'absolute', inset: '14px 0 34px', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
        {scenario.phases.map((p, i) => {
          const end = scenario.phases[i + 1]?.start ?? duration;
          return <div key={p.id} style={{ width: `${((end - p.start) / duration) * 100}%`, background: `color-mix(in oklch, ${hueColor(p.hue)} 20%, var(--elev))`, borderRight: '1px solid var(--bg)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, padding: '5px 8px', fontSize: 9, fontWeight: 700, color: hueColor(p.hue, 70), letterSpacing: '0.06em', textTransform: 'uppercase' }}>{p.name}</div>
          </div>;
        })}
      </div>

      {/* Event marks */}
      {events.map((e, i) => {
        const colors = { SEND: 'var(--accent)', ACK: 'var(--green)', CHAT: 'var(--t2)', NOTE: 'var(--amber)', EVAL: 'var(--accent)' };
        return <div key={i} style={{ position: 'absolute', left: `${(e.t / duration) * 100}%`, top: 14, width: 1.5, height: 8, background: colors[e.type] || 'var(--t3)', opacity: 0.6 }} />;
      })}

      {/* Playhead */}
      <div style={{ position: 'absolute', left: `${(currentT / duration) * 100}%`, top: 8, bottom: 24, width: 2, background: 'var(--red)', pointerEvents: 'none', boxShadow: '0 0 0 3px color-mix(in oklch, var(--red) 20%, transparent)' }} />

      {/* Slider */}
      <input type="range" min={0} max={duration} value={currentT} onChange={e => onScrub(+e.target.value)} style={{ position: 'absolute', inset: '14px 0 34px', width: '100%', opacity: 0, cursor: 'pointer', height: 'auto' }} />

      {/* Tick labels */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => <Mono key={f} style={{ fontSize: 9 }}>{fmtT(duration * f)}</Mono>)}
      </div>
    </div>
  );
}

function ReplayBoard({ currentT }) {
  const { scenario, events, derive } = useStore();
  const snapshot = rUseMemo(() => {
    // Rederive at currentT
    const sent = []; const acks = {}; const evals = {}; const dials = { epi: 20, ops: 15, comms: 25, public: 10 };
    for (const e of events) {
      if (e.t > currentT) break;
      if (e.type === 'SEND') sent.push({ id: e.injectId, t: e.t });
      else if (e.type === 'ACK') acks[e.injectId + '-' + e.teamId] = { t: e.t };
      else if (e.type === 'EVAL') evals[e.injectId] = e.rating;
      else if (e.type === 'DIAL') dials[e.key] = e.value;
    }
    return { sent, acks, evals, dials };
  }, [events, currentT]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Section label="Scenario state at this moment">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[['epi', 'Epi pressure', 25], ['ops', 'Ops load', 65], ['comms', 'Comms', 195], ['public', 'Public concern', 280]].map(([k, l, h]) => (
            <Card key={k} style={{ padding: 12 }}>
              <Mono>{l}</Mono>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: hueColor(h), marginTop: 4 }}>{snapshot.dials[k]}</div>
              <div style={{ height: 3, background: 'var(--elev)', borderRadius: 2, marginTop: 6 }}>
                <div style={{ height: '100%', width: `${snapshot.dials[k]}%`, background: hueColor(h), transition: 'width .2s' }} />
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section label="Injects fired by this point">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {snapshot.sent.slice().reverse().map(s => {
            const inj = scenario.injects.find(i => i.id === s.id);
            if (!inj) return null;
            const ackCount = inj.targets.filter(tid => snapshot.acks[s.id + '-' + tid]).length;
            return <div key={s.id + s.t} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7 }}>
              <Mono color="var(--accent)" style={{ minWidth: 54 }}>T+{fmtMMSS(s.t)}</Mono>
              <div style={{ fontSize: 12, color: 'var(--t1)', flex: 1 }}>{inj.title}</div>
              <Mono>{ackCount}/{inj.targets.length} ack</Mono>
              {snapshot.evals[inj.id] && <Chip small hue={snapshot.evals[inj.id] === 'Exceeded' ? 145 : snapshot.evals[inj.id] === 'Achieved' ? 150 : 55}>{snapshot.evals[inj.id]}</Chip>}
            </div>;
          })}
          {snapshot.sent.length === 0 && <Empty>No injects fired yet at T+{fmtT(currentT)}</Empty>}
        </div>
      </Section>
    </div>
  );
}

function EventRow({ e, scenario }) {
  const kinds = {
    SEND: { c: 'var(--accent)', label: 'SEND', render: p => { const inj = scenario.injects.find(i => i.id === p.injectId); return inj?.title || p.injectId; } },
    ACK:  { c: 'var(--green)',  label: 'ACK',  render: p => { const t = scenario.teams.find(t => t.id === p.teamId); return `${t?.name || p.teamId} · ${p.by || ''}`; } },
    EVAL: { c: 'var(--accent)', label: 'EVAL', render: p => p.rating },
    CHAT: { c: 'var(--t2)',     label: 'CHAT', render: p => `${p.sender}: ${p.text}` },
    NOTE: { c: 'var(--amber)',  label: 'NOTE', render: p => `${p.by}: ${p.text}` },
    DIAL: { c: 'var(--accent)', label: 'DIAL', render: p => `${p.key} = ${p.value}` },
    DECISION: { c: 'var(--red)', label: 'DECISION', render: p => p.text },
  };
  const k = kinds[e.type];
  if (!k) return null;
  return <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, fontSize: 12, alignItems: 'flex-start' }}>
    <Mono style={{ minWidth: 50, color: 'var(--t3)' }}>T+{fmtMMSS(e.t)}</Mono>
    <Mono color={k.c} style={{ minWidth: 44, fontWeight: 700 }}>{k.label}</Mono>
    <div style={{ flex: 1, color: 'var(--t1)', lineHeight: 1.5 }}>{k.render(e)}</div>
  </div>;
}

// ──────────────── AAR REPORT ────────────────

function AARReport() {
  const { scenario, events, derived, realTime } = useStore();
  const [generated, setGenerated] = rUseState(false);
  const [narrative, setNarrative] = rUseState('');

  const stats = rUseMemo(() => {
    const totalSent = events.filter(e => e.type === 'SEND').length;
    const totalAcks = events.filter(e => e.type === 'ACK').length;
    const expectedAcks = events.filter(e => e.type === 'SEND').reduce((sum, e) => { const inj = scenario.injects.find(i => i.id === e.injectId); return sum + (inj?.targets.length || 0); }, 0);
    const ackRate = expectedAcks ? totalAcks / expectedAcks : 0;

    // Ack latency per team
    const teamStats = scenario.teams.map(team => {
      const sends = events.filter(e => e.type === 'SEND');
      const latencies = [];
      for (const s of sends) {
        const inj = scenario.injects.find(i => i.id === s.injectId);
        if (!inj?.targets.includes(team.id)) continue;
        const ack = events.find(e => e.type === 'ACK' && e.injectId === s.injectId && e.teamId === team.id);
        if (ack) latencies.push(ack.t - s.t);
      }
      const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
      return { team, avg, count: latencies.length };
    });

    // Objectives achievement
    const objs = scenario.objectives.map(o => {
      const linked = scenario.injects.filter(i => i.objs.includes(o.id));
      const ratings = linked.map(i => derived.evals[i.id]).filter(Boolean);
      const achieved = ratings.filter(r => r === 'Achieved' || r === 'Exceeded').length;
      return { obj: o, total: linked.length, rated: ratings.length, achieved };
    });

    return { totalSent, totalAcks, expectedAcks, ackRate, teamStats, objs };
  }, [events, scenario, derived]);

  const generate = async () => {
    setGenerated(true);
    setNarrative('Generating narrative…');
    try {
      const summary = `Exercise "${scenario.name}" ran for ${fmtT(realTime)}. ${stats.totalSent} of ${scenario.injects.length} injects were fired. Acknowledgement rate ${(stats.ackRate * 100).toFixed(0)}%. ${derived.notes.length} observer notes logged. Recent observer notes: ${derived.notes.slice(-3).map(n => n.text).join(' | ')}`;
      const text = await window.claude.complete(`You are an exercise evaluator. Write a 3-paragraph After-Action Review narrative in WHO style based on this data: ${summary}. Focus on: what went well, areas for improvement, recommended next steps. Be concrete, concise, and professional.`);
      setNarrative(text);
    } catch (err) {
      setNarrative('Unable to generate AI narrative. You can draft manually below.\n\nKey observations:\n• Acknowledgement rate: ' + (stats.ackRate * 100).toFixed(0) + '%\n• ' + stats.totalSent + ' of ' + scenario.injects.length + ' injects fired\n• ' + derived.notes.length + ' observer notes logged');
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 24 }}>
          <Mono color="var(--accent)" style={{ letterSpacing: '0.12em' }}>AFTER-ACTION REVIEW</Mono>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '10px 0 4px', letterSpacing: '-0.02em' }}>{scenario.name}</h1>
          <p style={{ fontSize: 13, color: 'var(--t2)', margin: 0 }}>{scenario.type} Exercise · {scenario.framework}</p>
        </div>

        {/* Headline stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
          {[
            { n: fmtT(realTime), l: 'Duration' },
            { n: `${stats.totalSent}/${scenario.injects.length}`, l: 'Injects fired' },
            { n: `${(stats.ackRate * 100).toFixed(0)}%`, l: 'Ack rate' },
            { n: derived.notes.length, l: 'Observations' },
          ].map(x => <Card key={x.l} style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent)' }}>{x.n}</div>
            <Mono>{x.l}</Mono>
          </Card>)}
        </div>

        <Section label="Narrative summary" right={<Btn size="sm" variant="quiet" onClick={generate}>✦ Generate with AI</Btn>}>
          {!generated ? <Empty>Click generate to produce an AI-drafted AAR narrative from your event log + observer notes.</Empty> :
            <Card><div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{narrative}</div></Card>}
        </Section>

        <div style={{ height: 24 }} />

        <Section label="Objective achievement">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.objs.map(({ obj, total, rated, achieved }) => (
              <div key={obj.id} style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
                <Mono color="var(--accent)" style={{ fontSize: 11, fontWeight: 700, minWidth: 50 }}>{obj.code}</Mono>
                <div style={{ flex: 1, fontSize: 13 }}>{obj.text}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mono>{achieved}/{total} achieved</Mono>
                  <div style={{ width: 60, height: 4, background: 'var(--elev)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${total ? (achieved / total) * 100 : 0}%`, background: achieved === total ? 'var(--green)' : 'var(--amber)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div style={{ height: 24 }} />

        <Section label="Team performance">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {stats.teamStats.map(({ team, avg, count }) => (
              <Card key={team.id} style={{ borderLeft: `3px solid ${hueColor(team.hue)}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <Dot color={hueColor(team.hue)} size={7} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{team.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <Mono>Avg ack latency</Mono>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{avg ? fmtMMSS(avg) : '—'}</div>
                  </div>
                  <div>
                    <Mono>Total ack'd</Mono>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{count}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <div style={{ height: 24 }} />

        <Section label="Observer log" right={<Mono>{derived.notes.length} entries</Mono>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {derived.notes.length === 0 && <Empty>No observer notes recorded</Empty>}
            {derived.notes.map((n, i) => <div key={i} style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                <Mono color="var(--accent)">T+{fmtMMSS(n.t)}</Mono>
                <Mono>{n.by}</Mono>
              </div>
              <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.55 }}>{n.text}</div>
            </div>)}
          </div>
        </Section>

        <div style={{ height: 24 }} />

        <div style={{ display: 'flex', gap: 8, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <Btn variant="primary">Export AAR as PDF</Btn>
          <Btn variant="quiet">Export MELT log as CSV</Btn>
          <Btn variant="ghost">Share with stakeholders</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Review });
