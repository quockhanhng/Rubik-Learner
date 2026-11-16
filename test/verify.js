// Kiểm tra logic khối và dữ liệu công thức: node test/verify.js
const C = require('../js/cube.js');
const D = require('../js/data.js');
const S = require('../js/solver.js');
const T = require('../js/track.js');

let failed = 0;
const check = (ok, label) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
};

const run = (alg, state) => C.applyAlg(state || C.createSolved(), C.parseAlg(alg));
// Tình huống trước khi xoay công thức, dựng giống như app: từ chuỗi setup của trường hợp nếu có, không thì chạy
// ngược công thức; lúc bắt đầu khối luôn được cầm theo đúng prefix.
const setup = (item, from) => {
  const base = run(item.prefix || '');
  if (item.setup && !from) return S.stateAfter(C.parseAlg(item.setup), base);
  return S.stateAfter(C.invertAlg(C.parseAlg(from || item.alg)), base);
};
const zeros = (h) => h.filter((v) => v === 0).length;
const isTop = (c) => c.home[1] === 1; // tầng vàng
// Đích của từng bộ công thức, không phụ thuộc hướng cầm khối lúc xoay xong.
function reached(kind, t) {
  if (!kind) return C.isSolved(t);
  const f = C.frameOf(t);
  const sameRot = (c, r) => c.rot.join() === r.join();
  if (!t.cubies.filter((c) => !isTop(c) && zeros(c.home) < 2).every((c) => sameRot(c, f))) return false;
  if (kind === 'f2l') return true;
  const up = C.matVec(f, [0, 1, 0]).join();
  if (!t.cubies.filter(isTop).every((c) => C.matVec(c.rot, [0, 1, 0]).join() === up)) return false;
  if (kind === 'oll' || kind === 'wv') return true;
  const y = C.frameOf(run('y'));
  const which = kind === 'coll' ? (c) => isTop(c) && zeros(c.home) === 0 : (c) => isTop(c) && zeros(c.home) < 2;
  let turn = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let j = 0; j < 4; j++) {
    if (t.cubies.filter(which).every((c) => sameRot(c, C.matMul(f, turn)))) return true;
    turn = C.matMul(y, turn);
  }
  return false;
}
const at = (s, pos, dir) => {
  const st = C.stickerAt(s, pos, dir);
  return st ? st.face : null;
};

// Hai tầng dưới (y = 0 và y = 1) đã giải: ô bên hông khớp tâm, mặt đáy đồng màu.
function f2lSolved(s) {
  const sides = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
  for (const dir of sides) {
    const k = dir[0] !== 0 ? 0 : 2;
    const other = k === 0 ? 2 : 0;
    const centerPos = [0, 0, 0];
    centerPos[k] = dir[k];
    const center = at(s, centerPos, dir);
    for (const y of [0, 1])
      for (const a of [-1, 0, 1]) {
        const pos = [0, y, 0];
        pos[k] = dir[k];
        pos[other] = a;
        if (at(s, pos, dir) !== center) return false;
      }
  }
  const bottom = C.faceStickers(s, [0, 1, 0]);
  return bottom.every((x) => x && x.face === bottom[0].face);
}
const topFaces = (s) => C.faceStickers(s, [0, -1, 0]).map((x) => x.face);
const topUniform = (s) => topFaces(s).every((f) => f === 'D');
const topCross = (s) =>
  [[0, -1, -1], [0, -1, 1], [-1, -1, 0], [1, -1, 0]].every((p) => at(s, p, [0, -1, 0]) === 'D');

// --- Logic cơ bản ---
check(C.isSolved(C.createSolved()), 'khối mới là khối đã giải');
for (const m of ['R', 'L', 'U', 'D', 'F', 'B', 'M', 'E', 'S', 'r', 'l', 'u', 'd', 'f', 'b', 'x', 'y', 'z']) {
  check(C.isSolved(run(`${m} ${m} ${m} ${m}`)), `${m} x4 trở về ban đầu`);
  check(C.isSolved(run(`${m} ${m}'`)), `${m} ${m}' triệt tiêu`);
}
check(C.isSolved(run(Array(6).fill("R U R' U'").join(' '))), "(R U R' U') x6 trở về ban đầu");
check(!C.isSolved(run("R U R' U'")), "R U R' U' làm khối thay đổi");
check(C.isSolved(run("r R' M")), 'r = R + M\'');
check(C.isSolved(run('Rw r\'')), 'Rw giống r');
check(C.isSolved(run('x y z y\' x\' z z\' y x y\' x\'')) || true, 'xoay cả khối không lỗi');
check(C.isSolved(run('z2')), 'z2 vẫn là khối đã giải');

// Chiều xoay: sau R, ô ở mặt trước (xanh lá) đi lên mặt trên.
check(at(run('R'), [1, -1, 0], [0, -1, 0]) === 'F', 'R: mặt trước đi lên trên');
check(at(run('U'), [-1, -1, 0], [-1, 0, 0]) === 'F', 'U: mặt trước đi sang trái');
check(at(run('F'), [1, 0, 1], [1, 0, 0]) === 'U', 'F: mặt trên đi sang phải');
check(at(run('L'), [-1, 1, 0], [0, 1, 0]) === 'F', 'L: mặt trước đi xuống dưới');
check(at(run('D'), [1, 1, 0], [1, 0, 0]) === 'F', 'D: mặt trước đi sang phải');
check(at(run('B'), [-1, 0, -1], [-1, 0, 0]) === 'U', 'B: mặt trên đi sang trái');

const scr = C.randomScramble(20);
check(C.parseAlg(scr).length === 20, `scramble có 20 lượt: ${scr}`);

// --- Thư viện công thức ---
check(new Set(D.algorithms.map((a) => a.id)).size === D.algorithms.length, 'thư viện: không có id trùng nhau');
check(D.algorithms.every((a) => D.groups.some((g) => g.id === a.group) && D.families.some((f) => f.id === a.family)), 'thư viện: mục nào cũng thuộc một nhóm và một họ');

// Các mục viết tay (tổ hợp cơ bản, OLL / PLL 2 bước).
for (const a of D.algorithms.filter((x) => !x.alts)) {
  const s = setup(a);
  check(C.isSolved(C.applyAlg(C.clone(s), C.parseAlg(a.alg))), `${a.id}: chạy xong thì khối được giải`);
  if (a.kind === 'oll' || a.kind === 'pll') {
    check(f2lSolved(s), `${a.id}: giữ nguyên 2 tầng dưới`);
    check(!topUniform(s) || a.kind === 'pll', `${a.id}: mặt trên chưa vàng hết (OLL)`);
  }
  if (a.group === 'oll-corner') check(topCross(s), `${a.id}: đã có chữ thập vàng`);
  if (a.group === 'oll-cross') check(!topCross(s), `${a.id}: chưa có chữ thập vàng`);
  if (a.kind === 'pll') {
    check(topUniform(s), `${a.id}: mặt trên vàng hết`);
    check(!C.isSolved(s), `${a.id}: tình huống chưa được giải`);
  }
}

// Các bộ đầy đủ: mọi cách xoay của một trường hợp đều giải đúng cùng một tình huống.
const z2Solved = run('z2');
const same = (a, b) => a.pos.join() === b.pos.join() && a.rot.join() === b.rot.join();
const SLOT_HOME = { FR: [-1, 1], FL: [1, 1], BL: [1, -1], BR: [-1, -1] }; // (x, z) theo vị trí gốc, sau khi lật z2
const inSlot = (h, slot) => h[0] === SLOT_HOME[slot][0] && h[2] === SLOT_HOME[slot][1] && h[1] <= 0;
{
  const sets = {};
  let algCount = 0;
  for (const a of D.algorithms.filter((x) => x.alts)) {
    sets[a.family] = (sets[a.family] || 0) + 1;
    const lists = a.slots ? a.slots.map((s) => ({ slot: s.id, algs: s.algs })) : [{ slot: null, algs: a.alts }];
    let ok = a.alts.includes(a.alg) && lists[0].algs === a.alts;
    for (const { slot, algs } of lists) {
      const start = slot && slot !== 'FR' ? setup(a, algs[0]) : setup(a);
      algCount += algs.length;
      ok = ok && !reached(a.kind, start) && C.frameOf(start).join() === C.frameOf(z2Solved).join();
      for (const alg of algs) ok = ok && reached(a.kind, C.applyAlg(C.clone(start), C.parseAlg(alg)));
      if (slot) {
        // Chữ thập và 3 khe còn lại nguyên vẹn, chỉ cặp của đúng khe đó chưa vào chỗ.
        const isCenter = (h) => zeros(h) === 2;
        ok = ok && start.cubies.every((c, i) => c.home[1] > 0 || inSlot(c.home, slot) || isCenter(c.home) || same(c, z2Solved.cubies[i]));
        ok = ok && !start.cubies.every((c, i) => !inSlot(c.home, slot) || same(c, z2Solved.cubies[i]));
      }
    }
    check(ok, `${a.id}: ${lists.reduce((n, l) => n + l.algs.length, 0)} cách xoay đều giải đúng tình huống`);
  }
  check(sets.f2l === 41 && sets.oll === 57 && sets.pll === 21 && sets.coll === 40 && sets.wv === 27, `đủ bộ: F2L ${sets.f2l}/41, OLL ${sets.oll}/57, PLL ${sets.pll}/21, COLL ${sets.coll}/40, WV ${sets.wv}/27`);
  check(algCount > 1100, `tổng cộng ${algCount} cách xoay trong các bộ đầy đủ`);
}

// --- F2L: 41 trường hợp khác nhau ---
const f2l = D.algorithms.filter((a) => a.family === 'f2l');
const signatures = new Set();
for (const a of f2l) {
  const s = setup(a);
  let sig = null;
  for (let n = 0; n < 4; n++) {
    const k = s.cubies.filter((c) => inSlot(c.home, 'FR')).map((c) => c.pos.join() + '/' + c.rot.join()).join(' ');
    if (sig === null || k < sig) sig = k;
    run('U', s);
  }
  signatures.add(sig);
}
check(signatures.size === 41, `41 trường hợp F2L không trùng nhau (${signatures.size} trường hợp khác nhau)`);

// --- Bộ OLL / PLL đầy đủ: đủ 57 và 21 trường hợp khác nhau ---
{
  const face = (s, p, d) => C.stickerAt(s, p, d).face;
  const ring = (s) => [
    ...[-1, 0, 1].map((x) => face(s, [x, -1, -1], [0, 0, -1])), ...[-1, 0, 1].map((z) => face(s, [1, -1, z], [1, 0, 0])),
    ...[1, 0, -1].map((x) => face(s, [x, -1, 1], [0, 0, 1])), ...[1, 0, -1].map((z) => face(s, [-1, -1, z], [-1, 0, 0])),
  ];
  const top = (s) => [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].map(([x, z]) => face(s, [x, -1, z], [0, -1, 0]));
  const rot = (a, n) => [...a.slice(n), ...a.slice(0, n)];
  const least = (list) => list.sort()[0];
  const ollSig = (s) => {
    const r = ring(s).map((f) => +(f === 'D'));
    const t = top(s).map((f) => +(f === 'D'));
    return least([0, 1, 2, 3].map((k) => rot(r, 3 * k).join('') + rot(t, 2 * k).join('')));
  };
  const pllSig = (s) => {
    const cyc = [face(s, [0, 0, -1], [0, 0, -1]), face(s, [1, 0, 0], [1, 0, 0]), face(s, [0, 0, 1], [0, 0, 1]), face(s, [-1, 0, 0], [-1, 0, 0])];
    const out = [];
    for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) out.push(rot(ring(s), 3 * k).map((f) => (cyc.indexOf(f) + j) % 4).join(''));
    return least(out);
  };
  const fullOll = D.algorithms.filter((a) => a.family === 'oll');
  check(new Set(fullOll.map((a) => ollSig(setup(a)))).size === 57 && fullOll.length === 57, `OLL đầy đủ: 57 trường hợp khác nhau (${fullOll.length} trường hợp)`);
  const fullPll = D.algorithms.filter((a) => a.family === 'pll');
  check(new Set(fullPll.map((a) => pllSig(setup(a)))).size === 21 && fullPll.length === 21, `PLL đầy đủ: 21 trường hợp khác nhau (${fullPll.length} trường hợp)`);
  // Mỗi trường hợp 2 bước cũng nằm trong bộ đầy đủ.
  const ollAll = new Set(fullOll.map((a) => ollSig(setup(a))));
  const pllAll = new Set(fullPll.map((a) => pllSig(setup(a))));
  const two = D.algorithms.filter((a) => a.family === 'two' && a.group !== 'oll-cross');
  check(two.every((a) => (a.kind === 'oll' ? ollAll.has(ollSig(setup(a))) : pllAll.has(pllSig(setup(a))))), 'các trường hợp 2 bước đều có trong bộ đầy đủ');
}

// --- Bộ giải: nhập màu rồi giải ---
{
  const solver = S.createSolver(D.algorithms);
  let ok = 0, total = 0, longest = 0;
  const N = 400;
  for (let i = 0; i < N; i++) {
    const s = run(C.randomScramble(25));
    const back = S.stateFromFacelets(S.faceletsFromState(s));
    // So bằng màu từng ô (viên tâm tự xoay tại chỗ không tạo khác biệt nhìn thấy được).
    if (back.error || JSON.stringify(S.faceletsFromState(back.state)) !== JSON.stringify(S.faceletsFromState(s))) continue;
    const sol = solver.solve(back.state);
    if (sol.error) continue;
    const end = C.clone(s);
    for (const st of sol.steps) C.applyAlg(end, st.moves);
    if (!C.isSolved(end)) continue;
    ok++;
    total += sol.total;
    longest = Math.max(longest, sol.total);
  }
  check(ok === N, `bộ giải: giải được ${ok}/${N} khối xáo ngẫu nhiên (trung bình ${(total / Math.max(ok, 1)).toFixed(1)} lượt, dài nhất ${longest})`);
  check(solver.solve(C.createSolved()).total === 0, 'bộ giải: khối đã giải thì không cần lượt nào');

  // Khối cầm theo hướng bất kỳ vẫn giải được.
  let turned = 0;
  for (let i = 0; i < 60; i++) {
    const s = run(C.randomScramble(25) + ' ' + ['x', "z'", 'y x2', "x' y", 'z y2', 'y'][i % 6]);
    const sol = solver.solve(s);
    if (!sol.error && C.isSolved(sol.steps.reduce((e, st) => C.applyAlg(e, st.moves), C.clone(s)))) turned++;
  }
  check(turned === 60, `bộ giải: giải được ${turned}/60 khối đang cầm theo hướng bất kỳ`);

  // Bộ giải dùng đúng cách xoay mà người dùng đã chọn cho từng trường hợp.
  {
    const pick = {};
    const picky = S.createSolver(D.algorithms, { prefer: (id) => pick[id] });
    let used = 0, tried = 0;
    for (const a of D.algorithms.filter((x) => ['f2l', 'oll', 'pll'].includes(x.family)))
      for (const alg of a.alts) {
        if (!S.keepsTop(C.parseAlg(alg))) continue;
        tried++;
        pick[a.id] = alg;
        const sol = picky.solve(setup(a));
        if (!sol.error && sol.steps.some((st) => st.caseId === a.id && st.alg === alg)) used++;
      }
    check(used === tried, `bộ giải: dùng đúng cách xoay đã chọn trong ${used}/${tried} lần`);
  }

  const net = S.faceletsFromState(run("R U R' U' F2 D L'"));
  const blank = JSON.parse(JSON.stringify(net));
  blank.F[0] = null;
  check(/chưa tô/.test(S.stateFromFacelets(blank).error || ''), 'nhập màu: báo lỗi khi còn ô trống');
  const dup = JSON.parse(JSON.stringify(net));
  dup.F[0] = dup.F[0] === 'R' ? 'L' : 'R';
  check(!!S.stateFromFacelets(dup).error, 'nhập màu: báo lỗi khi số ô mỗi màu không đúng');

  // Lật một cạnh, xoay một góc, tráo hai cạnh: đều là khối không giải được.
  const flipped = S.faceletsFromState(C.createSolved());
  [flipped.U[7], flipped.F[1]] = [flipped.F[1], flipped.U[7]];
  const twisted = S.faceletsFromState(C.createSolved());
  [twisted.U[8], twisted.F[2], twisted.R[0]] = [twisted.F[2], twisted.R[0], twisted.U[8]];
  const swapped = S.faceletsFromState(C.createSolved());
  [swapped.U[7], swapped.U[5]] = [swapped.U[5], swapped.U[7]];
  [swapped.F[1], swapped.R[1]] = [swapped.R[1], swapped.F[1]];
  for (const [label, bad] of [['cạnh bị lật', flipped], ['góc bị xoay', twisted], ['hai cạnh bị tráo', swapped]]) {
    const st = S.stateFromFacelets(bad);
    check(!st.error && !!solver.solve(st.state).error, `bộ giải: báo lỗi với khối có ${label}`);
  }
}

// --- Quét camera: phân loại màu từ mẫu RGB giả lập (ánh sáng lệch từng mặt, ám vàng, nhiễu) ---
{
  const S = require('../js/solver.js');
  const Scan = require('../js/scan.js');
  const PALETTE = { U: [245, 245, 245], D: [255, 213, 0], F: [0, 155, 72], B: [0, 70, 173], R: [183, 18, 52], L: [255, 88, 0] };
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const trial = (noise, warm) => {
    const net = S.faceletsFromState(run(C.randomScramble(25)));
    const samples = {};
    for (const f of S.FACES) {
      const gain = 0.55 + Math.random() * 0.55; // mỗi mặt sáng tối khác nhau
      samples[f] = net[f].map((c) => {
        const cell = gain * (0.9 + Math.random() * 0.2); // bóng đổ lệch nhẹ trong cùng một mặt
        return PALETTE[c].map((v, k) => clamp(v * cell * [1 + warm, 1, 1 - warm * 2][k] + (Math.random() * 2 - 1) * noise));
      });
    }
    return JSON.stringify(Scan.classify(samples)) === JSON.stringify(net);
  };
  const rate = (noise, warm) => {
    let ok = 0;
    for (let i = 0; i < 200; i++) if (trial(noise, warm)) ok++;
    return ok;
  };
  const clean = rate(6, 0.03);
  const harsh = rate(14, 0.08);
  check(clean === 200, `quét camera: nhận đúng cả 54 ô trong ${clean}/200 lần (ánh sáng lệch nhẹ)`);

  // Quét tự do: 6 mặt theo thứ tự bất kỳ, mỗi mặt xoay ngẫu nhiên. Phải nhận ra từng mặt và dựng lại đúng khối.
  const solverForScan = S.createSolver(D.algorithms);
  let free = 0, unsure = 0;
  const t0 = Date.now();
  const FREE_N = 150;
  for (let n = 0; n < FREE_N; n++) {
    const net = S.faceletsFromState(run(C.randomScramble(25)));
    const shots = S.FACES.map((f) => {
      const gain = 0.6 + Math.random() * 0.5;
      let colors = net[f];
      for (let k = Math.floor(Math.random() * 4); k > 0; k--) colors = S.rotateFace(colors);
      return colors.map((c) => PALETTE[c].map((v, k) => clamp(v * gain * (0.92 + Math.random() * 0.16) * [1.04, 1, 0.92][k] + (Math.random() * 2 - 1) * 8)));
    });
    shots.sort(() => Math.random() - 0.5);
    const found = S.resolveOrientation(Scan.classify(Scan.identify(shots)), solverForScan);
    if (found.ambiguous) unsure++;
    // Hiếm khi có hơn một cách ghép hợp lệ; khi đó khối đúng phải nằm trong danh sách để người dùng chọn.
    if (found.exact && found.candidates.some((c) => JSON.stringify(c) === JSON.stringify(net))) free++;
  }
  check(free === FREE_N, `quét tự do: dựng lại đúng khối trong ${free}/${FREE_N} lần (${unsure} lần có hơn một cách ghép, ${Math.round((Date.now() - t0) / FREE_N)} ms mỗi lần)`);
  const solvedNet = S.faceletsFromState(C.createSolved());
  check(S.resolveOrientation(solvedNet, solverForScan).exact, 'quét tự do: khối đã giải vẫn ghép được');
  check(harsh >= 190, `quét camera: nhận đúng cả 54 ô trong ${harsh}/200 lần (ám vàng mạnh, nhiễu lớn)`);
}

// --- In hình mặt trên của từng tình huống để soát bằng mắt ---
const ch = (f) => ({ D: 'Y', U: 'W', F: 'G', B: 'B', R: 'R', L: 'O' }[f] || '?');
function topDiagram(s) {
  const rows = [];
  rows.push('  ' + [-1, 0, 1].map((x) => ch(at(s, [x, -1, -1], [0, 0, -1]))).join(' '));
  for (const z of [-1, 0, 1]) {
    rows.push(
      ch(at(s, [-1, -1, z], [-1, 0, 0])) + ' ' +
      [-1, 0, 1].map((x) => ch(at(s, [x, -1, z], [0, -1, 0]))).join(' ') + ' ' +
      ch(at(s, [1, -1, z], [1, 0, 0]))
    );
  }
  rows.push('  ' + [-1, 0, 1].map((x) => ch(at(s, [x, -1, 1], [0, 0, 1]))).join(' '));
  return rows.join('\n');
}
if (process.argv.includes('--diagrams')) {
  for (const a of D.algorithms) console.log(`\n${a.id}  ${a.alg}\n${topDiagram(setup(a))}`);
  for (const l of D.tracks.flatMap((t) => t.lessons))
    for (const c of l.cases) {
      const s = setup(c);
      const wrong = s.cubies.filter((q) => {
        const ref = run(c.prefix || '').cubies.find((r) => r.home === q.home || r.home.join() === q.home.join());
        return ref.pos.join() !== q.pos.join() || ref.rot.join() !== q.rot.join();
      });
      console.log(`\n${c.id}  ${c.alg}\n${topDiagram(s)}\n  viên lệch chỗ (vị trí gốc): ${wrong.map((q) => q.home.join(',')).join(' | ')}`);
    }
}

// --- Theo dõi khối qua camera: người dùng giả lập, camera chỉ thấy mặt trước ---
{
  const solver = S.createSolver(D.algorithms);
  // Viết lại một lượt xoay sau khi cả khối đã bị xoay.
  let conj = 0;
  for (const r of ['x', "y'", 'z2', 'x y', "z' x2"])
    for (const m of ['R', "U'", 'F2', 'M', 'r', "d'", 'S', 'x']) {
      const s = run(C.randomScramble(15));
      const a = run(r, run(m, C.clone(s)));
      const b = C.applyMove(run(r, C.clone(s)), C.conjugate(C.parseAlg(m)[0], C.frameOf(run(r))));
      if (a.cubies.every((c, i) => c.rot.join() === b.cubies[i].rot.join())) conj++;
    }
  check(conj === 40, `theo dõi: viết lại lượt xoay theo hướng cầm mới đúng ${conj}/40 lần`);

  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const FACE = [];
  for (const f of 'UDRLFB') for (const s of ['', "'", '2']) FACE.push(f + s);
  const TURN = ['x', "x'", 'y', "y'", 'z', "z'", 'y2', 'x2'];
  const fl = (s) => T.facelets(s).join('');
  // errors = xác suất mỗi lượt người dùng không làm theo hướng dẫn (xoay bừa một hai lượt, hoặc xoay cả khối).
  function simulate(runs, errors) {
    const out = { solved: 0, lost: 0, wrong: 0, reads: 0, moves: 0, slow: 0 };
    for (let n = 0; n < runs; n++) {
      const scanned = run(C.randomScramble(25));
      const actual = run(pick(['', 'x', 'y2 x', "z'", 'y', "x' y"]), C.clone(scanned)); // cầm theo hướng bất kỳ
      if (errors && n % 4 === 0) run(pick(FACE), actual); // có khi đã xoay thêm sau khi quét
      const g = T.createGuide(solver, scanned);
      for (let turn = 0; turn < 500; turn++) {
        const t0 = Date.now();
        const ev = g.observe(T.frontOf(T.facelets(actual)));
        out.slow = Math.max(out.slow, Date.now() - t0);
        out.reads++;
        if (ev.kind === 'lost') {
          out.lost++;
          break;
        }
        if (fl(g.state()) !== fl(actual)) out.wrong++;
        if (C.isSolved(actual) && g.done()) {
          out.solved++;
          break;
        }
        const p = g.pending();
        const r = Math.random();
        if (!p.length || (C.isSolved(actual) && !g.done())) run(pick(TURN), actual); // cho camera xem mặt khác
        else if (r < errors * 0.6) { run(pick(FACE), actual); out.moves++; }
        else if (r < errors * 0.8) run(pick(TURN), actual);
        else if (r < errors) { run(pick(FACE) + ' ' + pick(FACE), actual); out.moves += 2; }
        else {
          for (const x of p) C.applyMove(actual, x.move);
          out.moves += p.length;
          if (p.every((x) => x.hidden)) run(pick(TURN), actual);
        }
      }
    }
    return out;
  }
  const clean = simulate(40, 0);
  check(clean.solved === 40 && clean.lost === 0, `theo dõi: người dùng làm đúng hướng dẫn, cầm khối theo hướng bất kỳ: giải xong ${clean.solved}/40 (trung bình ${Math.round(clean.moves / 40)} lượt, đoán sai trạng thái ở ${clean.wrong}/${clean.reads} lần đọc)`);
  const messy = simulate(60, 0.12);
  check(messy.solved >= 56, `theo dõi: 12% số lượt người dùng xoay bừa hoặc xoay cả khối: vẫn giải xong ${messy.solved}/60, mất dấu ${messy.lost} (trung bình ${Math.round(messy.moves / 60)} lượt, đoán sai trạng thái ở ${messy.wrong}/${messy.reads} lần đọc, xử lý chậm nhất ${Math.max(clean.slow, messy.slow)} ms)`);
}

// --- Bài học ---
const whiteEdge = (h) => h[1] === -1 && h.filter((v) => v === 0).length === 1;
for (const t of D.tracks)
  for (const l of t.lessons)
    for (const c of l.cases) {
      const s = setup(c);
      if (c.mask === 'cross') {
        const ref = run(c.prefix || '');
        const moved = s.cubies.filter((q, i) => whiteEdge(q.home) && !same(q, ref.cubies[i])).length;
        check(moved === 1, `bài ${l.id} / ${c.id}: chỉ một cạnh trắng lệch chỗ`);
      }
      check(!reached(c.setup ? c.kind : null, s) && reached(c.setup ? c.kind : null, C.applyAlg(s, C.parseAlg(c.alg))), `bài ${t.id} / ${l.id} / ${c.id}`);
    }

console.log(failed ? `\n${failed} kiểm tra thất bại` : '\nTất cả đều đạt');
process.exit(failed ? 1 : 0);
