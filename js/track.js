/*
 * Theo dõi khối thật qua camera và luôn giữ sẵn một đường giải từ trạng thái hiện tại.
 *
 * Camera chỉ thấy một mặt (9 ô). Mỗi lần mặt đó đổi, ta tìm mọi cách giải thích: người dùng đi tiếp theo đường giải,
 * xoay cả khối sang hướng khác, hay xoay một - hai lượt bất kỳ. Mỗi cách giải thích cho ra một giả thuyết về trạng
 * thái của khối, kèm "giá" = số lượt nằm ngoài đường giải mà nó phải giả định. Giả thuyết rẻ nhất được dùng để dẫn
 * đường; các giả thuyết khác được giữ lại, vì có những lượt camera không thấy (vd. xoay mặt sau) chỉ lộ ra về sau.
 * Không phụ thuộc DOM, chạy được trong Node để test.
 */
(function (root) {
  'use strict';
  const C = root.Cube || require('./cube.js');
  const S = root.RubikSolver || require('./solver.js');

  // ---- 54 ô màu theo thứ tự U F R B L D, mỗi mặt 9 ô như hình trải ----
  const where = new Map();
  const cells = [];
  for (const f of S.FACES)
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        where.set(S.NET[f].cell(r, c).join() + '|' + S.NET[f].dir.join(), cells.length);
        cells.push({ pos: S.NET[f].cell(r, c), dir: S.NET[f].dir });
      }
  const FRONT = 9; // mặt F bắt đầu từ ô số 9
  const facelets = (state) => cells.map((cell) => C.stickerAt(state, cell.pos, cell.dir).face);
  const frontOf = (f) => f.slice(FRONT, FRONT + 9);
  const showsFront = (f, obs) => {
    for (let i = 0; i < 9; i++) if (f[FRONT + i] !== obs[i]) return false;
    return true;
  };

  // Bảng hoán vị của một dãy xoay: ô thứ i sau khi xoay lấy màu của ô perm[i] trước khi xoay.
  const permCache = new Map();
  function permOf(alg) {
    if (permCache.has(alg)) return permCache.get(alg);
    const s = C.applyAlg(C.createSolved(), C.parseAlg(alg));
    const perm = cells.map((cell) => {
      const st = C.stickerAt(s, cell.pos, cell.dir);
      return where.get(st.home.join() + '|' + st.n.join());
    });
    permCache.set(alg, perm);
    return perm;
  }
  const permute = (f, perm) => perm.map((i) => f[i]);

  let tables = null;
  function build() {
    if (tables) return tables;
    const moves = [];
    for (const face of ['U', 'D', 'R', 'L', 'F', 'B']) for (const suffix of ['', "'", '2']) moves.push({ name: face + suffix, face, perm: permOf(face + suffix) });
    // 24 hướng cầm khối, mỗi hướng là một dãy xoay cả khối ngắn nhất.
    const orients = [];
    const seen = new Set();
    let frontier = [''];
    while (frontier.length) {
      const next = [];
      for (const alg of frontier) {
        const perm = permOf(alg);
        const key = perm.join();
        if (seen.has(key)) continue;
        seen.add(key);
        orients.push({ alg, perm });
        for (const r of ['y', "y'", 'x', "x'", 'z', "z'", 'y2', 'x2', 'z2']) next.push((alg + ' ' + r).trim());
      }
      frontier = next;
    }
    tables = { moves, orients };
    return tables;
  }

  const OPPOSITE = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };
  // Mọi cách ra được mặt `obs` từ `f` bằng đúng `depth` lượt xoay một mặt, kèm một lần đổi hướng cầm (nếu cần).
  function search(f, obs, depth) {
    const { moves, orients } = build();
    const out = [];
    const walk = (cur, names, last, left) => {
      if (!left) {
        for (const o of orients) {
          if (cur[o.perm[FRONT + 4]] !== obs[4]) continue;
          let ok = true;
          for (let i = 0; i < 9 && ok; i++) ok = cur[o.perm[FRONT + i]] === obs[i];
          if (ok) out.push({ moves: names.slice(), orient: o.alg, f: o.alg ? permute(cur, o.perm) : cur });
        }
        return;
      }
      for (const m of moves) {
        if (m.face === last) continue;
        // Hai mặt đối nhau xoay trước sau gì cũng như nhau: chỉ xét một thứ tự.
        if (OPPOSITE[m.face] === last && m.face < last) continue;
        names.push(m.name);
        walk(permute(cur, m.perm), names, m.face, left - 1);
        names.pop();
      }
    };
    walk(f, [], '', depth);
    return out;
  }

  const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const LOOKAHEAD = 4; // số lượt đi trước theo đường giải mà vẫn nhận ra ngay
  const MAX_DEPTH = 2; // số lượt xoay ngoài đường giải tìm được giữa hai lần đọc
  const MAX_HYPS = 32;
  const MAX_COST = 3; // giả thuyết đắt hơn cái rẻ nhất chừng này thì bỏ

  // `steps` là đường giải cho một trạng thái. Sau khi người dùng xoay thêm các lượt `made` rồi đổi hướng cầm
  // theo `orient`, đường giải mới là: quay lại các lượt đó, rồi đi tiếp đường cũ (viết lại theo hướng cầm mới).
  // Lượt nào trùng với đường cũ thì tự triệt tiêu, nên đi đúng đường giải chỉ làm đường giải ngắn dần.
  function extend(steps, made, orient) {
    const rot = C.frameOf(C.applyAlg(C.createSolved(), C.parseAlg(orient || '')));
    const turn = (m) => C.conjugate(m, rot);
    const undo = C.invertAlg(made).map(turn);
    const tail = steps.map((st) => ({ ...st, moves: st.moves.map(turn) }));
    const flat = C.simplify([...undo, ...tail.flatMap((st) => st.moves)]);
    // Chia lại thành chặng: phần đuôi giữ tên chặng cũ, phần đầu là "quay lại".
    const out = [];
    let end = flat.length;
    for (let i = tail.length - 1; i >= 0 && end > 0; i--) {
      const n = Math.min(end, tail[i].moves.length);
      if (!n || !sameList(flat.slice(end - n, end).map((m) => m.name), tail[i].moves.slice(-n).map((m) => m.name))) break;
      out.unshift({ ...tail[i], moves: flat.slice(end - n, end) });
      end -= n;
    }
    if (end > 0) out.unshift({ kind: 'undo', name: 'Quay lại lượt vừa xoay', detail: 'Rồi đi tiếp đường giải cũ.', moves: flat.slice(0, end), caseId: null, alg: null });
    return out;
  }
  const lengthOf = (steps) => steps.reduce((n, st) => n + st.moves.length, 0);

  // Dẫn đường: giữ các giả thuyết về trạng thái của khối, cùng đường giải tính từ giả thuyết rẻ nhất.
  //   solver - bộ giải (RubikSolver.createSolver)
  //   state  - trạng thái lúc bắt đầu (vd. vừa quét xong)
  function createGuide(solver, state) {
    const g = {
      hyps: [{ state: C.clone(state), f: facelets(state), cost: 0 }],
      steps: [], // các chặng của đường giải hiện tại: { kind, name, detail, moves, caseId, alg }
      moves: [], // toàn bộ lượt của đường giải hiện tại
      start: C.clone(state), // trạng thái ở đầu đường giải hiện tại
      index: 0, // đã đi được bao nhiêu lượt của đường giải
      error: null,
    };
    let lastObs = null;

    const setPlan = (steps) => {
      g.steps = steps.filter((st) => st.moves.length);
      g.moves = g.steps.flatMap((st) => st.moves);
      g.start = C.clone(g.hyps[0].state);
      g.index = 0;
    };
    const fresh = () => {
      const sol = solver.solve(g.hyps[0].state);
      g.error = sol.error || null;
      return sol.error ? null : sol.steps;
    };
    // Phần còn lại của đường giải, tính từ lượt đang đứng.
    const rest = (index) => {
      let skip = index == null ? g.index : index;
      const out = [];
      for (const st of g.steps) {
        if (skip >= st.moves.length) skip -= st.moves.length;
        else {
          out.push({ ...st, moves: st.moves.slice(skip) });
          skip = 0;
        }
      }
      return out;
    };
    const upcoming = () => g.moves.slice(g.index, g.index + LOOKAHEAD);

    setPlan(fresh() || []);
    g.hyps[0].steps = g.steps;

    g.state = () => g.hyps[0].state;
    g.done = () => C.isSolved(g.hyps[0].state);
    g.front = () => frontOf(g.hyps[0].f);
    // Có giả thuyết khác (rẻ gần bằng) cho rằng khối đang ở trạng thái khác không.
    g.unsure = () => g.hyps.some((h) => h.cost < g.hyps[0].cost + 1);
    g.stage = () => {
      let n = g.index;
      for (const st of g.steps) {
        if (n < st.moves.length) return st;
        n -= st.moves.length;
      }
      return null;
    };
    // Các lượt cần làm ngay: thường là một lượt. Nếu lượt đó không làm đổi mặt camera đang thấy thì kèm thêm các
    // lượt sau, tới lượt đầu tiên camera thấy được, để người dùng làm liền một mạch.
    g.pending = () => {
      const out = [];
      let f = g.hyps[0].f;
      for (const move of upcoming()) {
        const next = permute(f, permOf(move.name));
        const hidden = sameList(frontOf(f), frontOf(next));
        out.push({ move, hidden });
        if (!hidden) break;
        f = next;
      }
      return out;
    };

    // Người dùng báo đã làm xong lượt đang chờ (dùng cho lượt camera không thấy được).
    g.skip = () => {
      if (g.index >= g.moves.length) return;
      const s = C.applyMove(C.clone(g.hyps[0].state), g.moves[g.index]);
      g.index++;
      g.hyps = [{ state: s, f: facelets(s), cost: 0, steps: rest() }];
      lastObs = null;
    };

    // Chọn đường giải cho giả thuyết chính mới: đường nó mang theo (quay lại rồi đi tiếp), hoặc giải lại từ đầu
    // nếu cách đó ngắn hơn.
    function replan() {
      const carried = g.hyps[0].steps;
      const valid = carried && C.isSolved(C.applyAlg(C.clone(g.hyps[0].state), carried.flatMap((st) => st.moves)));
      const plan = fresh();
      const pick = valid && (!plan || lengthOf(carried) <= lengthOf(plan)) ? carried : plan || [];
      if (pick === carried) g.error = null;
      setPlan(pick);
      g.hyps[0].steps = g.steps;
    }

    // obs: 9 màu camera đang thấy (hàng trên trước, trái sang phải theo góc nhìn của camera).
    // Trả về { kind }: same (không đổi), path (đi tiếp theo đường giải, kèm steps), moved (làm gì đó khác, kèm
    // moves / orient; đã có đường giải mới), switch (chuyển sang giả thuyết khác; đã có đường giải mới),
    // lost (không cách giải thích nào khớp).
    g.observe = (obs) => {
      if (lastObs && sameList(lastObs, obs)) return { kind: 'same' };
      const plan = upcoming();
      const cands = new Map();
      const offer = (f, cost, from, how) => {
        const key = f.join('');
        const cur = cands.get(key);
        if (!cur || cost < cur.cost) cands.set(key, { f, cost, from, how, order: cands.size });
      };
      g.hyps.forEach((h, from) => {
        if (showsFront(h.f, obs)) offer(h.f, h.cost, from, { kind: 'same' });
        let f = h.f;
        for (let j = 0; j < plan.length; j++) {
          f = permute(f, permOf(plan[j].name));
          if (showsFront(f, obs)) offer(f, h.cost, from, { kind: 'path', steps: j + 1 });
        }
        for (let depth = 0; depth <= MAX_DEPTH; depth++)
          for (const cand of search(h.f, obs, depth)) {
            if (!depth && !cand.orient) continue;
            // Một lượt lạ đi kèm đúng lượt kế của đường giải thì chỉ tính là một lượt ngoài đường.
            const onPlan = depth === 2 && plan.length && cand.moves.includes(plan[0].name);
            offer(cand.f, h.cost + depth - (onPlan ? 1 : 0) + (cand.orient ? 0.5 : 0), from, { kind: 'moved', moves: cand.moves, orient: cand.orient });
          }
      });
      if (!cands.size) return { kind: 'lost' };
      lastObs = obs.slice();

      const kindRank = { same: 0, path: 1, moved: 2 };
      const list = [...cands.values()].sort((a, b) => a.cost - b.cost || a.from - b.from || kindRank[a.how.kind] - kindRank[b.how.kind] || a.order - b.order);
      const low = list[0].cost;
      const kept = list.filter((c) => c.cost <= low + MAX_COST).slice(0, MAX_HYPS);
      const old = g.hyps;
      old[0].steps = rest();
      g.hyps = kept.map((c) => {
        const h = old[c.from];
        if (c.how.kind === 'same') return { state: h.state, f: c.f, cost: c.cost - low, steps: h.steps };
        const made = c.how.kind === 'path' ? plan.slice(0, c.how.steps) : C.parseAlg(c.how.moves.join(' '));
        const orient = c.how.kind === 'path' ? '' : c.how.orient;
        const s = C.applyAlg(C.applyAlg(C.clone(h.state), made), C.parseAlg(orient));
        return { state: s, f: c.f, cost: c.cost - low, steps: extend(h.steps, made, orient) };
      });

      const best = kept[0];
      if (best.from === 0 && best.how.kind === 'same') return { kind: 'same' };
      if (best.from === 0 && best.how.kind === 'path') {
        g.index += best.how.steps;
        return { kind: 'path', steps: best.how.steps };
      }
      replan();
      if (best.from !== 0) return { kind: 'switch' };
      return { kind: 'moved', moves: C.parseAlg(best.how.moves.join(' ')), orient: best.how.orient };
    };

    return g;
  }

  const api = { facelets, frontOf, permOf, search, createGuide };
  root.RubikTrack = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
