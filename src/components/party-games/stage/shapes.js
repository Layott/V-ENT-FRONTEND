// Every shape a party game animation is drawn with (inbox 434 and 439).
//
// Ported from the approved mockup (docs/mockups/party-games.html), which built
// the same drawings as strings. Here they are React elements, so nothing is
// ever written into the page as HTML. Every actor is drawn around its own
// origin; Stage.js moves it.
//
// The palette is the illustration's, kept here in one place: the site's red,
// gold and green for the players, flat fills, no glow, nothing that animates
// on its own.

export const PALETTE = {
  r: '#ED1C24', g: '#D4AF37', n: '#4caf50', w: '#E6E6E9', k: '#6B6C73',
};
const SKIN = '#9A6B4B';
const DARK = '#2f3036';
const LIGHT = '#F2F2F3';
const WOOD = '#C9A46A';
export const STAGE = '#1e1e22';
const INK = '#17181b';
const GREY = '#8a8b93';
const SILVER = '#b9b9bf';
const RED_DARK = '#b5141a';

const col = (c) => PALETTE[c] || c || PALETTE.w;

function Person({ p }) {
  const c = col(p.c);
  const pose = p.pose || 'stand';
  let lift = 0;
  let legs = (
    <>
      <rect x="-6" y="-14" width="4" height="14" rx="1.5" fill={DARK} />
      <rect x="2" y="-14" width="4" height="14" rx="1.5" fill={DARK} />
    </>
  );
  if (pose === 'kickR') {
    legs = (
      <>
        <rect x="-6" y="-14" width="4" height="14" rx="1.5" fill={DARK} />
        <rect x="2" y="-14" width="4" height="14" rx="1.5" fill={DARK} transform="rotate(-38 4 -14)" />
      </>
    );
  }
  if (pose === 'kickL') {
    legs = (
      <>
        <rect x="-6" y="-14" width="4" height="14" rx="1.5" fill={DARK} transform="rotate(38 -4 -14)" />
        <rect x="2" y="-14" width="4" height="14" rx="1.5" fill={DARK} />
      </>
    );
  }
  if (pose === 'sit') {
    lift = 3;
    legs = (
      <>
        <rect x="-6" y="-17" width="15" height="4" rx="1.5" fill={DARK} />
        <rect x="5" y="-15" width="4" height="15" rx="1.5" fill={DARK} />
      </>
    );
  }
  let arms = (
    <>
      <rect x="-11" y={-32 + lift} width="3" height="15" rx="1.5" fill={SKIN} />
      <rect x="8" y={-32 + lift} width="3" height="15" rx="1.5" fill={SKIN} />
    </>
  );
  if (pose === 'up') {
    arms = (
      <>
        <rect x="-12" y={-56 + lift} width="3" height="20" rx="1.5" fill={SKIN} />
        <rect x="9" y={-56 + lift} width="3" height="20" rx="1.5" fill={SKIN} />
      </>
    );
  }
  if (pose === 'clap') {
    arms = (
      <>
        <rect x="-10" y={-31 + lift} width="20" height="3" rx="1.5" fill={SKIN} />
        <circle cx="0" cy={-30 + lift} r="2.6" fill={SKIN} />
      </>
    );
  }
  if (p.pull === 'l') arms = <rect x="0" y={-31 + lift} width="15" height="3" rx="1.5" fill={SKIN} />;
  if (p.pull === 'r') arms = <rect x="-15" y={-31 + lift} width="15" height="3" rx="1.5" fill={SKIN} />;
  return (
    <>
      {legs}
      {p.sack && <rect x="-10" y="-24" width="20" height="25" rx="5" fill="#B08D57" />}
      <rect x="-8" y={-35 + lift} width="16" height="22" rx="5" fill={c} />
      {arms}
      <circle cx="0" cy={-42 + lift} r="7" fill={SKIN} />
      {p.pad && <rect x="-7" y={-27 + lift} width="14" height="6" rx="3" fill={GREY} />}
      {p.mic && (
        <>
          <rect x="9" y={-48 + lift} width="3" height="9" rx="1" fill={GREY} />
          <circle cx="10.5" cy={-49 + lift} r="3" fill={SILVER} />
        </>
      )}
      {p.spoon !== undefined && (
        <>
          <rect x="8" y={-29 + lift} width="15" height="2" rx="1" fill={SILVER} />
          <ellipse cx="25" cy={-29 + lift} rx="4" ry="2" fill={SILVER} />
          {p.spoon
            ? <ellipse cx="25" cy={-33 + lift} rx="3.2" ry="4" fill="#F2E9D8" />
            : <ellipse cx="30" cy="12" rx="3.6" ry="2.4" fill="#F2E9D8" />}
        </>
      )}
    </>
  );
}

function Card({ p }) {
  if (p.back) {
    return (
      <>
        <rect x="-6" y="-8.5" width="12" height="17" rx="2" fill={PALETTE.r} />
        <rect x="-4" y="-6.5" width="8" height="13" rx="1.5" fill={RED_DARK} />
      </>
    );
  }
  if (p.col) {
    return (
      <>
        <rect x="-6" y="-8.5" width="12" height="17" rx="2" fill={col(p.col)} />
        <ellipse cx="0" cy="0" rx="4.4" ry="6" fill={LIGHT} transform="rotate(25)" />
        <text x="0" y="2.2" textAnchor="middle" fontSize="5.6" fontWeight="700" fill={INK}>{p.n || ''}</text>
      </>
    );
  }
  const m = p.m || 'o';
  let sym = <circle cx="0" cy="1" r="3" fill={RED_DARK} />;
  if (m === 's') sym = <rect x="-3" y="-2" width="6" height="6" fill={RED_DARK} />;
  if (m === 't') sym = <path d="M0,-3 L3.4,3.6 L-3.4,3.6 Z" fill={RED_DARK} />;
  return (
    <>
      <rect x="-6" y="-8.5" width="12" height="17" rx="2" fill={LIGHT} />
      {sym}
      <text x="-4.2" y="-3.4" fontSize="4.4" fontWeight="700" fill={RED_DARK}>{p.n || ''}</text>
    </>
  );
}

function Label({ text, size, fill, bg, tail }) {
  const t = String(text || '');
  const w = Math.max(24, t.length * size * 0.56 + 14);
  const h = size + 10;
  return (
    <>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={bg} />
      {tail && <path d={`M-4,${h / 2 - 1} L0,${h / 2 + 5} L4,${h / 2 - 1} Z`} fill={bg} />}
      <text x="0" y={size * 0.35} textAnchor="middle" fontSize={size} fontWeight="650" fill={fill}>{t}</text>
    </>
  );
}

const PIPS = {
  1: [[0, 0]], 2: [[-3, -3], [3, 3]], 3: [[-3, -3], [0, 0], [3, 3]],
  4: [[-3, -3], [3, -3], [-3, 3], [3, 3]], 5: [[-3, -3], [3, -3], [0, 0], [-3, 3], [3, 3]],
  6: [[-3, -3.5], [3, -3.5], [-3, 0], [3, 0], [-3, 3.5], [3, 3.5]],
};
const BINGO = [3, 18, 34, 41, 67, 9, 22, 50, 73, 88, 12, 27, 45, 59, 81];
const CUP_SPOTS = [[-14, 6], [0, 6], [14, 6], [-7, -6], [7, -6], [0, -18]];

function Pits() {
  const out = [<rect key="b" x="-92" y="-32" width="184" height="64" rx="30" fill="#6b4f2e" />];
  for (let i = 0; i < 6; i += 1) {
    for (const y of [-13, 13]) {
      const x = -62.5 + i * 25;
      out.push(<circle key={`p${i}${y}`} cx={x} cy={y} r="9.5" fill="#4a3620" />);
      [[-3, -2], [2.5, -3], [-2, 3], [3, 2.5]].forEach(([a, b], n) => {
        out.push(<circle key={`s${i}${y}${n}`} cx={x + a} cy={y + b} r="1.8" fill="#E1C38F" />);
      });
    }
  }
  return out;
}

function Checker() {
  const out = [<rect key="b" x="-42" y="-42" width="84" height="84" rx="4" fill={GREY} />];
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) {
      if ((i + j) % 2) out.push(<rect key={`${i}-${j}`} x={-40 + i * 10} y={-40 + j * 10} width="10" height="10" fill="#3a3b41" />);
    }
  }
  return out;
}

function Hand({ p }) {
  const k = p.k || 'rock';
  let s = null;
  if (k === 'rock') {
    s = (
      <>
        <circle r="11" fill={SKIN} />
        <rect x="-8" y="-4" width="16" height="2" rx="1" fill="#7d533a" />
      </>
    );
  }
  if (k === 'paper') s = <rect x="-10" y="-15" width="20" height="28" rx="6" fill={SKIN} />;
  if (k === 'scissors') {
    s = (
      <>
        <circle r="8" fill={SKIN} />
        <rect x="-6" y="-24" width="4" height="18" rx="2" fill={SKIN} transform="rotate(-12 -4 -6)" />
        <rect x="2" y="-24" width="4" height="18" rx="2" fill={SKIN} transform="rotate(12 4 -6)" />
      </>
    );
  }
  if (k === 'open') s = <ellipse rx="9" ry="6" fill={SKIN} />;
  const cuff = p.c ? <rect x="-9" y="12" width="18" height="10" rx="3" fill={col(p.c)} /> : null;
  return p.flip ? <g transform="scale(-1,1)">{s}{cuff}</g> : <>{s}{cuff}</>;
}

/** One actor of type `t` with props `p`. `say` translates any word it draws. */
export function Shape({ t, p, say }) {
  const word = (w) => (say ? say(w) : w);
  switch (t) {
    case 'p': return <Person p={p} />;
    case 'head':
      return (
        <>
          <circle r="11" fill={col(p.c)} />
          <circle r="7" fill={SKIN} />
          {p.n ? <text y="2.6" textAnchor="middle" fontSize="7.5" fontWeight="700" fill={LIGHT}>{word(p.n)}</text> : null}
        </>
      );
    case 'table': return <ellipse rx={p.rx} ry={p.ry} fill={p.faint ? '#232428' : '#2a2b30'} />;
    case 'ground': return <rect x={-p.w / 2} y="0" width={p.w} height="3" fill="#2c2d33" />;
    case 'deck':
      return (
        <>
          <g transform="translate(-1.5,-1.5)"><Card p={{ back: true }} /></g>
          <Card p={{ back: true }} />
        </>
      );
    case 'card': return <Card p={p} />;
    case 'bubble': return <Label text={word(p.label)} size={9.5} fill={INK} bg={LIGHT} tail />;
    case 'tag': return <Label text={word(p.label)} size={8.5} fill={LIGHT} bg="#33343a" />;
    case 'crown': return <path d="M-9,5 L-9,-3 L-4.5,1 L0,-6 L4.5,1 L9,-3 L9,5 Z" fill={PALETTE.g} />;
    case 'ludo':
      return (
        <>
          <rect x="-52" y="-52" width="104" height="104" rx="6" fill="#E6E6E9" />
          <rect x="-50" y="-50" width="36" height="36" rx="4" fill={PALETTE.r} />
          <rect x="14" y="-50" width="36" height="36" rx="4" fill={PALETTE.g} />
          <rect x="14" y="14" width="36" height="36" rx="4" fill={PALETTE.n} />
          <rect x="-50" y="14" width="36" height="36" rx="4" fill={GREY} />
          <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#2a2b30" />
          {[[-32, -32], [32, -32], [32, 32], [-32, 32]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="9" fill={LIGHT} opacity=".35" />
          ))}
        </>
      );
    case 'die':
      return (
        <>
          <rect x="-7" y="-7" width="14" height="14" rx="3.5" fill={LIGHT} />
          {(PIPS[p.n] || PIPS[1]).map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.4" fill={INK} />)}
        </>
      );
    case 'token':
      return (
        <>
          <circle r="5.5" fill={col(p.c)} />
          <circle r="2.5" fill="rgba(0,0,0,.25)" />
        </>
      );
    case 'pits': return <Pits />;
    case 'seed': {
      const n = p.n || 0;
      if (!n) return <circle r="0.1" fill="none" />;
      return Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={(i % 4) * 4.4 - 6.6} cy={Math.floor(i / 4) * 4.4 - 2} r="2" fill="#E1C38F" />
      ));
    }
    case 'checker': return <Checker />;
    case 'piece':
      return (
        <>
          <circle r="4.6" fill={col(p.c)} />
          <circle r="2.4" fill="rgba(0,0,0,.22)" />
        </>
      );
    case 'score': {
      const t2 = String(p.n ?? '');
      const w = Math.max(28, t2.length * 8 + 14);
      return (
        <>
          <rect x={-w / 2} y="-11" width={w} height="22" rx="7" fill="#2a2b30" />
          <text y="5" textAnchor="middle" fontSize="13" fontWeight="700" fill={LIGHT}>{word(t2)}</text>
        </>
      );
    }
    case 'chair':
      return (
        <>
          <rect x="-9" y="-16" width="18" height="4" rx="1" fill={GREY} />
          <rect x="-9" y="-36" width="3" height="20" rx="1" fill={GREY} />
          <rect x="-9" y="-12" width="2.5" height="12" fill="#6b6c73" />
          <rect x="6.5" y="-12" width="2.5" height="12" fill="#6b6c73" />
        </>
      );
    case 'speaker':
      return (
        <>
          <rect x="-11" y="-17" width="22" height="34" rx="4" fill="#33343a" />
          <circle cy="-5" r="6.5" fill="#15161a" />
          <circle cy="9" r="4" fill="#15161a" />
        </>
      );
    case 'note':
      return (
        <>
          <circle cx="-3" cy="4" r="3.6" fill={PALETTE.g} />
          <rect x="0" y="-11" width="2" height="15" fill={PALETTE.g} />
          <path d="M2,-11 Q9,-8 7,-2 Q6,-6 2,-7 Z" fill={PALETTE.g} />
        </>
      );
    case 'clock':
      return (
        <>
          <circle r="13" fill="#2a2b30" />
          <circle r="10" fill="#15161a" />
          <text y="3.5" textAnchor="middle" fontSize="9" fontWeight="700" fill={LIGHT}>{`${p.n}s`}</text>
        </>
      );
    case 'buzzer':
      return (
        <>
          <rect x="-11" y="0" width="22" height="7" rx="2" fill="#33343a" />
          <ellipse cx="0" cy="0" rx="8" ry="5.5" fill={PALETTE.r} />
        </>
      );
    case 'wordcard':
      return (
        <>
          <rect x="-30" y="-20" width="60" height="40" rx="5" fill={LIGHT} />
          {p.taboo && <rect x="-30" y="-20" width="60" height="7" rx="3" fill={PALETTE.r} />}
          <text y={p.taboo ? -2 : 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill={INK}>{word(p.label)}</text>
          {p.taboo && [6, 11, 16].map((y) => <rect key={y} x="-16" y={y - 2} width="32" height="2" rx="1" fill="#c4c4c9" />)}
        </>
      );
    case 'sheet':
      return (
        <>
          <rect x="-112" y="-46" width="224" height="92" rx="6" fill={LIGHT} />
          {(p.cols || []).map((c, i) => {
            const x = -84 + i * 56;
            const v = (p.vals || [])[i];
            return (
              <g key={c}>
                <text x={x} y="-26" textAnchor="middle" fontSize="9" fontWeight="700" fill={INK}>{word(c)}</text>
                <rect x={x - 24} y="-18" width="48" height="2" fill="#d4d4d9" />
                {v ? <text x={x} y="6" textAnchor="middle" fontSize="10" fontWeight="600" fill={RED_DARK}>{word(v)}</text> : null}
              </g>
            );
          })}
        </>
      );
    case 'mark':
      return p.finish ? (
        <>
          <rect x="-1.5" y="-38" width="3" height="38" fill={SILVER} />
          <rect x="1.5" y="-38" width="14" height="9" fill={LIGHT} />
          <rect x="1.5" y="-38" width="4.7" height="4.5" fill={INK} />
          <rect x="10.8" y="-38" width="4.7" height="4.5" fill={INK} />
          <rect x="6.2" y="-33.5" width="4.6" height="4.5" fill={INK} />
        </>
      ) : <rect x="-1.5" y="-20" width="3" height="20" rx="1" fill={GREY} />;
    case 'stick': return <rect x="-1.6" y="-9" width="3.2" height="18" rx="1.6" fill={WOOD} />;
    case 'bush':
      return (
        <>
          <ellipse rx="24" ry="15" fill="#2e5e33" />
          <ellipse cx="-10" cy="-6" rx="12" ry="9" fill="#357a3b" />
        </>
      );
    case 'mill':
      return (
        <>
          {[60, 40, 20].map((h) => (
            <rect key={h} x={-h} y={-h} width={2 * h} height={2 * h} fill="none" stroke="#6b6c73" strokeWidth="2.5" />
          ))}
          <path d="M0,-60 L0,-20 M0,20 L0,60 M-60,0 L-20,0 M20,0 L60,0" stroke="#6b6c73" strokeWidth="2.5" />
        </>
      );
    case 'track':
      return [0, 1, 2, 3].map((i) => (
        <rect key={i} x={-46 + i * 24} y="-8" width="20" height="16" rx="3" fill={i === 3 ? PALETTE.g : '#33343a'} />
      ));
    case 'ring': return <circle r={p.r} fill="none" stroke="#5a5b62" strokeWidth="2.5" />;
    case 'stone': return <circle r={p.big ? 5 : 3.2} fill={p.big ? '#c9c9cf' : GREY} />;
    case 'hand': return <Hand p={p} />;
    case 'swing':
      return <path d={p.up ? 'M-100,0 Q0,-120 100,0' : 'M-100,0 Q0,34 100,0'} fill="none" stroke={WOOD} strokeWidth="3" />;
    case 'screen':
      return (
        <>
          <rect x="-48" y="-31" width="96" height="62" rx="5" fill="#33343a" />
          <rect x="-44" y="-27" width="88" height="50" rx="3" fill="#15161a" />
          <text y="1.5" textAnchor="middle" fontSize="8.5" fontWeight="650" fill={LIGHT}>{word(p.label || '')}</text>
          <rect x="-8" y="31" width="16" height="4" fill="#33343a" />
        </>
      );
    case 'parcel':
      return (
        <>
          <rect x="-10" y="-8" width="20" height="16" rx="2" fill={PALETTE.g} />
          <rect x="-1.6" y="-8" width="3.2" height="16" fill={PALETTE.r} />
          <rect x="-10" y="-1.6" width="20" height="3.2" fill={PALETTE.r} />
        </>
      );
    case 'wink': return <path d="M-9,0 Q0,-8 9,0" fill="none" stroke={LIGHT} strokeWidth="3" strokeLinecap="round" />;
    case 'cupboard':
      return (
        <>
          <rect x="-24" y="-52" width="48" height="52" rx="3" fill="#5a4632" />
          <rect x="-21" y="-49" width="20" height="46" fill="#6b5340" />
          <rect x="1" y="-49" width="20" height="46" fill="#6b5340" />
          <circle cx="-4" cy="-26" r="1.6" fill={WOOD} />
          <circle cx="4" cy="-26" r="1.6" fill={WOOD} />
        </>
      );
    case 'paper':
      return (
        <>
          <rect x="-9" y="-11" width="18" height="22" rx="2" fill={LIGHT} />
          {[-5, -1, 3, 7].map((y) => <rect key={y} x="-5" y={y} width="10" height="1.6" fill="#c4c4c9" />)}
        </>
      );
    case 'bingo':
      return (
        <>
          <rect x="-64" y="-38" width="128" height="76" rx="7" fill={LIGHT} />
          {BINGO.map((n, i) => {
            const x = -48 + (i % 5) * 24;
            const y = -22 + Math.floor(i / 5) * 22;
            const marked = (p.marks || []).includes(i);
            return (
              <g key={n}>
                {marked && <circle cx={x} cy={y} r="9.5" fill={PALETTE.r} opacity=".85" />}
                <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill={marked ? LIGHT : INK}>{n}</text>
              </g>
            );
          })}
        </>
      );
    case 'ballnum':
      return (
        <>
          <circle r="13" fill={LIGHT} />
          <text y="4.5" textAnchor="middle" fontSize="12" fontWeight="700" fill={PALETTE.r}>{word(p.n)}</text>
        </>
      );
    case 'tower':
      return Array.from({ length: p.n || 10 }, (_, i) => {
        const y = -6 * (i + 1);
        if (i % 2) return <rect key={i} x="-12" y={y} width="24" height="5.4" rx="1" fill={WOOD} />;
        return (
          <g key={i}>
            {[-8.4, 0, 8.4].map((x) => <rect key={x} x={x - 3.6} y={y} width="7.2" height="5.4" rx="1" fill="#b8925a" />)}
          </g>
        );
      });
    case 'block': return <rect x="-12" y="-3" width="24" height="6" rx="1" fill={WOOD} />;
    case 'easel':
      return (
        <>
          <rect x="-30" y="0" width="3" height="58" fill="#6b5340" transform="rotate(8 -28 0)" />
          <rect x="27" y="0" width="3" height="58" fill="#6b5340" transform="rotate(-8 28 0)" />
          <rect x="-38" y="-44" width="76" height="56" rx="3" fill={LIGHT} />
          {(p.draw || 0) >= 1 && <rect x="-14" y="-18" width="28" height="22" fill="none" stroke={INK} strokeWidth="2.5" />}
          {(p.draw || 0) >= 2 && (
            <>
              <path d="M-18,-18 L0,-34 L18,-18" fill="none" stroke={PALETTE.r} strokeWidth="2.5" />
              <rect x="-4" y="-8" width="8" height="12" fill="none" stroke={INK} strokeWidth="2" />
            </>
          )}
        </>
      );
    case 'grid25': {
      const shown = new Map((p.shown || []).map(([i, c]) => [i, c]));
      return Array.from({ length: 25 }, (_, i) => {
        const x = -84 + (i % 5) * 34;
        const y = -54 + Math.floor(i / 5) * 22;
        const on = shown.has(i);
        return (
          <g key={i}>
            <rect x={x} y={y} width="30" height="18" rx="3" fill={on ? col(shown.get(i)) : LIGHT} />
            <rect x={x + 6} y={y + 8} width="18" height="2" rx="1" fill={on ? 'rgba(255,255,255,.6)' : '#c4c4c9'} />
          </g>
        );
      });
    }
    case 'moon':
      return (
        <>
          <circle r="10" fill="#E6E6E9" />
          <circle cx="5" cy="-3" r="9" fill={STAGE} />
        </>
      );
    case 'bottle':
      return (
        <>
          <rect x="-3.5" y="-14" width="7" height="24" rx="2.5" fill="#2e7d32" />
          <rect x="-1.6" y="-21" width="3.2" height="8" rx="1" fill="#2e7d32" />
        </>
      );
    case 'rope': return <rect x={-p.w / 2} y="-2" width={p.w} height="4" rx="2" fill={WOOD} />;
    case 'ribbon': return <rect x="-2.5" y="-9" width="5" height="18" rx="1" fill={PALETTE.r} />;
    case 'mat':
      return (
        <>
          <rect x="-58" y="-11" width="116" height="22" rx="3" fill="#E6E6E9" />
          {[PALETTE.r, PALETTE.g, PALETTE.n, GREY].map((c, i) => [0, 1, 2, 3].map((j) => (
            <circle
              key={`${i}${j}`}
              cx={-45 + j * 30}
              cy={-5 + 10 * (i % 2)}
              r="3.6"
              fill={c}
              transform={`translate(${i > 1 ? 8 : 0},0)`}
            />
          )))}
        </>
      );
    case 'spinner':
      return (
        <>
          <circle r="15" fill={LIGHT} />
          <path d="M0,0 L0,-13 A13,13 0 0 1 13,0 Z" fill={PALETTE.r} />
          <path d="M0,0 L13,0 A13,13 0 0 1 0,13 Z" fill={PALETTE.g} />
          <path d="M0,0 L0,13 A13,13 0 0 1 -13,0 Z" fill={PALETTE.n} />
          <path d="M0,0 L-13,0 A13,13 0 0 1 0,-13 Z" fill={GREY} />
          <rect x="-1.2" y="-14" width="2.4" height="15" rx="1" fill={INK} />
        </>
      );
    case 'bar': return <rect x="-56" y="-2.5" width="112" height="5" rx="2.5" fill={PALETTE.g} />;
    case 'bracket':
      return (
        <>
          <path
            d="M-80,-16 L-60,-16 L-60,-6 L-40,-6 M-80,4 L-60,4 L-60,-6 M80,-16 L60,-16 L60,-6 L40,-6 M80,4 L60,4 L60,-6 M-40,-6 L-20,-6 L-20,4 L0,4 M40,-6 L20,-6 L20,4 L0,4"
            fill="none"
            stroke="#6b6c73"
            strokeWidth="2.5"
          />
          <circle cx="0" cy="4" r="4" fill={PALETTE.g} />
        </>
      );
    case 'light':
      return (
        <>
          <rect x="-9" y="-16" width="18" height="32" rx="5" fill="#33343a" />
          <circle cy="-7" r="5" fill={p.c === 'r' ? PALETTE.r : '#4a2224'} />
          <circle cy="7" r="5" fill={p.c === 'g' ? PALETTE.n : '#243a26'} />
        </>
      );
    case 'cups': {
      const n = p.n ?? 6;
      if (!n) return <circle r="0.1" fill="none" />;
      return CUP_SPOTS.slice(0, n).map(([x, y]) => (
        <path key={`${x}${y}`} d={`M${x - 6},${y - 6} L${x + 6},${y - 6} L${x + 4.5},${y + 6} L${x - 4.5},${y + 6} Z`} fill={col(p.c)} />
      ));
    }
    case 'ball': return <circle r="3.4" fill={LIGHT} />;
    case 'oval':
      return (
        <>
          <ellipse rx="132" ry="66" fill="#3a3b41" />
          <ellipse rx="98" ry="38" fill={STAGE} />
          <rect x="-2" y="40" width="4" height="24" fill={LIGHT} />
        </>
      );
    case 'kart':
      return (
        <>
          <rect x="-10" y="-6" width="20" height="12" rx="4" fill={col(p.c)} />
          <rect x="-9" y="-9" width="5" height="3" rx="1" fill="#15161a" />
          <rect x="4" y="-9" width="5" height="3" rx="1" fill="#15161a" />
          <rect x="-9" y="6" width="5" height="3" rx="1" fill="#15161a" />
          <rect x="4" y="6" width="5" height="3" rx="1" fill="#15161a" />
        </>
      );
    case 'itembox':
      return (
        <>
          <rect x="-8" y="-8" width="16" height="16" rx="3.5" fill={PALETTE.g} />
          <text y="4" textAnchor="middle" fontSize="11" fontWeight="700" fill={INK}>?</text>
        </>
      );
    default: return null;
  }
}
