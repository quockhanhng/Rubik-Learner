/*
 * Nhập màu khối thật và giải theo kiểu CFOP: chữ thập, 4 cặp F2L, OLL, PLL.
 * Lời giải dùng đúng các công thức trong thư viện, nên mỗi đoạn đều có tên để tra lại.
 * Không phụ thuộc DOM, chạy được trong Node để test.
 */
(function (root) {
  'use strict';
  const C = root.Cube || require('./cube.js');

  const COLOR_NAME = { U: 'trắng', D: 'vàng', F: 'xanh lá', B: 'xanh dương', R: 'đỏ', L: 'cam' };
  const FACE_NAME = { U: 'trên', D: 'dưới', F: 'trước', B: 'sau', R: 'phải', L: 'trái' };

  // ---------- Hình trải của khối: ô (hàng, cột) của mỗi mặt ứng với vị trí nào ----------
  // Quy ước cầm khối: trắng ở trên, xanh lá ở trước. Mặt bên nhìn thẳng với mặt trên ở phía trên;
  // mặt trên nhìn từ trên xuống với mặt trước ở cạnh dưới; mặt dưới nhìn từ dưới lên với mặt trước ở cạnh trên.
  const NET = {
    U: { dir: [0, -1, 0], cell: (r, c) => [c - 1, -1, r - 1] },
    F: { dir: [0, 0, 1], cell: (r, c) => [c - 1, r - 1, 1] },
    R: { dir: [1, 0, 0], cell: (r, c) => [1, r - 1, 1 - c] },
    B: { dir: [0, 0, -1], cell: (r, c) => [1 - c, r - 1, -1] },
    L: { dir: [-1, 0, 0], cell: (r, c) => [-1, r - 1, c - 1] },
    D: { dir: [0, 1, 0], cell: (r, c) => [c - 1, 1, 1 - r] },
  };
  const FACES = Object.keys(NET);

  function faceletsFromState(state) {
    const out = {};
    for (const f of FACES) {
      out[f] = [];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) out[f].push(C.stickerAt(state, NET[f].cell(r, c), NET[f].dir).face);
    }
    return out;
  }

  const describePos = (pos) =>
    [pos[1] === -1 ? 'trên' : pos[1] === 1 ? 'dưới' : '', pos[2] === 1 ? 'trước' : pos[2] === -1 ? 'sau' : '', pos[0] === 1 ? 'phải' : pos[0] === -1 ? 'trái' : '']
      .filter(Boolean)
      .join(' - ');

  // Dựng trạng thái khối từ 54 ô màu. Trả về { state } hoặc { error }.
  function stateFromFacelets(net) {
    const count = {};
    const seen = new Map();
    for (const f of FACES)
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) {
          const color = net[f][r * 3 + c];
          if (!color) return { error: 'Còn ô chưa tô màu.' };
          count[color] = (count[color] || 0) + 1;
          seen.set(NET[f].cell(r, c).join() + '|' + NET[f].dir.join(), color);
        }
    for (const f of FACES) {
      if (net[f][4] !== f) return { error: 'Các ô tâm phải giữ nguyên màu.' };
      if (count[f] !== 9) return { error: `Màu ${COLOR_NAME[f]} đang có ${count[f] || 0} ô, cần đúng 9 ô.` };
    }

    const state = C.createSolved();
    const used = new Set();
    const placed = [];
    for (const target of C.createSolved().cubies) {
      const pos = target.home;
      const dirs = C.DIRS.filter((d) => d.some((v, k) => v !== 0 && pos[k] === v));
      let match = null;
      for (let i = 0; i < state.cubies.length && !match; i++) {
        if (used.has(i)) continue;
        const home = state.cubies[i].home;
        if (home.filter((v) => v !== 0).length !== dirs.length) continue;
        const normals = C.DIRS.filter((d) => d.some((v, k) => v !== 0 && home[k] === v));
        for (const rot of C.ROTATIONS) {
          if (C.matVec(rot, home).join() !== pos.join()) continue;
          if (normals.every((n) => seen.get(pos.join() + '|' + C.matVec(rot, n).join()) === C.faceOf(n))) {
            match = { i, rot };
            break;
          }
        }
      }
      if (!match) {
        const colors = dirs.map((d) => COLOR_NAME[seen.get(pos.join() + '|' + d.join())]).join(', ');
        return { error: `Viên ở vị trí ${describePos(pos)} có các màu ${colors}: không có viên nào như vậy, hoặc viên đó đã xuất hiện ở chỗ khác.` };
      }
      used.add(match.i);
      placed.push({ i: match.i, pos, rot: match.rot });
    }
    for (const p of placed) {
      state.cubies[p.i].pos = p.pos.slice();
      state.cubies[p.i].rot = p.rot.map((r) => r.slice());
    }
    return { state };
  }

  // ---------- Tiện ích ----------
  const samePlace = (a, b) => a.pos.join() === b.pos.join() && a.rot.join() === b.rot.join();
  const rel = (c, r) => c.pos.join() + '/' + C.matMul(c.rot, C.transpose(r.rot)).join();
  const zeros = (h) => h.filter((v) => v === 0).length;

  // Vòng 12 ô bên hông và 8 ô mặt trên của tầng trên, đọc theo chiều kim đồng hồ nhìn từ trên.
  const face = (s, p, d) => C.stickerAt(s, p, d).face;
  const sideRing = (s) => [
    ...[-1, 0, 1].map((x) => face(s, [x, -1, -1], [0, 0, -1])),
    ...[-1, 0, 1].map((z) => face(s, [1, -1, z], [1, 0, 0])),
    ...[1, 0, -1].map((x) => face(s, [x, -1, 1], [0, 0, 1])),
    ...[1, 0, -1].map((z) => face(s, [-1, -1, z], [-1, 0, 0])),
  ];
  const TOP_RING = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
  const topRing = (s) => TOP_RING.map(([x, z]) => face(s, [x, -1, z], [0, -1, 0]));
  const topColor = (s) => face(s, [0, -1, 0], [0, -1, 0]);
  const ollKey = (s) => {
    const up = topColor(s);
    return sideRing(s).map((f) => (f === up ? 1 : 0)).join('') + topRing(s).map((f) => (f === up ? 1 : 0)).join('');
  };
  const pllKey = (s, shift) => {
    const cycle = [face(s, [0, 0, -1], [0, 0, -1]), face(s, [1, 0, 0], [1, 0, 0]), face(s, [0, 0, 1], [0, 0, 1]), face(s, [-1, 0, 0], [-1, 0, 0])];
    return sideRing(s).map((f) => (cycle.indexOf(f) + shift) % 4).join('');
  };
  const topDone = (s) => topRing(s).every((f) => f === topColor(s));

  // ---------- Bảng 54 ô màu để tìm chữ thập bằng duyệt theo chiều rộng ----------
  const faceletIndex = new Map();
  for (const c of C.createSolved().cubies)
    for (const d of C.DIRS) if (d.some((v, k) => v !== 0 && c.home[k] === v)) faceletIndex.set(c.home.join() + '|' + d.join(), faceletIndex.size);
  const fidx = (pos, dir) => faceletIndex.get(pos.join() + '|' + dir.join());
  const FACE_MOVES = [];
  for (const f of ['U', 'D', 'R', 'L', 'F', 'B']) for (const s of ['', "'", '2']) FACE_MOVES.push(f + s);
  let tables = null;
  function moveTables() {
    if (tables) return tables;
    tables = FACE_MOVES.map((name) => {
      const s = C.applyAlg(C.createSolved(), C.parseAlg(name));
      const t = new Array(54);
      for (const c of s.cubies)
        for (const d of C.DIRS) if (d.some((v, k) => v !== 0 && c.home[k] === v)) t[fidx(c.home, d)] = fidx(c.pos, C.matVec(c.rot, d));
      return t;
    });
    return tables;
  }

  // Lời giải ngắn nhất cho chữ thập ở mặt dưới (4 cạnh có màu của tâm mặt dưới).
  function solveCross(s, ref) {
    const t = moveTables();
    const ids = [];
    ref.cubies.forEach((c, i) => {
      if (zeros(c.home) === 1 && c.pos[1] === 1) ids.push(i);
    });
    // Ô được theo dõi: ô quay xuống dưới khi viên nằm đúng chỗ.
    const normal = (i) => C.matVec(C.transpose(ref.cubies[i].rot), [0, 1, 0]);
    const start = ids.map((i) => fidx(s.cubies[i].pos, C.matVec(s.cubies[i].rot, normal(i))));
    const goal = String.fromCharCode(...ids.map((i) => fidx(ref.cubies[i].pos, [0, 1, 0])));
    const startKey = String.fromCharCode(...start);
    if (startKey === goal) return [];
    const parent = new Map([[startKey, null]]);
    let frontier = [{ st: start, key: startKey, last: '' }];
    for (let depth = 1; depth <= 9 && frontier.length; depth++) {
      const next = [];
      for (const node of frontier)
        for (let m = 0; m < t.length; m++) {
          if (FACE_MOVES[m][0] === node.last) continue;
          const st = node.st.map((f) => t[m][f]);
          const key = String.fromCharCode(...st);
          if (parent.has(key)) continue;
          parent.set(key, [node.key, m]);
          if (key === goal) {
            const seq = [];
            let cur = key;
            while (parent.get(cur)) {
              const [pk, mv] = parent.get(cur);
              seq.push(FACE_MOVES[mv]);
              cur = pk;
            }
            return C.parseAlg(seq.reverse().join(' '));
          }
          next.push({ st, key, last: FACE_MOVES[m][0] });
        }
      frontier = next;
    }
    return null;
  }

  // ---------- Bộ giải ----------
  // Khối đã giải, cầm theo đúng hướng của `s` (dùng làm mốc so sánh từng viên).
  function refFor(s) {
    const f = C.frameOf(s);
    const ref = C.createSolved();
    for (const c of ref.cubies) {
      c.rot = f.map((r) => r.slice());
      c.pos = C.matVec(f, c.home);
    }
    return ref;
  }
  // Lượt xoay có kéo theo lớp giữa thì các tâm cũng đổi chỗ: xoay mốc theo.
  const turnRef = (ref, m) => {
    if (m.layers.includes(0)) C.applyMove(ref, { axis: m.axis, layers: [-1, 0, 1], turns: m.turns });
  };
  // Chạy `moves` từ một khối đã giải, chọn hướng cầm ban đầu sao cho chạy xong thì các tâm nằm đúng hướng của `like`.
  // Dùng để dựng tình huống cho công thức có lượt xoay cả khối: lúc bắt đầu công thức, khối luôn được cầm như `like`.
  function stateAfter(moves, like) {
    const net = C.frameOf(C.applyAlg(C.createSolved(), moves));
    const f0 = C.matMul(C.transpose(net), C.frameOf(like));
    const s = C.createSolved();
    for (const c of s.cubies) {
      c.rot = f0.map((r) => r.slice());
      c.pos = C.matVec(f0, c.home);
    }
    return C.applyAlg(s, moves);
  }

  // Bộ giải chỉ dùng công thức mà sau khi xoay xong mặt trên vẫn ở trên.
  const keepsTop = (moves) => C.matVec(C.frameOf(C.applyAlg(C.createSolved(), moves)), [0, 1, 0]).join() === '0,1,0';

  // algorithms: các mục trong thư viện. Mục có `kind` là f2l / oll / pll được dùng để giải; mỗi mục có thể có
  // nhiều cách (alts). opts.prefer(id) trả về công thức người dùng đã chọn cho trường hợp đó (nếu có).
  function createSolver(algorithms, opts) {
    const prefer = (opts && opts.prefer) || (() => null);
    const base = C.applyAlg(C.createSolved(), C.parseAlg('z2'));
    const setup = (alg) => stateAfter(C.invertAlg(C.parseAlg(alg)), base);

    const pairIndex = (ref, x, z) => ({
      ci: ref.cubies.findIndex((c) => c.pos.join() === [x, 1, z].join()),
      ei: ref.cubies.findIndex((c) => c.pos.join() === [x, 0, z].join()),
    });
    const frPair = pairIndex(base, 1, 1);
    const pairKey = (s, ref, p) => rel(s.cubies[p.ci], ref.cubies[p.ci]) + ' ' + rel(s.cubies[p.ei], ref.cubies[p.ei]);

    const f2lTable = new Map();
    const ollTable = new Map();
    const pllTable = new Map();
    const put = (map, key, entry) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    };
    for (const a of algorithms) {
      if (!['f2l', 'oll', 'pll'].includes(a.kind)) continue;
      for (const alg of a.alts || [a.alg]) {
        const moves = C.parseAlg(alg);
        if (!keepsTop(moves)) continue;
        const s = setup(alg);
        const entry = { id: a.id, name: a.name, alg, len: moves.length };
        if (a.kind === 'f2l') put(f2lTable, pairKey(s, base, frPair), entry);
        else if (a.kind === 'oll') put(ollTable, ollKey(s), entry);
        else put(pllTable, pllKey(s, 0), entry);
      }
    }
    // Trong các cách giải được (mỗi cách kèm lượt U đệm phía trước), ưu tiên cách người dùng đã chọn, rồi tới cách ngắn nhất.
    const choose = (hits) => {
      let best = null;
      for (const h of hits) {
        const cost = (prefer(h.entry.id) === h.entry.alg ? -1000 : 0) + h.entry.len + (h.u ? 1 : 0);
        if (!best || cost < best.cost) best = { ...h, cost };
      }
      return best;
    };

    const TRIGGERS = { '-1,1': ["L'", 'L'], '-1,-1': ['L', "L'"], '1,-1': ["R'", 'R'] };
    const inWrongSlot = (c) => c.pos[1] !== -1 && !(c.pos[0] === 1 && c.pos[2] === 1);

    // Dãy xoay để giải một cặp F2L: xoay khối cho khe về phía trước bên phải, đẩy viên kẹt ở khe khác lên, rồi tra bảng.
    function planPair(s, ref, p) {
      const S = C.clone(s);
      const R = C.clone(ref);
      const out = [];
      const run = (text) => {
        for (const m of C.parseAlg(text)) {
          C.applyMove(S, m);
          turnRef(R, m);
          out.push(m);
        }
      };
      const probe = C.clone(R);
      let turns = 0;
      while (probe.cubies[p.ci].pos.join() !== '1,1,1' && turns < 4) {
        C.applyAlg(probe, C.parseAlg('y'));
        turns++;
      }
      if (turns) run(['', 'y', 'y2', "y'"][turns]);

      for (let guard = 0; guard < 6; guard++) {
        const stuck = [S.cubies[p.ci], S.cubies[p.ei]].filter(inWrongSlot);
        if (!stuck.length) break;
        const [a, b] = TRIGGERS[stuck[0].pos[0] + ',' + stuck[0].pos[2]];
        let best = null;
        for (const u of ['U', "U'", 'U2']) {
          const text = `${a} ${u} ${b}`;
          const t = C.applyAlg(C.clone(S), C.parseAlg(text));
          const left = [t.cubies[p.ci], t.cubies[p.ei]].filter(inWrongSlot).length;
          if (!best || left < best.left) best = { text, left };
        }
        run(best.text);
      }

      const hits = [];
      for (const u of ['', 'U', "U'", 'U2']) {
        const t = C.applyAlg(C.clone(S), C.parseAlg(u));
        if (samePlace(t.cubies[p.ci], R.cubies[p.ci]) && samePlace(t.cubies[p.ei], R.cubies[p.ei])) {
          run(u);
          return { moves: out, hit: null };
        }
        for (const entry of f2lTable.get(pairKey(t, R, p)) || []) hits.push({ u, entry });
      }
      const pick = choose(hits);
      if (!pick) return null;
      run(pick.u);
      run(pick.entry.alg);
      return { moves: out, hit: pick.entry };
    }

    function solve(input) {
      const s = C.clone(input);
      const ref = refFor(s);
      const steps = [];
      const apply = (moves) => {
        for (const m of moves) {
          C.applyMove(s, m);
          turnRef(ref, m);
        }
      };
      // kind: cross / f2l / oll / pll / other; hit: trường hợp trong thư viện mà chặng này dùng (nếu có).
      const add = (kind, name, moves, detail, hit) => {
        apply(moves);
        const simple = C.simplify(moves);
        if (simple.length) steps.push({ kind, name, detail: detail || '', moves: simple, caseId: hit ? hit.id : null, alg: hit ? hit.alg : null });
      };
      const fail = (error) => ({ error });

      if (C.isSolved(s)) return { steps: [], total: 0 };

      // Đưa tâm trắng xuống dưới (nếu chưa), giữ nguyên mặt đang ở phía trước khi có thể.
      const whiteDown = (t) => C.matVec(C.frameOf(t), [0, -1, 0]).join() === '0,1,0';
      const flip = ['', 'z2', 'x', "x'", 'z', "z'"].find((r) => whiteDown(C.applyAlg(C.clone(s), C.parseAlg(r))));
      add('other', 'Lật khối', C.parseAlg(flip), 'Vàng lên trên, trắng xuống dưới.');

      const cross = solveCross(s, ref);
      if (!cross) return fail('Không tìm được cách làm chữ thập. Kiểm tra lại màu đã nhập.');
      add('cross', 'Chữ thập trắng', cross, 'Bốn cạnh trắng về đáy, khớp màu với tâm các mặt bên.');

      const slots = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([x, z]) => pairIndex(ref, x, z));
      const solvedSlot = (p) => samePlace(s.cubies[p.ci], ref.cubies[p.ci]) && samePlace(s.cubies[p.ei], ref.cubies[p.ei]);
      let pairNo = 1;
      for (let round = 0; round < 4; round++) {
        let best = null;
        for (const p of slots) {
          if (solvedSlot(p)) continue;
          const plan = planPair(s, ref, p);
          if (!plan) return fail('Không ghép được một cặp F2L. Kiểm tra lại màu đã nhập.');
          if (!best || plan.moves.length < best.plan.moves.length) best = { plan, p };
        }
        if (!best) break;
        const colors = C.DIRS.filter((d) => d.some((v, k) => v !== 0 && s.cubies[best.p.ei].home[k] === v)).map((d) => COLOR_NAME[C.faceOf(d)]);
        add('f2l', `F2L cặp ${pairNo++}: ${colors.join(' - ')}`, best.plan.moves, best.plan.hit ? `Trường hợp ${best.plan.hit.name}.` : '', best.plan.hit);
      }

      if (!topDone(s)) {
        const hits = [];
        for (const u of ['', 'U', "U'", 'U2'])
          for (const entry of ollTable.get(ollKey(C.applyAlg(C.clone(s), C.parseAlg(u)))) || []) hits.push({ u, entry });
        const found = choose(hits);
        if (!found) return fail('Khối này không giải được: có một góc bị xoay hoặc một cạnh bị lật so với khối hợp lệ. Kiểm tra lại màu đã nhập, hoặc khối đã bị lắp sai.');
        add('oll', `OLL: ${found.entry.name}`, C.parseAlg(`${found.u} ${found.entry.alg}`), 'Làm cả mặt trên thành màu vàng.', found.entry);
      }

      const finish = () => {
        for (const u of ['', 'U', "U'", 'U2']) if (C.isSolved(C.applyAlg(C.clone(s), C.parseAlg(u)))) return u;
        return null;
      };
      if (finish() === null) {
        const hits = [];
        for (const u of ['', 'U', "U'", 'U2']) {
          const t = C.applyAlg(C.clone(s), C.parseAlg(u));
          for (let shift = 0; shift < 4; shift++) for (const entry of pllTable.get(pllKey(t, shift)) || []) hits.push({ u, entry });
        }
        const found = choose(hits);
        if (!found) return fail('Khối này không giải được: có hai viên bị tráo chỗ so với khối hợp lệ. Kiểm tra lại màu đã nhập, hoặc khối đã bị lắp sai.');
        add('pll', `PLL: ${found.entry.name}`, C.parseAlg(`${found.u} ${found.entry.alg}`), 'Đưa các viên tầng trên về đúng chỗ.', found.entry);
      }
      const last = finish();
      if (last === null) return fail('Không hoàn tất được tầng trên. Kiểm tra lại màu đã nhập.');
      add('other', 'Chỉnh tầng trên', C.parseAlg(last), 'Xoay tầng trên cho khớp màu.');

      return { steps, total: steps.reduce((n, st) => n + st.moves.length, 0) };
    }

    return { solve };
  }

  // ---------- Tự suy ra chiều của từng mặt sau khi quét ----------
  // Khi quét tự do, mỗi mặt có thể bị xoay 0, 90, 180 hoặc 270 độ so với hình trải. Có 4^6 = 4096 cách ghép;
  // thử hết và giữ cách ghép mà mọi viên cạnh, viên góc đều là viên có thật, rồi kiểm tra khối giải được.
  const rotateFace = (a) => [a[6], a[3], a[0], a[7], a[4], a[1], a[8], a[5], a[2]];

  let pieceTable = null;
  function pieces() {
    if (pieceTable) return pieceTable;
    const where = new Map(); // "vị trí|hướng" -> [mặt, số ô]
    for (const f of FACES)
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) where.set(NET[f].cell(r, c).join() + '|' + NET[f].dir.join(), [f, r * 3 + c]);
    const slots = [];
    const valid = new Set();
    const homes = C.createSolved().cubies.map((c) => c.home).filter((h) => zeros(h) < 2);
    const dirsOf = (p) => C.DIRS.filter((d) => d.some((v, k) => v !== 0 && p[k] === v));
    homes.forEach((pos, n) => {
      slots.push(dirsOf(pos).map((d) => where.get(pos.join() + '|' + d.join())));
      for (const home of homes)
        for (const rot of C.ROTATIONS) {
          if (C.matVec(rot, home).join() !== pos.join()) continue;
          // Màu nhìn thấy ở từng hướng của vị trí này khi viên `home` nằm ở đây với phép xoay `rot`.
          const back = C.transpose(rot);
          valid.add(n + ':' + dirsOf(pos).map((d) => C.faceOf(C.matVec(back, d))).join(''));
        }
    });
    pieceTable = { slots, valid };
    return pieceTable;
  }

  // net: màu đã nhận, mỗi mặt đúng ô tâm nhưng chưa biết chiều. Trả về { net, exact, ambiguous }.
  function resolveOrientation(net, solver) {
    const { slots, valid } = pieces();
    const turns = {};
    for (const f of FACES) {
      turns[f] = [net[f]];
      for (let k = 1; k < 4; k++) turns[f].push(rotateFace(turns[f][k - 1]));
    }
    let bestScore = -1;
    let best = [];
    const pick = [0, 0, 0, 0, 0, 0];
    const cur = {};
    for (let code = 0; code < 4096; code++) {
      for (let i = 0; i < 6; i++) {
        pick[i] = (code >> (2 * i)) & 3;
        cur[FACES[i]] = turns[FACES[i]][pick[i]];
      }
      let score = 0;
      for (let n = 0; n < slots.length; n++) {
        let key = n + ':';
        for (const [f, i] of slots[n]) key += cur[f][i];
        if (valid.has(key)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        best = [code];
      } else if (score === bestScore && best.length < 64) best.push(code);
    }
    const build = (code) => {
      const out = {};
      FACES.forEach((f, i) => {
        out[f] = turns[f][(code >> (2 * i)) & 3];
      });
      return out;
    };
    if (bestScore === slots.length) {
      const good = [];
      const seen = new Set();
      for (const code of best) {
        const candidate = build(code);
        const built = stateFromFacelets(candidate);
        if (built.error || solver.solve(built.state).error) continue;
        const key = JSON.stringify(candidate);
        if (!seen.has(key)) {
          seen.add(key);
          good.push(candidate);
        }
      }
      if (good.length) return { net: good[0], exact: true, ambiguous: good.length > 1, candidates: good };
    }
    return { net: build(best[0]), exact: false, ambiguous: false, candidates: [] };
  }

  const api = { refFor, stateAfter, keepsTop, NET, FACES, COLOR_NAME, FACE_NAME, faceletsFromState, stateFromFacelets, createSolver, rotateFace, resolveOrientation };
  root.RubikSolver = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
