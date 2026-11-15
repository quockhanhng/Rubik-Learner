/*
 * Sinh 41 trường hợp F2L (khe phải phía trước, trắng ở dưới) và ghi ra js/f2l.js.
 *   node tools/gen-f2l.js
 *
 * Cách làm: duyệt theo chiều rộng từ khối đã giải, chỉ theo dõi 12 viên của hai tầng dưới.
 * Mỗi trạng thái mà chữ thập và 3 khe còn lại vẫn nguyên là một tình huống F2L; lời giải là
 * dãy xoay ngược lại, nên luôn là lời giải ngắn nhất trong bộ lượt xoay đang dùng.
 * Ưu tiên công thức chỉ dùng R và U; nếu quá dài thì dùng thêm F.
 */
const fs = require('fs');
const path = require('path');
const C = require('../js/cube.js');

const matVec = (m, v) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);

// ---- Đánh số 54 ô màu theo (vị trí, hướng) ----
const facelets = [];
const faceletIndex = new Map();
const solved = C.createSolved();
for (const c of solved.cubies)
  for (const dir of C.DIRS) {
    const k = dir.findIndex((v) => v !== 0);
    if (c.home[k] !== dir[k]) continue;
    faceletIndex.set(c.home.join() + '|' + dir.join(), facelets.length);
    facelets.push({ pos: c.home, dir });
  }
const idx = (pos, dir) => faceletIndex.get(pos.join() + '|' + dir.join());

function moveTable(name) {
  const s = C.applyAlg(C.createSolved(), C.parseAlg(name));
  const table = new Array(54);
  for (const c of s.cubies)
    for (const dir of C.DIRS) {
      const k = dir.findIndex((v) => v !== 0);
      if (c.home[k] !== dir[k]) continue;
      table[idx(c.home, dir)] = idx(c.pos, matVec(c.rot, dir));
    }
  return table;
}

// ---- 12 ô được theo dõi (khung nhìn: trắng ở dưới, y = +1) ----
const DOWN = [0, 1, 0];
const START = [
  idx([0, 1, 1], DOWN), idx([0, 1, -1], DOWN), idx([1, 1, 0], DOWN), idx([-1, 1, 0], DOWN), // chữ thập
  idx([1, 1, -1], DOWN), idx([-1, 1, -1], DOWN), idx([-1, 1, 1], DOWN), // 3 góc còn lại
  idx([1, 0, -1], [0, 0, -1]), idx([-1, 0, -1], [0, 0, -1]), idx([-1, 0, 1], [0, 0, 1]), // 3 cạnh còn lại
  idx([1, 1, 1], DOWN), // góc của cặp (ô trắng)
  idx([1, 0, 1], [0, 0, 1]), // cạnh của cặp (ô ở mặt trước)
];
const REST = 10;
const key = (st) => String.fromCharCode(...st);
const START_KEY = key(START);
const restSolved = (st) => {
  for (let i = 0; i < REST; i++) if (st[i] !== START[i]) return false;
  return true;
};

function bfs(moveNames, maxDepth, start) {
  start = start || START;
  const tables = moveNames.map(moveTable);
  const faces = moveNames.map((m) => m[0]);
  const parent = new Map([[key(start), null]]);
  let frontier = [{ st: start, last: '' }];
  const found = new Map(); // key trạng thái -> dãy xoay từ khối đã giải
  for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
    const next = [];
    for (const node of frontier) {
      const nodeKey = key(node.st);
      for (let m = 0; m < tables.length; m++) {
        if (faces[m] === node.last) continue;
        const t = tables[m];
        const st = node.st.map((f) => t[f]);
        const k = key(st);
        if (parent.has(k)) continue;
        parent.set(k, [nodeKey, m]);
        next.push({ st, last: faces[m] });
        if (restSolved(st)) found.set(k, st);
      }
    }
    frontier = next;
  }
  const pathTo = (k) => {
    const seq = [];
    let cur = k;
    while (parent.get(cur)) {
      const [pk, m] = parent.get(cur);
      seq.push(moveNames[m]);
      cur = pk;
    }
    return seq.reverse();
  };
  const results = new Map();
  results.parent = parent;
  results.pathTo = pathTo;
  for (const [k, st] of found) {
    const seq = pathTo(k);
    const solution = C.algToString(C.invertAlg(C.parseAlg(seq.join(' '))));
    results.set(k, { st, alg: solution });
  }
  return results;
}

const len = (alg) => alg.split(' ').length;
const U_TABLE = moveTable('U');
const applyU = (st, n) => {
  let out = st;
  for (let i = 0; i < n; i++) out = out.map((f) => U_TABLE[f]);
  return out;
};
// Hai tình huống chỉ khác nhau một lượt xoay U được coi là một.
const signature = (st) => {
  let best = null;
  for (let n = 0; n < 4; n++) {
    const k = key(applyU(st, n).slice(REST));
    if (best === null || k < best) best = k;
  }
  return best;
};

console.log('Đang tìm công thức chỉ dùng R, U ...');
const ru = bfs(['U', "U'", 'U2', 'R', "R'"], 13);
console.log('Đang tìm công thức dùng R, U, F ...');
const urf = bfs(['U', "U'", 'U2', 'R', "R'", 'F', "F'"], 9);

const score = (alg) => len(alg) * 100 + (alg.startsWith('U') ? 10 : 0) + (alg.match(/F/g) || []).length;
const bestBySig = (results) => {
  const out = new Map();
  for (const { st, alg } of results.values()) {
    const sig = signature(st);
    const cur = out.get(sig);
    if (!cur || score(alg) < score(cur.alg)) out.set(sig, { st, alg });
  }
  return out;
};
const ruBest = bestBySig(ru);
const urfBest = bestBySig(urf);

const cases = [];
for (const sig of new Set([...ruBest.keys(), ...urfBest.keys()])) {
  const a = ruBest.get(sig);
  const b = urfBest.get(sig);
  // Công thức chỉ có R, U dễ xoay hơn, nên chấp nhận dài hơn tối đa 2 lượt.
  const pick = a && (!b || len(a.alg) <= len(b.alg) + 2) ? a : b;
  cases.push(pick);
}

// Những tình huống cả góc lẫn cạnh kẹt trong khe có thể cần lời giải dài hơn độ sâu ở trên.
// Với chúng, tìm từ hai đầu (từ tình huống và từ khối đã giải) rồi ghép ở giữa.
const URF = ['U', "U'", 'U2', 'R', "R'", 'F', "F'"];
const have = new Set(cases.map((c) => signature(c.st)));
let fromSolved = null;
for (const cornerDir of [[0, 1, 0], [1, 0, 0], [0, 0, 1]])
  for (const edgeDir of [[0, 0, 1], [1, 0, 0]]) {
    const st = START.slice();
    st[REST] = idx([1, 1, 1], cornerDir);
    st[REST + 1] = idx([1, 0, 1], edgeDir);
    if (key(st) === START_KEY || have.has(signature(st))) continue;
    fromSolved = fromSolved || bfs(URF, 7);
    const fromCase = bfs(URF, 7, st);
    let best = null;
    for (const k of fromCase.parent.keys()) {
      if (!fromSolved.parent.has(k)) continue;
      const first = fromCase.pathTo(k).join(' ');
      const second = C.algToString(C.invertAlg(C.parseAlg(fromSolved.pathTo(k).join(' '))));
      const alg = C.algToString(C.parseAlg(`${first} ${second}`));
      if (!best || score(alg) < score(best)) best = alg;
    }
    if (best) cases.push({ st, alg: best });
  }

// ---- Phân nhóm và mô tả ----
const SIDE = { '1,0,0': 'sang phải', '-1,0,0': 'sang trái', '0,0,1': 'ra trước', '0,0,-1': 'ra sau' };
function describe(st) {
  const corner = facelets[st[REST]];
  const edge = facelets[st[REST + 1]];
  const cornerUp = corner.pos[1] === -1;
  const edgeUp = edge.pos[1] === -1;
  let cornerText;
  let white;
  if (corner.dir[1] === -1) white = 'up';
  else if (corner.dir[1] === 1) white = 'down';
  else white = 'side';
  if (cornerUp) cornerText = `Góc ở tầng trên, ô trắng quay ${white === 'up' ? 'lên' : SIDE[corner.dir.join()]}`;
  else cornerText = `Góc nằm trong khe, ô trắng quay ${white === 'down' ? 'xuống (đúng hướng)' : SIDE[corner.dir.join()]}`;
  let edgeText;
  if (edgeUp) edgeText = 'cạnh ở tầng trên';
  else edgeText = edge.dir[2] === 1 ? 'cạnh nằm trong khe, đúng chiều' : 'cạnh nằm trong khe, bị lật';

  let group;
  if (cornerUp && edgeUp) group = white === 'up' ? 'f2l-up' : 'f2l-side';
  else if (cornerUp) group = 'f2l-cu-es';
  else if (edgeUp) group = 'f2l-cs-eu';
  else group = 'f2l-both';
  return { group, note: `${cornerText}; ${edgeText}.` };
}

const ORDER = ['f2l-basic', 'f2l-side', 'f2l-up', 'f2l-cu-es', 'f2l-cs-eu', 'f2l-both'];
const items = cases.map((c) => ({ ...describe(c.st), alg: c.alg }));
for (const it of items) if (it.group === 'f2l-side' && len(it.alg) <= 4) it.group = 'f2l-basic';
items.sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group) || len(a.alg) - len(b.alg) || a.alg.localeCompare(b.alg));

const count = {};
for (const it of items) count[it.group] = (count[it.group] || 0) + 1;
console.log(`Tìm được ${items.length} trường hợp:`, count);
if (items.length !== 41) {
  console.error('Chưa đủ 41 trường hợp, cần tăng độ sâu tìm kiếm.');
  process.exit(1);
}

const lines = items.map((it, i) => {
  const n = String(i + 1).padStart(2, '0');
  return `    { id: 'f2l-${n}', group: '${it.group}', name: 'F2L ${i + 1}', alg: ${JSON.stringify(it.alg)}, prefix: 'z2', mask: 'pair', note: ${JSON.stringify(it.note)} },`;
});
const out = `/*
 * 41 trường hợp F2L cho khe phải phía trước (trắng ở dưới).
 * File này do tools/gen-f2l.js sinh ra, đừng sửa tay: chạy lại \`node tools/gen-f2l.js\`.
 */
(function (root) {
  'use strict';
  const list = [
${lines.join('\n')}
  ];
  root.RUBIK_F2L = list;
  if (typeof module !== 'undefined' && module.exports) module.exports = list;
})(typeof window !== 'undefined' ? window : globalThis);
`;
fs.writeFileSync(path.join(__dirname, '..', 'js', 'f2l.js'), out);
for (const it of items) console.log(it.group.padEnd(10), it.alg.padEnd(34), it.note);
