/*
 * Sinh js/sdb.js từ các trang công thức của SpeedCubeDB (https://speedcubedb.com/a/3x3).
 *
 *   mkdir sdb && cd sdb
 *   for s in F2L OLL PLL COLL WV; do curl -sL -A "Mozilla/5.0" -o $s.html https://speedcubedb.com/a/3x3/$s; done
 *   node tools/gen-sdb.js sdb
 *
 * Mỗi công thức đều được chạy thử trên khối mô phỏng: công thức nào không giải đúng tình huống của nó thì bị loại.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('../js/cube.js');

const dir = process.argv[2];
if (!dir) throw new Error('Cần thư mục chứa các tệp html đã tải.');

const SETS = [
  { key: 'f2l', file: 'F2L', kind: 'f2l' },
  { key: 'oll', file: 'OLL', kind: 'oll' },
  { key: 'pll', file: 'PLL', kind: 'pll' },
  { key: 'coll', file: 'COLL', kind: 'coll' },
  { key: 'wv', file: 'WV', kind: 'oll' },
];

const unescape = (s) => s.replace(/&#0?39;|&apos;|&rsquo;|’/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const clean = (s) => unescape(s).replace(/[()\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
const known = (s) => s.replace(/([RLUDFBMESxyzrludfb])(w?)(2?)('?)/g, '').trim() === '';

function parsePage(html) {
  const parts = html.split('<div class="row singlealgorithm g-0"').slice(1);
  return parts.map((p) => {
    const group = unescape(/data-subgroup="([^"]*)"/.exec(p)[1]);
    const name = unescape(/data-alg="([^"]*)"/.exec(p)[1]);
    const setup = /setup:<\/div>([^<]*)<\/div>/.exec(p);
    const oris = [];
    const re = /<div data-ori='(\d+)'[^>]*>([\s\S]*?)(?=<div data-ori='|$)/g;
    let m;
    while ((m = re.exec(p))) {
      const algs = [];
      const ra = /<div class="formatted-alg">([^<]*)/g;
      let a;
      while ((a = ra.exec(m[2]))) algs.push(clean(a[1]));
      oris[+m[1]] = algs;
    }
    return { name, group, setup: setup ? clean(setup[1]) : null, oris };
  });
}

// ---- Kiểm chứng ----
const base = C.applyAlg(C.createSolved(), C.parseAlg('z2')); // vàng ở trên
const Y = C.frameOf(C.applyAlg(C.createSolved(), C.parseAlg('y')));
const yPow = [0, 1, 2, 3].map((j) => {
  let m = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let i = 0; i < j; i++) m = C.matMul(Y, m);
  return m;
});
const isTop = (c) => c.home[1] === 1; // tầng vàng theo vị trí gốc
const zeros = (h) => h.filter((v) => v === 0).length;

// Trạng thái có thuộc "đích" của bộ công thức không.
function reached(kind, t) {
  const f = C.frameOf(t);
  const same = (c, r) => c.rot.join() === r.join();
  if (!t.cubies.filter((c) => !isTop(c) && zeros(c.home) < 2).every((c) => same(c, f))) return false;
  if (kind === 'f2l') return true;
  const up = C.matVec(f, [0, 1, 0]).join();
  if (!t.cubies.filter(isTop).every((c) => C.matVec(c.rot, [0, 1, 0]).join() === up)) return false;
  if (kind === 'oll') return true;
  const which = kind === 'coll' ? (c) => isTop(c) && zeros(c.home) === 0 : (c) => isTop(c) && zeros(c.home) < 2;
  return yPow.some((y) => t.cubies.filter(which).every((c) => same(c, C.matMul(f, y))));
}
// Các khe (x, z theo hướng đang cầm) đã có đủ góc và cạnh đúng chỗ; và chữ thập đáy có nguyên vẹn không.
function f2lStatus(t) {
  const f = C.frameOf(t);
  const back = C.transpose(f);
  const slots = new Set(['1,1', '-1,1', '-1,-1', '1,-1']);
  let cross = true;
  for (const c of t.cubies) {
    if (isTop(c) || zeros(c.home) === 2 || c.rot.join() === f.join()) continue;
    const at = C.matVec(f, c.home); // chỗ đúng của viên này theo hướng đang cầm
    if (at[0] && at[2]) slots.delete(at[0] + ',' + at[2]);
    else cross = false;
  }
  return { slots, cross };
}
const caseOf = (alg) => C.applyAlg(C.clone(base), C.invertAlg(C.parseAlg(alg)));
const solves = (kind, start, alg) => reached(kind, C.applyAlg(C.clone(start), C.parseAlg(alg)));

const SLOT = { '1,1': 'FR', '-1,1': 'FL', '-1,-1': 'BL', '1,-1': 'BR' };
// Khe mà công thức giải, tính theo hướng cầm lúc bắt đầu công thức.
function slotOf(alg) {
  const open = f2lStatus(caseOf(alg)).slots;
  return Object.keys(SLOT).filter((k) => !open.has(k)).map((k) => SLOT[k]).join('+');
}

const out = { source: 'https://speedcubedb.com/a/3x3', sets: {} };
let total = 0;
let dropped = 0;
for (const set of SETS) {
  const cases = parsePage(fs.readFileSync(path.join(dir, set.file + '.html'), 'utf8'));
  const list = [];
  for (const c of cases) {
    let usedSetup = false;
    const oris = c.oris.map((algs, ori) => {
      const ok = algs.filter((a) => known(a) && C.parseAlg(a).length);
      // Mốc so sánh: tình huống dựng từ chuỗi "setup" của trang (chỉ có cho hướng đầu tiên), nếu không thì lấy
      // tình huống mà nhiều công thức cùng giải được nhất.
      let ref = null;
      if (ori === 0 && c.setup && known(c.setup)) {
        const s = C.applyAlg(C.clone(base), C.parseAlg(c.setup));
        if (ok.some((a) => solves(set.kind, s, a))) ref = s;
        usedSetup = !!ref;
      }
      if (!ref) {
        let best = -1;
        for (const a of ok) {
          const s = caseOf(a);
          const n = ok.filter((b) => solves(set.kind, s, b)).length;
          if (n > best) {
            best = n;
            ref = s;
          }
        }
      }
      const good = ok.filter((a) => solves(set.kind, ref, a));
      dropped += algs.length - good.length;
      if (good.length < algs.length) console.log(`  loại ${algs.length - good.length} công thức ở ${c.name} (hướng ${ori}):`, algs.filter((a) => !good.includes(a)).join(' | '));
      return [...new Set(good)];
    });
    if (!oris[0] || !oris[0].length) {
      console.log('  BỎ cả trường hợp', c.name);
      continue;
    }
    total += oris.reduce((n, a) => n + a.length, 0);
    if (!usedSetup) console.log('  không dùng được setup của', c.name);
    list.push(usedSetup ? { n: c.name, g: c.group, s: c.setup, a: oris } : { n: c.name, g: c.group, a: oris });
  }
  out.sets[set.key] = list;
  const slots = set.key === 'f2l' ? [0, 1, 2, 3].map((o) => [...new Set(list.map((c) => slotOf(c.a[o][0])))].join('/')) : null;
  console.log(set.key, list.length, 'trường hợp', slots ? 'khe theo hướng: ' + slots.join(', ') : '');
}
console.log('Tổng', total, 'công thức, loại', dropped);

const body = JSON.stringify(out).replace(/\{"n"/g, '\n{"n"');
fs.writeFileSync(
  path.join(__dirname, '../js/sdb.js'),
  `/* Do tools/gen-sdb.js sinh ra từ ${out.source} - đừng sửa tay. */\n(function (root) {\n  const data = ${body};\n  root.RUBIK_SDB = data;\n  if (typeof module !== 'undefined' && module.exports) module.exports = data;\n})(typeof window !== 'undefined' ? window : globalThis);\n`
);
