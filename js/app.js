/* Giao diện: học giải, thư viện công thức, luyện tập, giải khối, bấm giờ, xoay tự do. */
(function () {
  'use strict';
  const C = window.Cube;
  const D = window.RUBIK_DATA;
  const S = window.RubikSolver;
  const Scan = window.RubikScan;
  const $ = (sel, el) => (el || document).querySelector(sel);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Đọc / ghi localStorage; trang vẫn chạy bình thường nếu trình duyệt chặn lưu trữ.
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) { /* bỏ qua */ }
    },
  };

  // ---- Nhóm ô màu được tô sáng. home = vị trí gốc của viên, n = hướng gốc của ô màu. ----
  // Tầng trắng có home y = -1, tầng vàng có home y = +1.
  const zeros = (h) => h.filter((v) => v === 0).length;
  const isCenter = (h) => zeros(h) === 2;
  const isEdge = (h) => zeros(h) === 1;
  const MASKS = {
    all: null,
    cross: (h) => isCenter(h) || (isEdge(h) && h[1] === -1),
    firstLayer: (h) => isCenter(h) || h[1] === -1,
    f2l: (h) => isCenter(h) || h[1] <= 0,
    yellowCross: (h, n) => isCenter(h) || h[1] <= 0 || (isEdge(h) && n[1] === 1),
    oll: (h, n) => h[1] <= 0 || n[1] === 1,
    llEdges: (h) => isCenter(h) || h[1] <= 0 || isEdge(h),
    // F2L: chữ thập trắng và cặp góc - cạnh của khe phải phía trước (sau khi lật vàng lên trên).
    pair: (h) => isCenter(h) || (isEdge(h) && h[1] === -1) || (h[0] === -1 && h[2] === 1 && h[1] <= 0),
  };

  const view = new window.CubeView($('#scene'));
  const playerEl = $('#player');

  // ---------- Tiến độ "đã thuộc" ----------
  const learned = new Set(store.get('rubik.learned', []));
  const saveLearned = () => store.set('rubik.learned', [...learned]);

  // ---------- Trình phát công thức ----------
  const player = { item: null, moves: [], setup: null, index: 0, playing: false, busy: false, gen: 0, speed: 1, onUpdate: null };
  const ui = {
    title: $('#playerTitle'),
    count: $('#playerCount'),
    moves: $('#moves'),
    reset: $('#btnReset'),
    prev: $('#btnPrev'),
    play: $('#btnPlay'),
    next: $('#btnNext'),
    speed: $('#speed'),
  };

  function setupState(item) {
    const s = C.createSolved();
    C.applyAlg(s, C.parseAlg(item.prefix || ''));
    return C.applyAlg(s, C.invertAlg(C.parseAlg(item.alg)));
  }

  function stopPlayer() {
    player.gen++;
    player.playing = false;
    player.busy = false;
  }

  // item: { name, alg | moves, prefix, mask, state?, stages? }
  //   state  - trạng thái ban đầu cho sẵn (dùng khi giải khối thật)
  //   stages - [{ name, count }] chia dãy xoay thành từng chặng có tên
  function loadAlg(item) {
    stopPlayer();
    player.item = item;
    player.moves = item.moves || C.parseAlg(item.alg);
    player.setup = item.state ? C.clone(item.state) : setupState(item);
    player.index = 0;
    view.setMask(MASKS[item.mask || 'all']);
    view.setState(player.setup);

    ui.title.textContent = item.name;
    const nodes = [];
    let stage = 0;
    let stageEnd = 0;
    player.moves.forEach((m, i) => {
      while (item.stages && stage < item.stages.length && i === stageEnd) {
        nodes.push(el('div', 'stage-label', item.stages[stage].name));
        stageEnd += item.stages[stage].count;
        stage++;
      }
      const chip = el('button', 'move', m.name);
      chip.title = 'Nhảy tới lượt này';
      chip.addEventListener('click', () => seek(i + 1));
      nodes.push(chip);
    });
    ui.moves.replaceChildren(...nodes);
    ui.moves.classList.toggle('long', player.moves.length > 30);
    updatePlayer();
  }

  // Chặng đang phát (theo vị trí hiện tại), hoặc -1 nếu không chia chặng.
  function currentStage() {
    const stages = player.item && player.item.stages;
    if (!stages) return -1;
    let end = 0;
    for (let i = 0; i < stages.length; i++) {
      end += stages[i].count;
      if (player.index < end) return i;
    }
    return stages.length - 1;
  }

  function updatePlayer() {
    const n = player.moves.length;
    const chips = ui.moves.querySelectorAll('.move');
    chips.forEach((chip, i) => {
      chip.classList.toggle('done', i < player.index);
      chip.classList.toggle('current', i === player.index);
    });
    const stage = currentStage();
    ui.moves.querySelectorAll('.stage-label').forEach((label, i) => label.classList.toggle('current', i === stage));
    if (player.playing && chips[player.index] && ui.moves.classList.contains('long')) {
      const chip = chips[player.index];
      ui.moves.scrollTop = chip.offsetTop - ui.moves.offsetTop - 60;
    }
    ui.count.textContent = `${player.index} / ${n} lượt`;
    ui.play.textContent = player.playing ? 'Tạm dừng' : player.index >= n ? 'Phát lại' : 'Phát';
    ui.prev.disabled = player.index === 0;
    ui.reset.disabled = player.index === 0;
    ui.next.disabled = player.index >= n;
    if (player.onUpdate) player.onUpdate();
  }

  const duration = (m) => (Math.abs(m.turns) === 2 ? 560 : 400) / player.speed;

  async function step(dir) {
    if (player.busy) return false;
    const i = dir > 0 ? player.index : player.index - 1;
    if (i < 0 || i >= player.moves.length) return false;
    const move = dir > 0 ? player.moves[i] : C.invertMove(player.moves[i]);
    const gen = player.gen;
    player.busy = true;
    const ok = await view.animateMove(move, duration(move));
    if (gen !== player.gen) return false; // đã chuyển sang công thức khác hoặc đã nhảy bước
    player.busy = false;
    if (ok) player.index += dir;
    updatePlayer();
    return ok;
  }

  function seek(index) {
    stopPlayer();
    const s = C.clone(player.setup);
    for (let i = 0; i < index; i++) C.applyMove(s, player.moves[i]);
    view.setState(s);
    player.index = index;
    updatePlayer();
  }

  async function play() {
    if (player.playing) return;
    if (player.index >= player.moves.length) seek(0);
    const gen = player.gen;
    player.playing = true;
    updatePlayer();
    while (player.playing && gen === player.gen && player.index < player.moves.length) {
      if (!(await step(1))) break;
      await sleep(90 / player.speed);
    }
    if (gen === player.gen) {
      player.playing = false;
      updatePlayer();
    }
  }
  function pause() {
    player.playing = false;
    updatePlayer();
  }

  ui.play.addEventListener('click', () => (player.playing ? pause() : play()));
  ui.next.addEventListener('click', () => { pause(); step(1); });
  ui.prev.addEventListener('click', () => { pause(); step(-1); });
  ui.reset.addEventListener('click', () => seek(0));
  ui.speed.addEventListener('change', () => { player.speed = parseFloat(ui.speed.value); });

  // ---------- Học giải ----------
  let trackIndex = 0;
  let lessonIndex = 0;
  let caseIndex = 0;
  const lessons = () => D.tracks[trackIndex].lessons;

  function renderTracks() {
    $('#tracks').replaceChildren(
      ...D.tracks.map((t, i) => {
        const b = el('button', 'track' + (i === trackIndex ? ' active' : ''));
        b.append(el('strong', '', t.name), el('span', '', t.desc));
        b.addEventListener('click', () => {
          if (i === trackIndex) return;
          trackIndex = i;
          openLesson(0, 0);
        });
        return b;
      })
    );
  }

  function renderSteps() {
    $('#steps').replaceChildren(
      ...lessons().map((l, i) => {
        const li = el('li');
        const b = el('button', i === lessonIndex ? 'active' : '');
        b.append(el('span', 'num', String(i + 1)), el('span', '', l.title));
        b.addEventListener('click', () => openLesson(i, 0));
        li.append(b);
        return li;
      })
    );
  }

  function renderLesson() {
    const l = lessons()[lessonIndex];
    const nodes = [el('h2', '', `${lessonIndex + 1}. ${l.title}`), el('p', 'goal', l.goal)];
    l.body.forEach((p) => nodes.push(el('p', '', p)));
    nodes.push(el('h3', '', 'Tình huống và công thức'));
    const cases = el('div', 'cases');
    l.cases.forEach((c, i) => {
      const b = el('button', 'case' + (i === caseIndex ? ' active' : ''));
      b.append(el('span', '', c.name), el('span', 'alg', C.algToString(C.parseAlg(c.alg))));
      b.addEventListener('click', () => openLesson(lessonIndex, i));
      cases.append(b);
    });
    nodes.push(cases);

    const nav = el('div', 'lesson-nav');
    const prev = el('button', '', '← Bước trước');
    prev.disabled = lessonIndex === 0;
    prev.addEventListener('click', () => openLesson(lessonIndex - 1, 0));
    const next = el('button', 'primary', 'Bước tiếp →');
    next.disabled = lessonIndex === lessons().length - 1;
    next.addEventListener('click', () => openLesson(lessonIndex + 1, 0));
    nav.append(prev, next);
    nodes.push(nav);
    $('#lesson').replaceChildren(...nodes);
  }

  function openLesson(i, c) {
    lessonIndex = i;
    caseIndex = c;
    renderTracks();
    renderSteps();
    renderLesson();
    loadAlg(lessons()[i].cases[c]);
  }

  // ---------- Hình minh hoạ nhỏ ----------
  const stickerFill = (state, mask) => (pos, dir) => {
    const st = C.stickerAt(state, pos, dir);
    if (!st) return 'var(--plastic)';
    return mask && !mask(st.home, st.n) ? 'var(--dim)' : `var(--c-${st.face})`;
  };

  // Mặt trên nhìn từ trên xuống, kèm dải màu 4 mặt bên.
  function topViewSVG(state, mask) {
    const cell = 20, strip = 7, gap = 2, pad = strip + gap + 1;
    const size = pad * 2 + cell * 3;
    const fill = stickerFill(state, mask);
    const rect = (x, y, w, h, color) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" style="fill:${color}"/>`;
    let out = '';
    [-1, 0, 1].forEach((a, i) => {
      const o = pad + i * cell + 1;
      [-1, 0, 1].forEach((x, j) => {
        out += rect(pad + j * cell + 1, o, cell - 2, cell - 2, fill([x, -1, a], [0, -1, 0]));
      });
      out += rect(o, 1, cell - 2, strip - 1, fill([a, -1, -1], [0, 0, -1]));
      out += rect(o, size - strip, cell - 2, strip - 1, fill([a, -1, 1], [0, 0, 1]));
      out += rect(1, o, strip - 1, cell - 2, fill([-1, -1, a], [-1, 0, 0]));
      out += rect(size - strip, o, strip - 1, cell - 2, fill([1, -1, a], [1, 0, 0]));
    });
    return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Mặt trên nhìn từ trên xuống">${out}</svg>`;
  }

  // Hình nhìn chéo thấy 3 mặt trên, trước, phải. Dùng cho F2L vì cần thấy cả khe.
  function isoViewSVG(state, mask) {
    const k = 13, cx = 38, cy = 44;
    const P = (x, y, z) => `${(cx + (x - z) * 0.866 * k).toFixed(1)},${(cy + ((x + z) * 0.5 + y) * k).toFixed(1)}`;
    const fill = stickerFill(state, mask);
    const quad = (pts, color) =>
      `<polygon points="${pts.join(' ')}" style="fill:${color};stroke:var(--plastic);stroke-width:1.3;stroke-linejoin:round"/>`;
    const h = 0.5;
    let out = '';
    for (const a of [-1, 0, 1])
      for (const b of [-1, 0, 1]) {
        out += quad([P(a - h, -1.5, b - h), P(a + h, -1.5, b - h), P(a + h, -1.5, b + h), P(a - h, -1.5, b + h)], fill([a, -1, b], [0, -1, 0]));
        out += quad([P(a - h, b - h, 1.5), P(a + h, b - h, 1.5), P(a + h, b + h, 1.5), P(a - h, b + h, 1.5)], fill([a, b, 1], [0, 0, 1]));
        out += quad([P(1.5, b - h, a - h), P(1.5, b - h, a + h), P(1.5, b + h, a + h), P(1.5, b + h, a - h)], fill([1, b, a], [1, 0, 0]));
      }
    return `<svg viewBox="0 0 76 88" role="img" aria-label="Khối nhìn chéo từ trên xuống">${out}</svg>`;
  }

  const familyChips = (root, current, extra, onPick) => {
    const options = [{ id: 'all', name: 'Tất cả' }, ...D.families, ...extra];
    root.replaceChildren(
      ...options.map((o) => {
        const b = el('button', 'chip' + (o.id === current ? ' active' : ''), o.name);
        b.addEventListener('click', () => onPick(o.id));
        return b;
      })
    );
  };

  // ---------- Thư viện công thức ----------
  let filter = 'all';
  let activeAlgId = D.algorithms[0].id;

  function renderLibrary() {
    familyChips($('#filters'), filter, [{ id: 'todo', name: 'Chưa thuộc' }], (id) => {
      filter = id;
      renderLibrary();
    });
    $('#progress').textContent = `Đã thuộc ${D.algorithms.filter((a) => learned.has(a.id)).length} / ${D.algorithms.length}`;
    const list = D.algorithms.filter((a) =>
      filter === 'all' ? true : filter === 'todo' ? !learned.has(a.id) : a.group.startsWith(filter)
    );
    const cards = $('#cards');
    if (!list.length) {
      cards.replaceChildren(el('p', 'empty', 'Không còn công thức nào trong mục này.'));
      return;
    }
    const makeCard = (a) => {
      const card = el('div', 'card' + (a.id === activeAlgId ? ' active' : '') + (learned.has(a.id) ? ' learned' : ''));
      const pic = el('div');
      const draw = a.group.startsWith('f2l') ? isoViewSVG : topViewSVG;
      pic.innerHTML = draw(setupState(a), MASKS[a.mask || 'all']);
      const info = el('div');
      info.append(el('h4', '', a.name), el('span', 'alg', C.algToString(C.parseAlg(a.alg))));
      card.append(pic, info);
      if (a.note) card.append(el('p', 'note', a.note));

      const label = el('label');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = learned.has(a.id);
      box.addEventListener('change', () => {
        if (box.checked) learned.add(a.id);
        else learned.delete(a.id);
        saveLearned();
        renderLibrary();
      });
      label.addEventListener('click', (e) => e.stopPropagation());
      label.append(box, document.createTextNode('Đã thuộc'));
      card.append(label);

      card.addEventListener('click', () => {
        activeAlgId = a.id;
        loadAlg(a);
        renderLibrary();
        if (window.matchMedia('(max-width: 820px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' });
        play();
      });
      return card;
    };
    const sections = [];
    for (const g of D.groups) {
      const items = list.filter((a) => a.group === g.id);
      if (!items.length) continue;
      const grid = el('div', 'cards');
      grid.append(...items.map(makeCard));
      sections.push(el('h3', '', `${g.name} (${items.length})`), grid);
    }
    cards.replaceChildren(...sections);
  }

  // ---------- Luyện tập kiểu flashcard ----------
  // Mỗi công thức nằm trong một "hộp" 0-4. Nhớ thì lên một hộp, quên thì về hộp 0; hộp càng thấp càng hay được hỏi.
  const WEIGHTS = [8, 5, 3, 2, 1];
  const practice = { filter: 'all', item: null, boxes: store.get('rubik.boxes', {}) };
  const practicePool = () => D.algorithms.filter((a) => practice.filter === 'all' || a.group.startsWith(practice.filter));
  const boxOf = (a) => Math.min(4, practice.boxes[a.id] || 0);

  function pickCard() {
    let pool = practicePool();
    if (pool.length > 1 && practice.item) pool = pool.filter((a) => a.id !== practice.item.id);
    const total = pool.reduce((n, a) => n + WEIGHTS[boxOf(a)], 0);
    let r = Math.random() * total;
    for (const a of pool) {
      r -= WEIGHTS[boxOf(a)];
      if (r <= 0) return a;
    }
    return pool[pool.length - 1];
  }

  function renderPracticeStats() {
    familyChips($('#practiceFilters'), practice.filter, [], (id) => {
      practice.filter = id;
      nextCard();
    });
    const pool = practicePool();
    const count = (fn) => pool.filter(fn).length;
    $('#practiceStats').textContent =
      `Mới ${count((a) => !(a.id in practice.boxes))} · Đang học ${count((a) => a.id in practice.boxes && boxOf(a) < 3)} · Đã vững ${count((a) => boxOf(a) >= 3)}`;
  }

  function nextCard() {
    stopPlayer();
    const item = pickCard();
    practice.item = item;
    view.setMask(MASKS[item.mask || 'all']);
    view.setState(setupState(item));
    playerEl.hidden = true;
    $('#practiceGroup').textContent = D.groups.find((g) => g.id === item.group).name;
    $('#practiceQuestion').textContent = 'Công thức cho tình huống này là gì?';
    $('#practiceTip').hidden = false;
    $('#practiceAnswer').hidden = true;
    $('#btnReveal').hidden = false;
    $('#btnSkip').hidden = false;
    $('#btnForgot').hidden = true;
    $('#btnKnew').hidden = true;
    renderPracticeStats();
  }

  function revealCard() {
    const item = practice.item;
    $('#practiceQuestion').textContent = item.name;
    $('#practiceTip').hidden = true;
    $('#practiceAlg').textContent = C.algToString(C.parseAlg(item.alg));
    $('#practiceNote').textContent = item.note || '';
    $('#practiceAnswer').hidden = false;
    $('#btnReveal').hidden = true;
    $('#btnSkip').hidden = true;
    $('#btnForgot').hidden = false;
    $('#btnKnew').hidden = false;
    playerEl.hidden = false;
    loadAlg(item);
    play();
  }

  function gradeCard(knew) {
    const id = practice.item.id;
    practice.boxes[id] = knew ? Math.min(4, (practice.boxes[id] || 0) + 1) : 0;
    store.set('rubik.boxes', practice.boxes);
    nextCard();
  }

  $('#btnReveal').addEventListener('click', revealCard);
  $('#btnSkip').addEventListener('click', nextCard);
  $('#btnKnew').addEventListener('click', () => gradeCard(true));
  $('#btnForgot').addEventListener('click', () => gradeCard(false));

  // ---------- Giải khối: nhập màu khối thật ----------
  const solver = S.createSolver(D.algorithms);
  const NET_PLACE = { U: [2, 1], L: [1, 2], F: [2, 2], R: [3, 2], B: [4, 2], D: [2, 3] };
  const blankNet = () => {
    const net = {};
    for (const f of S.FACES) {
      net[f] = Array(9).fill(null);
      net[f][4] = f;
    }
    return net;
  };
  const solve = { net: blankNet(), paint: 'U', solution: null, starts: [] };

  function setSolveMsg(text, kind) {
    const msg = $('#solveMsg');
    msg.textContent = text || '';
    msg.className = 'solve-msg' + (kind ? ' ' + kind : '');
  }

  function renderNet() {
    const counts = {};
    for (const f of S.FACES) for (const c of solve.net[f]) if (c) counts[c] = (counts[c] || 0) + 1;
    $('#palette').replaceChildren(
      ...S.FACES.map((f) => {
        const n = counts[f] || 0;
        const b = el('button', 'swatch' + (f === solve.paint ? ' active' : '') + (n > 9 ? ' over' : ''));
        b.dataset.color = f;
        const dot = el('i');
        dot.style.background = `var(--c-${f})`;
        b.append(dot, document.createTextNode(`${S.COLOR_NAME[f]} ${n}/9`));
        b.addEventListener('click', () => {
          solve.paint = f;
          renderNet();
        });
        return b;
      })
    );
    $('#net').replaceChildren(
      ...S.FACES.map((f) => {
        const faceEl = el('div', 'net-face');
        faceEl.dataset.face = f;
        faceEl.style.gridColumn = NET_PLACE[f][0];
        faceEl.style.gridRow = NET_PLACE[f][1];
        faceEl.title = `Mặt ${S.FACE_NAME[f]}`;
        solve.net[f].forEach((color, i) => {
          const cell = el('button', 'net-cell', i === 4 ? f : '');
          if (color) cell.style.background = `var(--c-${color})`;
          cell.setAttribute('aria-label', `Mặt ${S.FACE_NAME[f]}, ô ${i + 1}: ${color ? S.COLOR_NAME[color] : 'chưa tô'}`);
          if (i === 4) cell.disabled = true;
          else
            cell.addEventListener('click', () => {
              solve.net[f][i] = color === solve.paint ? null : solve.paint;
              $('#btnOtherFit').hidden = true;
              clearSolution();
              renderNet();
              previewNet();
            });
          faceEl.append(cell);
        });
        return faceEl;
      })
    );
  }

  // Khi đã tô đủ và hợp lệ thì khối 3D hiện đúng khối vừa nhập.
  function previewNet() {
    const built = S.stateFromFacelets(solve.net);
    view.setMask(null);
    if (built.state) view.setState(built.state);
    return built;
  }

  function clearSolution() {
    solve.solution = null;
    stopLive();
    document.body.classList.remove('has-solution');
    stopPlayer();
    playerEl.hidden = true;
    player.onUpdate = null;
    $('#solution').replaceChildren();
    setSolveMsg('');
  }

  function renderSolution() {
    const stage = currentStage();
    $('#solution').replaceChildren(
      ...solve.solution.steps.map((st, i) => {
        const li = el('li');
        const b = el('button', i === stage ? 'active' : '');
        b.append(el('strong', '', `${i + 1}. ${st.name}`), el('span', 'alg', C.algToString(st.moves)));
        if (st.detail) b.append(el('small', '', st.detail));
        b.addEventListener('click', () => seek(solve.starts[i]));
        li.append(b);
        return li;
      })
    );
  }

  function showSolution() {
    const sol = solve.solution;
    solve.starts = [];
    let n = 0;
    for (const st of sol.steps) {
      solve.starts.push(n);
      n += st.moves.length;
    }
    playerEl.hidden = false;
    document.body.classList.add('has-solution');
    loadAlg({
      name: 'Lời giải cho khối của bạn',
      moves: sol.steps.flatMap((st) => st.moves),
      state: sol.state,
      mask: 'all',
      stages: sol.steps.map((st) => ({ name: st.name, count: st.moves.length })),
    });
    player.onUpdate = renderSolution;
    renderSolution();
    $('#btnLive').hidden = live.on;
  }

  function runSolve() {
    clearSolution();
    const built = previewNet();
    if (built.error) return setSolveMsg(built.error, 'error');
    const sol = solver.solve(built.state);
    if (sol.error) return setSolveMsg(sol.error, 'error');
    if (!sol.total) return setSolveMsg('Khối này đã được giải rồi.', 'ok');
    solve.solution = { ...sol, state: built.state };
    setSolveMsg(`Giải xong trong ${sol.total} lượt, chia ${sol.steps.length} chặng. Bấm Phát, hoặc bấm vào từng chặng để xem riêng.`, 'ok');
    showSolution();
    if (window.matchMedia('(max-width: 820px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Camera dùng chung cho việc quét và việc giải cùng camera ----------
  const GRID = { from: 0.12, size: 0.76 };
  const scanVideo = $('#scanVideo');
  const camera = { stream: null };

  async function openCamera(facing) {
    closeCamera();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
      throw new Error('Trình duyệt không cho trang này dùng camera. Trang cần được mở qua địa chỉ HTTPS.');
    try {
      camera.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      scanVideo.srcObject = camera.stream;
      await scanVideo.play();
    } catch (e) {
      closeCamera();
      throw new Error('Không mở được camera. Hãy cấp quyền camera cho trang, và mở trang qua địa chỉ HTTPS.');
    }
  }
  function closeCamera() {
    if (camera.stream) camera.stream.getTracks().forEach((t) => t.stop());
    camera.stream = null;
    scanVideo.srcObject = null;
  }

  // Vẽ khung hình camera (cắt vuông ở giữa) lên canvas. Trả về false nếu camera chưa có hình.
  function drawFrame(canvas) {
    const vw = scanVideo.videoWidth;
    const vh = scanVideo.videoHeight;
    if (!vw || !vh) return false;
    const side = Math.min(vw, vh);
    canvas.getContext('2d', { willReadFrequently: true }).drawImage(scanVideo, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, canvas.width, canvas.width);
    return true;
  }

  // Khung lưới 3x3: viền đậm bên dưới, nét sáng bên trên để nhìn rõ trên mọi nền.
  function drawGrid(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const a = GRID.from * w;
    const cell = (GRID.size * w) / 3;
    for (const [color, width] of [['rgba(0,0,0,0.55)', 5], ['rgba(255,255,255,0.95)', 2]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let i = 0; i <= 3; i++) {
        ctx.moveTo(a + i * cell, a);
        ctx.lineTo(a + i * cell, a + 3 * cell);
        ctx.moveTo(a, a + i * cell);
        ctx.lineTo(a + 3 * cell, a + i * cell);
      }
      ctx.stroke();
    }
  }

  // Màu trung bình và độ loang màu của vùng giữa mỗi ô (tránh viền nhựa đen và đường lưới).
  function sampleFace(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width;
    const cell = (GRID.size * w) / 3;
    const box = Math.round(cell * 0.36);
    const mean = [];
    const spread = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        const x = Math.round(GRID.from * w + (c + 0.5) * cell - box / 2);
        const y = Math.round(GRID.from * w + (r + 0.5) * cell - box / 2);
        const px = ctx.getImageData(x, y, box, box).data;
        const n = px.length / 4;
        const sum = [0, 0, 0];
        const sq = [0, 0, 0];
        for (let i = 0; i < px.length; i += 4)
          for (let k = 0; k < 3; k++) {
            sum[k] += px[i + k];
            sq[k] += px[i + k] * px[i + k];
          }
        mean.push(sum.map((v) => Math.round(v / n)));
        spread.push(sum.reduce((acc, v, k) => acc + Math.sqrt(Math.max(0, sq[k] / n - (v / n) * (v / n))), 0) / 3);
      }
    return { mean, spread };
  }

  // Theo dõi xem hình trong khung có đứng yên không. Trả về { sample, still, steady } với still = số lần đo liên tiếp đứng yên.
  function watchFrame(tracker, canvas) {
    const sample = sampleFace(canvas);
    const prev = tracker.last;
    tracker.last = sample;
    let change = Infinity;
    if (prev) {
      change = 0;
      for (let i = 0; i < 9; i++) for (let k = 0; k < 3; k++) change = Math.max(change, Math.abs(sample.mean[i][k] - prev.mean[i][k]));
    }
    if (change > 14) {
      tracker.still = 0;
      tracker.moved = true;
    } else tracker.still++;
    return { sample, still: tracker.still, uniform: sample.spread.every((v) => v < 30) };
  }
  const flash = (canvas) => {
    canvas.classList.add('flash');
    setTimeout(() => canvas.classList.remove('flash'), 350);
  };

  // ---------- Quét khối bằng camera ----------
  // Người dùng xoay khối, đưa lần lượt 6 mặt vào khung lưới theo thứ tự và chiều bất kỳ.
  // App tự chụp khi mặt đứng yên, nhận ra mặt nào qua ô tâm, rồi tự suy ra chiều của từng mặt.
  const scan = { on: false, raf: 0, shots: [], last: null, still: 0, moved: true, checkedAt: 0, refs: null };
  const scanCanvas = $('#scanCanvas');

  function setScanStatus(text, good) {
    const node = $('#scanStatus');
    node.textContent = text;
    node.className = 'scan-status' + (good ? ' good' : '');
  }

  function renderScan() {
    $('#scanStep').textContent = `Đã chụp ${scan.shots.length} / 6 mặt`;
    const cells = [];
    for (let k = 0; k < 6; k++) {
      const shot = scan.shots[k];
      const b = el('button', 'scan-face' + (k === scan.shots.length ? ' current' : ''));
      const mini = el('div', 'mini');
      for (let i = 0; i < 9; i++) {
        const cell = el('i');
        if (shot) cell.style.background = `rgb(${shot[i].join(',')})`;
        mini.append(cell);
      }
      b.append(mini, el('span', '', shot ? 'bỏ' : `mặt ${k + 1}`));
      if (shot) {
        b.title = 'Bỏ mặt này để chụp lại';
        b.addEventListener('click', () => {
          scan.shots.splice(k, 1);
          scan.moved = true;
          renderScan();
        });
      } else b.disabled = true;
      cells.push(b);
    }
    $('#scanFaces').replaceChildren(...cells);
  }

  function takeShot(mean) {
    scan.shots.push(mean);
    scan.moved = false;
    scan.still = 0;
    flash(scanCanvas);
    if (scan.shots.length === 6) return finishScan();
    setScanStatus('Đã chụp! Xoay sang mặt khác.', true);
    renderScan();
  }

  // Gọi khoảng 10 lần mỗi giây: tự chụp khi mặt trong khung đứng yên, màu từng ô đều, và là mặt chưa chụp.
  function autoCheck() {
    const { sample, still, uniform } = watchFrame(scan, scanCanvas);
    if (!still) return setScanStatus('Đưa một mặt của khối vào khung lưới…');
    if (!uniform) return setScanStatus('Canh cho mỗi ô lưới nằm gọn trong một ô màu.');
    const center = Scan.features(sample.mean[4]);
    if (scan.shots.some((shot) => Scan.distance(Scan.features(shot[4]), center) < 9)) return setScanStatus('Mặt này đã chụp rồi, xoay sang mặt khác.');
    if (still >= 7 && scan.moved) return takeShot(sample.mean);
    setScanStatus('Giữ yên…');
  }

  function drawScan(now) {
    if (!scan.on) return;
    if (drawFrame(scanCanvas) && now - scan.checkedAt >= 100) {
      scan.checkedAt = now;
      autoCheck(); // lấy mẫu trước khi vẽ lưới đè lên ảnh
      if (!scan.on) return;
    }
    drawGrid(scanCanvas);
    scan.raf = requestAnimationFrame(drawScan);
  }

  function stopScan() {
    if (scan.on) closeCamera();
    scan.on = false;
    cancelAnimationFrame(scan.raf);
    $('#scanner').hidden = true;
    $('.scan-entry').hidden = false;
  }

  async function startScan() {
    stopLive();
    clearSolution();
    try {
      await openCamera('environment');
    } catch (e) {
      return setSolveMsg(e.message, 'error');
    }
    Object.assign(scan, { on: true, shots: [], last: null, still: 0, moved: true, checkedAt: 0 });
    $('#scanner').hidden = false;
    $('.scan-entry').hidden = true;
    setScanStatus('Đưa một mặt của khối vào khung lưới…');
    renderScan();
    cancelAnimationFrame(scan.raf);
    scan.raf = requestAnimationFrame(drawScan);
  }

  // Sau khi quét có thể có hơn một cách ghép 6 mặt thành khối hợp lệ (hiếm); cho người dùng đổi qua lại.
  const fits = { list: [], index: 0 };
  function showFit() {
    solve.net = fits.list[fits.index];
    renderNet();
    previewNet();
    $('#btnOtherFit').hidden = fits.list.length < 2;
  }

  function finishScan() {
    const faces = Scan.identify(scan.shots);
    // Giữ màu thật của 6 ô tâm làm màu mẫu cho bước giải cùng camera.
    scan.refs = Object.fromEntries(S.FACES.map((f) => [f, Scan.features(faces[f][4])]));
    const found = S.resolveOrientation(Scan.classify(faces), solver);
    stopScan();
    clearSolution();
    fits.list = found.exact ? found.candidates : [found.net];
    fits.index = 0;
    showFit();
    if (!found.exact)
      setSolveMsg('Đã quét đủ 6 mặt nhưng chưa ghép được thành một khối hợp lệ, nhiều khả năng có ô bị nhận sai màu. Hãy quét lại ở chỗ sáng đều hơn, hoặc tô tay.', 'error');
    else if (found.ambiguous)
      setSolveMsg(`Đã quét xong. Có ${fits.list.length} cách ghép hợp lệ: cầm khối trắng trên, xanh lá trước rồi so với hình; nếu chưa khớp, bấm "Thử cách ghép khác".`, 'ok');
    else setSolveMsg('Đã quét xong và tự nhận ra chiều của từng mặt. Bấm Giải để xem lời giải.', 'ok');
  }

  $('#btnScan').addEventListener('click', startScan);
  $('#btnCapture').addEventListener('click', () => {
    if (scan.on && drawFrame(scanCanvas)) takeShot(sampleFace(scanCanvas).mean);
  });
  $('#btnScanCancel').addEventListener('click', stopScan);
  $('#btnOtherFit').addEventListener('click', () => {
    fits.index = (fits.index + 1) % fits.list.length;
    const msg = $('#solveMsg').textContent;
    clearSolution();
    showFit();
    setSolveMsg(msg, 'ok');
  });

  // ---------- Giải cùng camera ----------
  // Camera chạy suốt lúc giải. Mặt khối hướng vào camera chính là mặt F của lời giải, nên mỗi lượt xoay
  // vẽ được thành mũi tên ngay trên khung lưới. Sau mỗi lượt, app đọc 9 ô đang thấy và so với trạng thái
  // mong đợi: khớp thì tự sang lượt kế, khớp với một lượt khác thì báo xoay nhầm và chỉ cách quay lại.
  const live = { on: false, raf: 0, index: 0, fronts: [], states: [], refs: {}, synced: false, undo: null, wrong: {}, facing: 'user', voice: true, last: null, still: 0, moved: true, checkedAt: 0, wake: null };
  const liveCanvas = $('#liveCanvas');
  const frontOf = (state) => {
    const out = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(C.stickerAt(state, [c - 1, r - 1, 1], [0, 0, 1]).face);
    return out;
  };
  const matches = (a, b) => a.reduce((n, x, i) => n + (x === b[i] ? 1 : 0), 0);
  const liveMoves = () => player.moves;

  function describeMove(move, mirror) {
    const twice = Math.abs(move.turns) === 2 ? ' hai lần' : '';
    const positive = move.turns > 0;
    const list = (layers, names) => layers.map((l) => names[l + 1]).join(' và ');
    if (move.axis === 'x') {
      if (move.layers.length === 3) return `Lật cả khối ${positive ? 'lên' : 'xuống'}${twice}`;
      const cols = move.layers.map((l) => (mirror ? -l : l)).sort((p, q) => p - q);
      return `Đẩy cột ${list(cols, ['trái', 'giữa', 'phải'])} ${positive ? 'lên' : 'xuống'}${twice}`;
    }
    if (move.axis === 'y') {
      const right = positive !== mirror;
      if (move.layers.length === 3) return `Xoay cả khối sang ${right ? 'phải' : 'trái'}${twice}`;
      return `Gạt hàng ${list(move.layers, ['trên', 'giữa', 'dưới'])} sang ${right ? 'phải' : 'trái'}${twice}`;
    }
    const what =
      move.layers.length === 3 ? 'cả khối như vặn vô lăng'
      : move.layers.join() === '1' ? 'mặt đang hướng vào camera'
      : move.layers.join() === '-1' ? 'mặt phía sau, quay lưng với camera'
      : move.layers.join() === '0' ? 'lớp giữa, song song với màn hình'
      : move.layers.includes(1) ? 'hai lớp phía camera' : 'hai lớp phía sau';
    return `Xoay ${what} theo chiều mũi tên${twice}`;
  }

  function strokeBoth(ctx, color, draw) {
    for (const [c, w] of [['rgba(0,0,0,0.7)', 15], [color, 8]]) {
      ctx.strokeStyle = c;
      ctx.fillStyle = c;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      draw(w);
    }
  }
  function arrowHead(ctx, x, y, dx, dy, size) {
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    ctx.beginPath();
    ctx.moveTo(x + ux * size, y + uy * size);
    ctx.lineTo(x - uy * size * 0.8, y + ux * size * 0.8);
    ctx.lineTo(x + uy * size * 0.8, y - ux * size * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  function drawStraight(ctx, x1, y1, x2, y2, color) {
    strokeBoth(ctx, color, (w) => {
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      arrowHead(ctx, x2, y2, x2 - x1, y2 - y1, w * 1.6);
    });
  }
  function drawArc(ctx, cx, cy, r, clockwise, color, dashed) {
    const start = -0.75 * Math.PI;
    const end = start + (clockwise ? 1.5 : -1.5) * Math.PI;
    strokeBoth(ctx, color, (w) => {
      ctx.setLineDash(dashed ? [w * 1.8, w * 1.8] : []);
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, end, !clockwise);
      ctx.stroke();
      ctx.setLineDash([]);
      const s = clockwise ? 1 : -1;
      arrowHead(ctx, cx + r * Math.cos(end), cy + r * Math.sin(end), -Math.sin(end) * s, Math.cos(end) * s, w * 1.6);
    });
  }

  // Vẽ một lượt xoay lên khung lưới, theo góc nhìn của camera vào mặt F.
  function drawMove(canvas, move, color) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const a = GRID.from * w;
    const cell = (GRID.size * w) / 3;
    const mid = a + 1.5 * cell;
    const positive = move.turns > 0;
    const near = a + 0.25 * cell;
    const far = a + 2.75 * cell;
    if (move.axis === 'x')
      for (const l of move.layers) {
        const x = a + (l + 1.5) * cell;
        drawStraight(ctx, x, positive ? far : near, x, positive ? near : far, color); // xoay dương quanh x: mặt trước đi lên
      }
    else if (move.axis === 'y')
      for (const l of move.layers) {
        const y = a + (l + 1.5) * cell;
        drawStraight(ctx, positive ? near : far, y, positive ? far : near, y, color); // xoay dương quanh y: mặt trước đi sang phải
      }
    else {
      if (move.layers.includes(1)) drawArc(ctx, mid, mid, cell, positive, color, false);
      if (move.layers.includes(0) && move.layers.length < 3) drawArc(ctx, mid, mid, cell * 1.42, positive, color, true);
      if (move.layers.includes(-1)) drawArc(ctx, mid, mid, cell * 1.78, positive, color, move.layers.length < 3);
    }
    if (Math.abs(move.turns) === 2) {
      ctx.save();
      if (canvas.classList.contains('mirror')) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.font = `700 ${Math.round(w * 0.11)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText('×2', mid, mid);
      ctx.fillStyle = color;
      ctx.fillText('×2', mid, mid);
      ctx.restore();
    }
  }

  function speak(text) {
    if (!live.voice || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'vi-VN';
      window.speechSynthesis.speak(u);
    } catch (e) { /* không đọc được thì thôi */ }
  }

  function setLiveStatus(text, kind) {
    const node = $('#liveStatus');
    node.textContent = text;
    node.className = 'scan-status' + (kind ? ' ' + kind : '');
  }

  function renderLive(announce) {
    const moves = liveMoves();
    const done = live.index >= moves.length;
    const mirror = live.facing === 'user';
    liveCanvas.classList.toggle('mirror', mirror);
    const stage = currentStage();
    const stageName = stage >= 0 ? player.item.stages[stage].name : '';
    $('#liveStep').textContent = done ? `Xong ${moves.length} / ${moves.length} lượt` : `Lượt ${live.index + 1} / ${moves.length} · ${stageName}`;
    const text = done ? 'Khối đã được giải xong!' : !live.synced ? 'Giơ mặt tâm xanh lá vào khung, tâm trắng ở trên' : describeMove(moves[live.index], mirror);
    $('#liveMove').textContent = text;
    $('#btnLiveBack').disabled = live.index === 0;
    $('#btnLiveDone').disabled = done || !live.synced;
    $('#btnLiveVoice').textContent = live.voice ? 'Tắt tiếng' : 'Bật tiếng';
    if (announce) speak(text);
  }

  // Cập nhật màu mẫu từ một khung hình mà ta biết chắc màu của từng ô.
  function learnColors(expected, mean, rate) {
    expected.forEach((c, i) => {
      const f = Scan.features(mean[i]);
      live.refs[c] = live.refs[c].map((v, k) => v * (1 - rate) + f[k] * rate);
    });
  }
  const readColors = (mean) =>
    mean.map((rgb) => {
      const f = Scan.features(rgb);
      let best = null;
      for (const c of S.FACES) {
        const d = Scan.distance(f, live.refs[c]);
        if (!best || d < best.d) best = { c, d };
      }
      return best.c;
    });

  function liveGo(index, mean) {
    live.index = Math.max(0, Math.min(liveMoves().length, index));
    live.undo = null;
    live.moved = false;
    if (mean) learnColors(live.fronts[live.index], mean, 0.3);
    seek(live.index);
    flash(liveCanvas);
    setLiveStatus(live.index >= liveMoves().length ? 'Hoàn thành!' : 'Đúng rồi, tiếp tục.', 'good');
    renderLive(true);
  }

  // Các lượt xoay một mặt có thể bị làm nhầm từ trạng thái hiện tại, kèm mặt F sau khi xoay.
  function wrongMoves(index) {
    if (!live.wrong[index]) {
      const out = [];
      for (const f of ['U', 'D', 'R', 'L', 'F', 'B'])
        for (const suffix of ['', "'", '2']) {
          const move = C.parseAlg(f + suffix)[0];
          out.push({ move, front: frontOf(C.applyMove(C.clone(live.states[index]), move)) });
        }
      live.wrong = { [index]: out };
    }
    return live.wrong[index];
  }

  function liveCheck() {
    const { sample, still, uniform } = watchFrame(live, liveCanvas);
    const moves = liveMoves();
    if (live.index >= moves.length) return;
    if (!still || !uniform) return;
    if (still < 4) return;

    if (!live.synced) {
      // Khung hình đứng yên đầu tiên được coi là mặt xanh lá ban đầu; lấy luôn màu thật của nó làm mẫu.
      learnColors(live.fronts[0], sample.mean, 0.6);
      live.synced = true;
      live.moved = false;
      setLiveStatus('Đã nhận khối. Làm theo mũi tên.', 'good');
      return renderLive(true);
    }

    const seen = readColors(sample.mean);
    const cur = live.fronts[live.index];
    const next = live.fronts[live.index + 1];
    const visible = matches(cur, next) < 9;
    if (visible && matches(seen, next) >= 8 && matches(seen, next) > matches(seen, cur)) return liveGo(live.index + 1, sample.mean);
    if (matches(seen, cur) >= 8) {
      live.undo = null;
      return setLiveStatus(visible ? 'Làm theo mũi tên rồi đưa khối về lại khung.' : 'Lượt này camera không nhìn thấy được. Xoay xong thì bấm "Xong lượt này".');
    }
    const move = moves[live.index];
    if (Math.abs(move.turns) === 2) {
      // Lượt xoay 180 độ: mới xoay được một nửa.
      const half = [1, -1].some((t) => matches(seen, frontOf(C.applyMove(C.clone(live.states[live.index]), C.makeMove(move.base, t)))) >= 8);
      if (half) return setLiveStatus('Xoay thêm một lần nữa theo cùng chiều.');
    }
    const slip = wrongMoves(live.index).find((w) => matches(seen, w.front) >= 8 && matches(w.front, cur) < 8);
    if (slip) {
      live.undo = C.invertMove(slip.move);
      const text = `Xoay nhầm rồi. ${describeMove(live.undo, live.facing === 'user')} (mũi tên đỏ) để quay lại.`;
      if ($('#liveStatus').textContent !== text) speak('Xoay nhầm rồi, làm theo mũi tên đỏ để quay lại');
      return setLiveStatus(text, 'bad');
    }
    setLiveStatus('Chưa nhận ra mặt này. Đưa mặt đang giải vào vừa khít khung lưới.');
  }

  function drawLive(now) {
    if (!live.on) return;
    if (drawFrame(liveCanvas) && now - live.checkedAt >= 100) {
      live.checkedAt = now;
      liveCheck(); // lấy mẫu trước khi vẽ lưới và mũi tên đè lên ảnh
      if (!live.on) return;
    }
    drawGrid(liveCanvas);
    if (live.synced && live.index < liveMoves().length) {
      if (live.undo) drawMove(liveCanvas, live.undo, '#ff4d4d');
      else drawMove(liveCanvas, liveMoves()[live.index], '#3ddc84');
    }
    live.raf = requestAnimationFrame(drawLive);
  }

  function stopLive() {
    if (live.on) closeCamera();
    live.on = false;
    cancelAnimationFrame(live.raf);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (live.wake) live.wake.release().catch(() => {});
    live.wake = null;
    $('#live').hidden = true;
    $('#btnLive').hidden = !solve.solution;
  }

  async function startLive() {
    if (!solve.solution) return;
    stopScan();
    try {
      await openCamera(live.facing);
    } catch (e) {
      return setSolveMsg(e.message, 'error');
    }
    seek(0);
    // Trạng thái của khối và mặt F trước mỗi lượt xoay.
    live.states = [C.clone(player.setup)];
    for (const m of liveMoves()) live.states.push(C.applyMove(C.clone(live.states[live.states.length - 1]), m));
    live.fronts = live.states.map(frontOf);
    live.refs = Object.fromEntries(S.FACES.map((f) => [f, (scan.refs && scan.refs[f]) || Scan.features(Scan.NOMINAL[f])]));
    Object.assign(live, { on: true, index: 0, synced: false, undo: null, wrong: {}, last: null, still: 0, moved: true, checkedAt: 0 });
    try {
      if (navigator.wakeLock) live.wake = await navigator.wakeLock.request('screen'); // giữ màn hình luôn sáng
    } catch (e) { /* không giữ được thì thôi */ }
    $('#live').hidden = false;
    $('#btnLive').hidden = true;
    setLiveStatus('Đang chờ khối vào khung…');
    renderLive(true);
    cancelAnimationFrame(live.raf);
    live.raf = requestAnimationFrame(drawLive);
    $('#live').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#btnLive').addEventListener('click', startLive);
  $('#btnLiveClose').addEventListener('click', stopLive);
  $('#btnLiveDone').addEventListener('click', () => liveGo(live.index + 1));
  $('#btnLiveBack').addEventListener('click', () => liveGo(live.index - 1));
  $('#btnLiveVoice').addEventListener('click', () => {
    live.voice = !live.voice;
    if (!live.voice && window.speechSynthesis) window.speechSynthesis.cancel();
    renderLive(false);
  });
  $('#btnLiveFlip').addEventListener('click', async () => {
    live.facing = live.facing === 'user' ? 'environment' : 'user';
    try {
      await openCamera(live.facing);
    } catch (e) {
      stopLive();
      return setSolveMsg(e.message, 'error');
    }
    renderLive(false);
  });

  $('#btnSolve').addEventListener('click', runSolve);
  $('#btnNetClear').addEventListener('click', () => {
    $('#btnOtherFit').hidden = true;
    solve.net = blankNet();
    clearSolution();
    renderNet();
    view.setState(C.createSolved());
  });
  $('#btnNetRandom').addEventListener('click', () => {
    $('#btnOtherFit').hidden = true;
    solve.net = S.faceletsFromState(C.applyAlg(C.createSolved(), C.parseAlg(C.randomScramble(25))));
    clearSolution();
    renderNet();
    previewNet();
  });

  // ---------- Bấm giờ ----------
  const timer = { running: false, t0: 0, tick: 0, scramble: '', times: store.get('rubik.times', []) };
  const timerDisplay = $('#timerDisplay');

  const formatTime = (ms) => {
    const s = ms / 1000;
    if (s < 60) return s.toFixed(2);
    const m = Math.floor(s / 60);
    return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
  };
  // Trung bình n lần gần nhất, bỏ lần nhanh nhất và chậm nhất (cách tính chuẩn của giới speedcubing).
  const averageOf = (n) => {
    if (timer.times.length < n) return null;
    const recent = timer.times.slice(0, n).map((t) => t.ms).sort((a, b) => a - b);
    const mid = recent.slice(1, -1);
    return mid.reduce((a, b) => a + b, 0) / mid.length;
  };

  function newScramble() {
    timer.scramble = C.randomScramble(20);
    $('#timerScramble').textContent = timer.scramble;
    view.setMask(null);
    view.setState(C.applyAlg(C.createSolved(), C.parseAlg(timer.scramble)));
  }

  function renderTimes() {
    const all = timer.times.map((t) => t.ms);
    const stat = (label, value) => {
      const box = el('div', 'stat');
      box.append(el('span', '', label), el('b', '', value == null ? '–' : formatTime(value)));
      return box;
    };
    const count = el('div', 'stat');
    count.append(el('span', '', 'Số lần'), el('b', '', String(all.length)));
    $('#timerStats').replaceChildren(
      count,
      stat('Nhanh nhất', all.length ? Math.min(...all) : null),
      stat('TB 5 lần', averageOf(5)),
      stat('TB 12 lần', averageOf(12)),
      stat('TB tất cả', all.length ? all.reduce((a, b) => a + b, 0) / all.length : null)
    );
    $('#times').replaceChildren(
      ...timer.times.slice(0, 50).map((t, i) => {
        const li = el('li');
        const del = el('button', '', '×');
        del.title = 'Xoá lần này';
        del.addEventListener('click', () => {
          timer.times.splice(i, 1);
          store.set('rubik.times', timer.times);
          renderTimes();
        });
        li.append(el('span', 'n', String(timer.times.length - i)), el('span', 't', formatTime(t.ms)), el('span', 's', t.scramble), del);
        return li;
      })
    );
  }

  function stopTimer(record) {
    if (!timer.running) return;
    timer.running = false;
    clearInterval(timer.tick);
    timerDisplay.classList.remove('running');
    const ms = performance.now() - timer.t0;
    if (!record) {
      timerDisplay.textContent = '0.00';
      return;
    }
    timerDisplay.textContent = formatTime(ms);
    timer.times.unshift({ ms: Math.round(ms), scramble: timer.scramble, at: Date.now() });
    timer.times = timer.times.slice(0, 500);
    store.set('rubik.times', timer.times);
    renderTimes();
    newScramble();
  }

  function toggleTimer() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (timer.running) return stopTimer(true);
    timer.running = true;
    timer.t0 = performance.now();
    timerDisplay.classList.add('running');
    timer.tick = setInterval(() => {
      timerDisplay.textContent = formatTime(performance.now() - timer.t0);
    }, 43);
  }

  timerDisplay.addEventListener('click', toggleTimer);
  $('#btnNewScramble').addEventListener('click', () => {
    if (!timer.running) newScramble();
  });
  $('#btnClearTimes').addEventListener('click', () => {
    if (!timer.times.length || !window.confirm('Xoá toàn bộ lịch sử bấm giờ?')) return;
    timer.times = [];
    store.set('rubik.times', timer.times);
    renderTimes();
  });

  // ---------- Xoay tự do ----------
  const free = { queue: [], running: false, scrambled: false, gen: 0 };
  const freeStatus = $('#freeStatus');

  function setFreeStatus(text, solved) {
    freeStatus.textContent = text;
    freeStatus.classList.toggle('solved', !!solved);
  }

  async function runFreeQueue() {
    if (free.running) return;
    free.running = true;
    const gen = free.gen;
    while (free.queue.length && gen === free.gen) {
      const { move, ms, user } = free.queue.shift();
      const ok = await view.animateMove(move, ms);
      if (!ok || gen !== free.gen) break;
      if (user && free.scrambled && C.isSolved(view.state)) {
        free.scrambled = false;
        setFreeStatus('Đã giải xong!', true);
      }
    }
    if (gen === free.gen) free.running = false;
  }

  function freeMoves(moves, ms, user) {
    for (const move of moves) free.queue.push({ move, ms: ms || 220, user });
    runFreeQueue();
  }
  const freeMove = (text, ms, user) => freeMoves(C.parseAlg(text), ms, user);

  function stopFree() {
    free.gen++;
    free.queue = [];
    free.running = false;
  }

  function freeReset() {
    stopFree();
    free.scrambled = false;
    view.setMask(null);
    view.setState(C.createSolved());
    $('#scrambleText').textContent = '';
    setFreeStatus('Khối đã giải. Bấm Xáo trộn để bắt đầu.');
  }

  function buildFreeControls() {
    const grid = $('#moveGrid');
    for (const suffix of ['', "'", '2'])
      for (const f of ['R', 'L', 'U', 'D', 'F', 'B']) {
        const b = el('button', '', f + suffix);
        b.addEventListener('click', () => freeMove(f + suffix, 220, true));
        grid.append(b);
      }
    $('#btnScramble').addEventListener('click', () => {
      freeReset();
      const scramble = C.randomScramble(20);
      $('#scrambleText').textContent = scramble;
      free.scrambled = true;
      setFreeStatus('Đã xáo trộn. Thử giải xem!');
      freeMove(scramble, 90, false);
    });
    $('#btnSolved').addEventListener('click', freeReset);
  }

  // ---------- Bàn phím ----------
  let currentView = 'learn';
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (currentView === 'timer' && e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) toggleTimer();
      return;
    }
    if (currentView !== 'free') return;
    const key = e.key.toUpperCase();
    if (key.length !== 1 || !'RLUDFB'.includes(key)) return;
    e.preventDefault();
    freeMove(key + (e.shiftKey ? "'" : ''), 220, true);
  });

  // ---------- Chuyển tab ----------
  const VIEWS = ['learn', 'library', 'practice', 'solve', 'timer', 'free'];
  const HINT = 'Kéo để đổi góc nhìn · nhấp đúp để về góc mặc định';
  const HINT_FREE = 'Kéo trên khối để xoay từng mặt · kéo bên ngoài khối để đổi góc nhìn';

  function setView(name) {
    currentView = name;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
    for (const v of VIEWS) $('#view-' + v).hidden = v !== name;
    try {
      history.replaceState(null, '', '#' + name);
    } catch (e) { /* bỏ qua */ }

    document.body.dataset.view = name;
    stopPlayer();
    stopFree();
    stopTimer(false);
    stopScan();
    stopLive();
    player.onUpdate = null;
    view.turnHandler = null;
    playerEl.hidden = name !== 'learn' && name !== 'library';
    freeStatus.hidden = name !== 'free';
    $('#stageHint').textContent = name === 'free' ? HINT_FREE : HINT;

    if (name === 'learn') openLesson(lessonIndex, caseIndex);
    else if (name === 'library') {
      loadAlg(D.algorithms.find((a) => a.id === activeAlgId));
      renderLibrary();
    } else if (name === 'practice') nextCard();
    else if (name === 'solve') {
      renderNet();
      if (solve.solution) showSolution();
      else if (!previewNet().state) view.setState(C.createSolved());
    } else if (name === 'timer') {
      renderTimes();
      newScramble();
    } else {
      freeReset();
      view.turnHandler = (move) => freeMoves([move], 200, true);
    }
  }

  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));

  buildFreeControls();
  const initial = location.hash.slice(1);
  setView(VIEWS.includes(initial) ? initial : 'learn');

  // Dùng cho việc kiểm thử thủ công trong console.
  window.rubikApp = { view, player, solve, timer, practice, scan, live, setView, loadAlg, seek, openLesson };
})();
