
// LIVE MODE — ops dashboard (calm, focused) + MEL + participant inbox + observer
// All roles share one view, gated by `me.role`.

const { useState: lUseState, useMemo: lUseMemo, useEffect: lUseEffect } = React;

function Live() {
  const s = useStore();
  const { me } = s;

  if (s.state === 'idle') return <PreflightView />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <LiveHeader />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {me.role === 'facilitator' && <FacilitatorOps />}
        {me.role === 'participant' && <ParticipantOps />}
        {me.role === 'observer'   && <ObserverOps />}
      </div>
    </div>
  );
}

function PreflightView() {
  const { scenario, start, setMe } = useStore();
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ maxWidth: 640, textAlign: 'center' }}>
        <Mono color="var(--accent)">READY TO START</Mono>
        <h1 style={{ fontSize: 34, fontWeight: 700, margin: '14px 0 8px', letterSpacing: '-0.02em' }}>{scenario.name}</h1>
        <p style={{ fontSize: 14, color: 'var(--t2)', margin: '0 0 4px' }}>{scenario.type} Exercise · {scenario.framework}</p>
        <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6, maxWidth: 520, margin: '18px auto 32px' }}>{scenario.concept}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 32 }}>
          {[
            { n: scenario.injects.length, l: 'Injects' },
            { n: scenario.teams.length, l: 'Teams' },
            { n: scenario.phases.length, l: 'Phases' },
            { n: scenario.objectives.length, l: 'Objectives' },
          ].map(x => <Card key={x.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent)' }}>{x.n}</div>
            <Mono>{x.l}</Mono>
          </Card>)}
        </div>

        <Btn variant="primary" size="lg" onClick={start}>▶ Start exercise</Btn>
        <div style={{ marginTop: 20, fontSize: 11, color: 'var(--t3)' }}>Once started, the master clock advances and scheduled injects become fireable.</div>
      </div>
    </div>
  );
}

function LiveHeader() {
  const { scenario, state, time, speed, setSpeed, pause, resume, end, currentPhase, derived } = useStore();
  const isLive = state === 'live', isPaused = state === 'paused';
  const pending = scenario.injects.length - derived.sent.length;

  return (
    <header style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0, background: isLive ? 'color-mix(in oklch, var(--red) 4%, var(--surface))' : 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flex: 1 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{scenario.name}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Now in <Chip hue={currentPhase.hue} small>{currentPhase.name}</Chip></div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, color: isLive ? 'var(--t1)' : 'var(--amber)', letterSpacing: '-0.02em', lineHeight: 1 }}>{fmtT(time)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {isLive && <><Dot color="var(--red)" pulse /><Mono color="var(--red)" style={{ fontWeight: 700, letterSpacing: '0.12em' }}>LIVE</Mono></>}
          {isPaused && <Mono color="var(--amber)" style={{ fontWeight: 700, letterSpacing: '0.12em' }}>PAUSED</Mono>}
          {state === 'ended' && <Mono style={{ fontWeight: 700, letterSpacing: '0.12em' }}>ENDED</Mono>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'right' }}>
          <Mono>Injects remaining</Mono>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--t1)' }}>{pending}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--elev)', padding: 3, borderRadius: 7, border: '1px solid var(--border)' }}>
          {[1, 2, 5, 10].map(x => <button key={x} onClick={() => setSpeed(x)} style={{ padding: '4px 9px', fontSize: 11, fontWeight: 600, background: speed === x ? 'var(--accent)' : 'transparent', color: speed === x ? '#fff' : 'var(--t3)', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>{x}×</button>)}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {isLive && <Btn variant="quiet" size="sm" onClick={pause}>⏸</Btn>}
          {isPaused && <Btn variant="primary" size="sm" onClick={resume}>▶</Btn>}
          {(isLive || isPaused) && <Btn variant="danger" size="sm" onClick={end}>■ End</Btn>}
        </div>
      </div>
    </header>
  );
}

// ──────────────── FACILITATOR OPS ────────────────

function FacilitatorOps() {
  const { scenario, sendInject, derived, time, state, addNote } = useStore();
  const [focusInject, setFocusInject] = lUseState(null);

  // Auto-fire: check scheduled injects that should have fired
  const overdue = scenario.injects.filter(i => i.type === 'scheduled' && i.scheduledT <= time + 60 && !derived.sent.find(s => s.id === i.id));

  const nextUp = overdue[0];
  const recentSent = derived.sent.slice(-4).reverse();

  const teamStatus = scenario.teams.map(team => {
    const targeted = derived.sent.filter(s => {
      const inj = scenario.injects.find(i => i.id === s.id);
      return inj?.targets.includes(team.id);
    });
    const acked = targeted.filter(s => derived.acks[s.id + '-' + team.id]);
    return { team, total: targeted.length, acked: acked.length, rate: targeted.length ? acked.length / targeted.length : 1, lag: targeted.length - acked.length };
  });

  const focus = focusInject ? scenario.injects.find(i => i.id === focusInject) : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', height: '100%', overflow: 'hidden' }}>
      {/* Main ops area */}
      <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* NOW card — the single most important thing on screen */}
        {nextUp && state === 'live' ? (
          <div style={{ border: '1px solid var(--accent)', borderRadius: 14, padding: 22, background: 'color-mix(in oklch, var(--accent) 6%, var(--surface))', boxShadow: '0 0 0 4px color-mix(in oklch, var(--accent) 10%, transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Mono color="var(--accent)" style={{ fontWeight: 700, letterSpacing: '0.12em' }}>NEXT UP · SCHEDULED T+{fmtMMSS(nextUp.scheduledT)}</Mono>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t3)' }}>
                {nextUp.scheduledT > time ? <>fires in <Mono color="var(--accent)">{fmtMMSS(nextUp.scheduledT - time)}</Mono></> : <Mono color="var(--red)">OVERDUE</Mono>}
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.2, marginBottom: 10, letterSpacing: '-0.01em' }}>{nextUp.title}</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
              {nextUp.targets.map(tid => <TeamChip key={tid} team={scenario.teams.find(t => t.id === tid)} />)}
            </div>
            <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--t2)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', maxHeight: 120, overflowY: 'auto', padding: 12, background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>{nextUp.content}</pre>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Btn variant="primary" size="lg" onClick={() => sendInject(nextUp.id)}>⚡ Fire inject now</Btn>
              <Btn variant="quiet" size="sm" onClick={() => setFocusInject(nextUp.id)}>Preview</Btn>
              <Btn variant="ghost" size="sm">Hold</Btn>
            </div>
          </div>
        ) : (
          <Card style={{ textAlign: 'center', padding: 36 }}>
            <Mono color="var(--t3)" style={{ letterSpacing: '0.12em' }}>ALL CAUGHT UP</Mono>
            <p style={{ fontSize: 14, color: 'var(--t2)', margin: '8px 0 0' }}>No injects due in the next minute.</p>
          </Card>
        )}

        {/* Team attention grid — most important live signal */}
        <Section label="Team attention" right={<Mono>acknowledgement rates · rolling</Mono>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {teamStatus.map(({ team, total, acked, rate, lag }) => {
              const attn = rate < 0.5 && total > 0 ? 'var(--red)' : rate < 1 ? 'var(--amber)' : 'var(--green)';
              return <div key={team.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${hueColor(team.hue)}`, borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Dot color={hueColor(team.hue)} size={7} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{team.name}</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: total ? attn : 'var(--t3)' }}>{acked}/{total}</div>
                <div style={{ height: 3, background: 'var(--elev)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${rate * 100}%`, background: total ? attn : 'var(--t3)', transition: 'width .4s' }} />
                </div>
                {lag > 0 && <Mono color="var(--amber)" style={{ marginTop: 6, display: 'block' }}>{lag} awaiting ack</Mono>}
              </div>;
            })}
          </div>
        </Section>

        {/* Recent activity — quiet log */}
        <Section label="Recent activity">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentSent.length === 0 && <Empty>Nothing sent yet</Empty>}
            {recentSent.map(s => {
              const inj = scenario.injects.find(i => i.id === s.id);
              if (!inj) return null;
              const ackedTeams = inj.targets.filter(tid => derived.acks[s.id + '-' + tid]);
              return <div key={s.id + s.t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7 }}>
                <Mono color="var(--accent)" style={{ minWidth: 54, fontWeight: 600 }}>T+{fmtMMSS(s.t)}</Mono>
                <div style={{ fontSize: 12, color: 'var(--t1)', flex: 1 }}>{inj.title}</div>
                <div style={{ display: 'flex', gap: 3 }}>{inj.targets.map(tid => { const t = scenario.teams.find(t => t.id === tid); const ok = ackedTeams.includes(tid); return <Dot key={tid} color={ok ? hueColor(t.hue) : 'var(--border)'} size={7} />; })}</div>
              </div>;
            })}
          </div>
        </Section>

        {/* Queue peek */}
        <Section label="Ahead in queue">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {scenario.injects.filter(i => !derived.sent.find(s => s.id === i.id) && i !== nextUp).slice(0, 5).map(inj => {
              const ph = scenario.phases.find(p => p.id === inj.phase);
              return <div key={inj.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '7px 12px', borderBottom: '1px solid var(--border)' }}>
                <Mono color="var(--t3)" style={{ minWidth: 54 }}>T+{fmtMMSS(inj.scheduledT)}</Mono>
                <Chip hue={ph.hue} small>{ph.name}</Chip>
                <span style={{ fontSize: 12, color: 'var(--t2)', flex: 1 }}>{inj.title}</span>
                {inj.rule && <Mono color="var(--accent)">⇅ conditional</Mono>}
              </div>;
            })}
          </div>
        </Section>
      </div>

      {/* Side rail: scenario state + observer notes */}
      <aside style={{ borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 18, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 12 }}>Scenario State</div>
          <Dials />
        </div>
        <div style={{ padding: 18, flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>Chat with facilitators</div>
          <ChatLog teamId="fac" />
        </div>
      </aside>
    </div>
  );
}

function Dials() {
  const { derived, setDial } = useStore();
  const dials = [
    { k: 'epi', label: 'Epi pressure', hue: 25 },
    { k: 'ops', label: 'Ops load',     hue: 65 },
    { k: 'comms', label: 'Comms',      hue: 195 },
    { k: 'public', label: 'Public concern', hue: 280 },
  ];
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
    {dials.map(d => {
      const v = derived.dials[d.k] ?? 0;
      return <div key={d.k} style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>{d.label}</span>
          <Mono color={hueColor(d.hue)} style={{ fontWeight: 700 }}>{v}</Mono>
        </div>
        <input type="range" min={0} max={100} value={v} onChange={e => setDial(d.k, +e.target.value)} style={{ width: '100%', accentColor: hueColor(d.hue) }} />
      </div>;
    })}
  </div>;
}

function ChatLog({ teamId }) {
  const { derived } = useStore();
  const msgs = derived.chats.filter(c => c.teamId === teamId);
  if (msgs.length === 0) return <Empty>No messages</Empty>;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {msgs.map((m, i) => <div key={i} style={{ fontSize: 12 }}>
      <Mono>T+{fmtMMSS(m.t)} · <span style={{ color: 'var(--t2)', fontWeight: 600 }}>{m.sender}</span></Mono>
      <div style={{ color: 'var(--t1)', marginTop: 2 }}>{m.text}</div>
    </div>)}
  </div>;
}

// ──────────────── PARTICIPANT OPS ────────────────

function ParticipantOps() {
  const { scenario, derived, ackInject, me, chat, time } = useStore();
  const teamId = me.teamId || 't1';
  const team = scenario.teams.find(t => t.id === teamId);
  const [selectedSent, setSelectedSent] = lUseState(null);
  const [chatText, setChatText] = lUseState('');

  const myInjects = derived.sent.filter(s => {
    const inj = scenario.injects.find(i => i.id === s.id);
    return inj?.targets.includes(teamId);
  });

  const sel = selectedSent ? derived.sent.find(s => s.id === selectedSent && s.t === selectedSent.t) || myInjects.find(m => m.id === selectedSent) : null;
  const selInj = sel ? scenario.injects.find(i => i.id === sel.id) : null;
  const selAcked = sel ? !!derived.acks[sel.id + '-' + teamId] : false;

  const sendChat = () => { if (chatText.trim()) { chat(teamId, me.name || team.lead, chatText.trim()); setChatText(''); } };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 280px', height: '100%' }}>
      {/* Inbox */}
      <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Dot color={hueColor(team.hue)} size={9} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{team.name}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t3)' }}>{me.name || team.lead}</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {myInjects.length === 0 && <Empty>Waiting for first inject…</Empty>}
          {myInjects.slice().reverse().map(s => {
            const inj = scenario.injects.find(i => i.id === s.id);
            const acked = !!derived.acks[s.id + '-' + teamId];
            const active = selectedSent === s.id;
            return <div key={s.id + s.t} onClick={() => setSelectedSent(s.id)} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', borderLeft: acked ? 'none' : '3px solid var(--accent)', background: active ? 'color-mix(in oklch, var(--accent) 6%, transparent)' : 'transparent' }}>
              <div style={{ fontSize: 12, fontWeight: acked ? 500 : 700, color: acked ? 'var(--t2)' : 'var(--t1)', lineHeight: 1.4 }}>{inj.title}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                <Mono>T+{fmtMMSS(s.t)}</Mono>
                {acked && <Mono color="var(--green)" style={{ fontWeight: 600 }}>✓ ACK</Mono>}
              </div>
            </div>;
          })}
        </div>
      </div>

      {/* Detail */}
      <div style={{ padding: 32, overflowY: 'auto' }}>
        {!selInj ? <div style={{ color: 'var(--t3)', fontSize: 13, textAlign: 'center', marginTop: 80 }}>Select a message from the inbox</div> : <div style={{ maxWidth: 700 }}>
          <Mono color="var(--accent)" style={{ letterSpacing: '0.1em' }}>RECEIVED · T+{fmtMMSS(sel.t)}</Mono>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '10px 0 14px', letterSpacing: '-0.01em' }}>{selInj.title}</h1>
          <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--t1)', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: '0 0 24px' }}>{selInj.content}</pre>
          {!selAcked ? <Btn variant="primary" onClick={() => ackInject(sel.id, teamId, me.name || team.lead)}>✓ Acknowledge receipt</Btn>
            : <div style={{ padding: 12, background: 'color-mix(in oklch, var(--green) 10%, transparent)', border: '1px solid color-mix(in oklch, var(--green) 40%, transparent)', borderRadius: 8, color: 'var(--green)', fontWeight: 600, fontSize: 13 }}>✓ Acknowledged</div>}
        </div>}
      </div>

      {/* Chat */}
      <aside style={{ borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)' }}>Team chat</div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {derived.chats.filter(c => c.teamId === teamId).map((m, i) => <div key={i} style={{ fontSize: 12 }}>
            <Mono style={{ fontWeight: 600, color: 'var(--t2)' }}>{m.sender}</Mono> <Mono>· T+{fmtMMSS(m.t)}</Mono>
            <div style={{ marginTop: 2, padding: '7px 10px', background: 'var(--elev)', borderRadius: 8, color: 'var(--t1)' }}>{m.text}</div>
          </div>)}
        </div>
        <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
          <input value={chatText} onChange={e => setChatText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Message team..." style={{ flex: 1, background: 'var(--elev)', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--t1)', fontSize: 12, padding: '7px 12px', fontFamily: 'inherit', outline: 'none' }} />
          <Btn size="sm" variant="primary" onClick={sendChat}>↑</Btn>
        </div>
      </aside>
    </div>
  );
}

// ──────────────── OBSERVER OPS ────────────────

function ObserverOps() {
  const { scenario, derived, addNote, setEval, me, time } = useStore();
  const [noteText, setNoteText] = lUseState('');
  const [selInject, setSelInject] = lUseState(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', height: '100%' }}>
      <div style={{ padding: 24, overflowY: 'auto' }}>
        <Mono color="var(--accent)" style={{ letterSpacing: '0.1em' }}>OBSERVER MODE · READ-ONLY</Mono>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 20px' }}>Live evaluation stream</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {derived.sent.slice().reverse().map(s => {
            const inj = scenario.injects.find(i => i.id === s.id);
            if (!inj) return null;
            const ackedCount = inj.targets.filter(tid => derived.acks[s.id + '-' + tid]).length;
            const rating = derived.evals[inj.id];
            const active = selInject === inj.id;
            return <Card key={s.id + s.t} onClick={() => setSelInject(inj.id)} active={active}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Mono color="var(--accent)" style={{ minWidth: 54 }}>T+{fmtMMSS(s.t)}</Mono>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{inj.title}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {inj.targets.map(tid => { const t = scenario.teams.find(t => t.id === tid); const ok = derived.acks[s.id + '-' + tid]; return <Dot key={tid} color={ok ? hueColor(t.hue) : 'var(--border)'} size={7} />; })}
                    <Mono style={{ marginLeft: 6 }}>{ackedCount}/{inj.targets.length} ack'd</Mono>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['Not obs.', 'Partial', 'Achieved', 'Exceeded'].map((r, i) => <button key={r} onClick={e => { e.stopPropagation(); setEval(inj.id, r); }} style={{ fontSize: 10, padding: '3px 7px', borderRadius: 3, border: '1px solid var(--border)', background: rating === r ? ['var(--t3)', 'var(--amber)', 'var(--green)', 'var(--accent)'][i] : 'transparent', color: rating === r ? '#fff' : 'var(--t3)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>{r}</button>)}
                </div>
              </div>
            </Card>;
          })}
        </div>
      </div>

      <aside style={{ borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 18, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>Observer notes</div>
          <div style={{ fontSize: 11, color: 'var(--t3)' }}>Time-stamped observations feed directly into the AAR.</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {derived.notes.length === 0 && <Empty>No notes yet</Empty>}
          {derived.notes.slice().reverse().map((n, i) => <div key={i} style={{ fontSize: 12, padding: 10, background: 'var(--elev)', borderRadius: 6 }}>
            <Mono color="var(--accent)">T+{fmtMMSS(n.t)}</Mono>
            <div style={{ marginTop: 3, color: 'var(--t1)', lineHeight: 1.5 }}>{n.text}</div>
          </div>)}
        </div>
        <div style={{ padding: 10, borderTop: '1px solid var(--border)' }}>
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Log observation... (⌘+Enter to save)" onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { if (noteText.trim()) { addNote(me.name || 'Observer', noteText.trim()); setNoteText(''); } } }} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--elev)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--t1)', fontSize: 12, padding: '8px 10px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 60 }} rows={3} />
          <Btn size="sm" variant="primary" style={{ marginTop: 6, width: '100%', justifyContent: 'center' }} onClick={() => { if (noteText.trim()) { addNote(me.name || 'Observer', noteText.trim()); setNoteText(''); } }}>Log note</Btn>
        </div>
      </aside>
    </div>
  );
}

Object.assign(window, { Live });
