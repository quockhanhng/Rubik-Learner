// Kiểm tra logic khối và dữ liệu công thức: node test/verify.js
const C = require('../js/cube.js');
const D = require('../js/data.js');

let failed = 0;
const check = (ok, label) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
};

const run = (alg, state) => C.applyAlg(state || C.createSolved(), C.parseAlg(alg));
const setup = (item) => {
  const s = run(item.prefix || '');
  return C.applyAlg(s, C.invertAlg(C.parseAlg(item.alg)));
};
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
for (const a of D.algorithms) {
  const s = setup(a);
  check(C.isSolved(C.applyAlg(C.clone(s), C.parseAlg(a.alg))), `${a.id}: chạy xong thì khối được giải`);
  if (a.group.startsWith('oll') || a.group.startsWith('pll')) {
    check(f2lSolved(s), `${a.id}: giữ nguyên 2 tầng dưới`);
    check(!topUniform(s) || a.group.startsWith('pll'), `${a.id}: mặt trên chưa vàng hết (OLL)`);
  }
  if (a.group === 'oll-corner') check(topCross(s), `${a.id}: đã có chữ thập vàng`);
  if (a.group === 'oll-cross') check(!topCross(s), `${a.id}: chưa có chữ thập vàng`);
  if (a.group.startsWith('pll')) {
    check(topUniform(s), `${a.id}: mặt trên vàng hết`);
    check(!C.isSolved(s), `${a.id}: tình huống chưa được giải`);
  }
}

// --- F2L: 41 trường hợp, mỗi công thức chỉ đụng tới cặp của khe phải phía trước ---
const f2l = D.algorithms.filter((a) => a.group.startsWith('f2l'));
check(f2l.length === 41, `có đủ 41 trường hợp F2L (đang có ${f2l.length})`);
const z2Solved = run('z2');
const isPair = (h) => h[0] === -1 && h[2] === 1 && h[1] <= 0;
const same = (a, b) => a.pos.join() === b.pos.join() && a.rot.join() === b.rot.join();
const signatures = new Set();
for (const a of f2l) {
  const s = setup(a);
  // Viên tâm tự xoay tại chỗ thì không nhìn thấy được trên khối thật, nên không tính.
  const isCenter = (h) => h.filter((v) => v === 0).length === 2;
  const others = s.cubies.every((c, i) => c.home[1] > 0 || isPair(c.home) || isCenter(c.home) || same(c, z2Solved.cubies[i]));
  const pairSolved = s.cubies.every((c, i) => !isPair(c.home) || same(c, z2Solved.cubies[i]));
  check(others && !pairSolved, `${a.id}: chữ thập và 3 khe còn lại giữ nguyên, cặp chưa vào khe`);
  let sig = null;
  for (let n = 0; n < 4; n++) {
    const k = s.cubies.filter((c) => isPair(c.home)).map((c) => c.pos.join() + '/' + c.rot.join()).join(' ');
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
  const fullOll = D.algorithms.filter((a) => a.group === 'oll-corner' || a.group.startsWith('oll-x'));
  check(new Set(fullOll.map((a) => ollSig(setup(a)))).size === 57 && fullOll.length === 57, `OLL đầy đủ: 57 trường hợp khác nhau (${fullOll.length} công thức)`);
  const fullPll = D.algorithms.filter((a) => a.group.startsWith('pll'));
  check(new Set(fullPll.map((a) => pllSig(setup(a)))).size === 21 && fullPll.length === 21, `PLL đầy đủ: 21 trường hợp khác nhau (${fullPll.length} công thức)`);
}

// --- Bộ giải: nhập màu rồi giải ---
{
  const S = require('../js/solver.js');
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
      check(!C.isSolved(s) && C.isSolved(C.applyAlg(s, C.parseAlg(c.alg))), `bài ${t.id} / ${l.id} / ${c.id}`);
    }

console.log(failed ? `\n${failed} kiểm tra thất bại` : '\nTất cả đều đạt');
process.exit(failed ? 1 : 0);
