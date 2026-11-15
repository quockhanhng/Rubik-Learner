/*
 * Khối rubik 3D dựng bằng CSS transform (không cần thư viện ngoài).
 * Mỗi viên là một hộp 6 mặt; lượt xoay được vẽ bằng cách quay các viên của lớp đó quanh tâm khối.
 */
(function () {
  'use strict';
  const C = window.Cube;

  const FACES = [
    { cls: 'f-front', n: [0, 0, 1] },
    { cls: 'f-back', n: [0, 0, -1] },
    { cls: 'f-right', n: [1, 0, 0] },
    { cls: 'f-left', n: [-1, 0, 0] },
    { cls: 'f-top', n: [0, -1, 0] },
    { cls: 'f-bottom', n: [0, 1, 0] },
  ];
  const FACE_KEY = (n) =>
    n[0] === 1 ? 'R' : n[0] === -1 ? 'L' : n[1] === -1 ? 'U' : n[1] === 1 ? 'D' : n[2] === 1 ? 'F' : 'B';

  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  class CubeView {
    constructor(sceneEl) {
      this.scene = sceneEl;
      this.rotX = -28;
      this.rotY = -35;
      this.state = C.createSolved();
      this.mask = null;
      this.anim = null;
      // Nếu được gán, kéo trên một ô màu sẽ xoay lớp đó thay vì đổi góc nhìn: turnHandler(move).
      this.turnHandler = null;
      this.els = [];
      this.base = [];
      this.stickers = [];

      this.cubeEl = document.createElement('div');
      this.cubeEl.className = 'cube';
      this.scene.appendChild(this.cubeEl);

      this.build();
      this.applyView();
      this.renderAll();
      this.bindDrag();
    }

    build() {
      this.state.cubies.forEach((cubie, i) => {
        const el = document.createElement('div');
        el.className = 'cubie';
        for (const f of FACES) {
          const face = document.createElement('div');
          face.className = 'face ' + f.cls;
          face._info = { i, n: f.n };
          const k = f.n.findIndex((v) => v !== 0);
          if (cubie.home[k] === f.n[k]) {
            const st = document.createElement('div');
            st.className = 'sticker c-' + FACE_KEY(f.n);
            face.appendChild(st);
            this.stickers.push({ el: st, home: cubie.home, n: f.n });
          }
          el.appendChild(face);
        }
        this.cubeEl.appendChild(el);
        this.els[i] = el;
      });
    }

    baseTransform(cubie) {
      const [x, y, z] = cubie.pos;
      const r = cubie.rot;
      return (
        `translate3d(calc(var(--s) * ${x}), calc(var(--s) * ${y}), calc(var(--s) * ${z})) ` +
        `matrix3d(${r[0][0]},${r[1][0]},${r[2][0]},0,${r[0][1]},${r[1][1]},${r[2][1]},0,` +
        `${r[0][2]},${r[1][2]},${r[2][2]},0,0,0,0,1)`
      );
    }

    renderCubie(i) {
      this.base[i] = this.baseTransform(this.state.cubies[i]);
      this.els[i].style.transform = this.base[i];
    }
    renderAll() {
      for (let i = 0; i < this.els.length; i++) this.renderCubie(i);
    }

    applyView() {
      this.cubeEl.style.transform = `rotateX(${this.rotX}deg) rotateY(${this.rotY}deg)`;
    }
    resetView() {
      this.rotX = -28;
      this.rotY = -35;
      this.applyView();
    }

    setState(state) {
      this.cancel();
      this.state = C.clone(state);
      this.renderAll();
    }

    // fn(home, normal) trả về true nếu ô màu được tô sáng; null = tô sáng tất cả.
    setMask(fn) {
      this.mask = fn || null;
      for (const s of this.stickers) s.el.classList.toggle('dim', !!fn && !fn(s.home, s.n));
    }

    applyInstant(move) {
      this.cancel();
      C.applyMove(this.state, move);
      this.renderAll();
    }

    // Chạy animation một lượt xoay. Promise trả về false nếu bị huỷ giữa chừng.
    animateMove(move, duration) {
      this.cancel();
      if (!duration || duration <= 0) {
        this.applyInstant(move);
        return Promise.resolve(true);
      }
      return new Promise((resolve) => {
        const idx = C.AXIS_INDEX[move.axis];
        const targets = [];
        this.state.cubies.forEach((c, i) => {
          if (move.layers.includes(c.pos[idx])) targets.push(i);
        });
        const total = move.turns * 90;
        const fn = 'rotate' + move.axis.toUpperCase();
        const anim = { cancelled: false, resolve, raf: 0 };
        this.anim = anim;
        let start = null;
        const tick = (now) => {
          if (anim.cancelled) return;
          if (start === null) start = now;
          const t = Math.min(1, (now - start) / duration);
          const angle = total * ease(t);
          for (const i of targets) this.els[i].style.transform = `${fn}(${angle}deg) ${this.base[i]}`;
          if (t < 1) {
            anim.raf = requestAnimationFrame(tick);
          } else {
            C.applyMove(this.state, move);
            for (const i of targets) this.renderCubie(i);
            this.anim = null;
            resolve(true);
          }
        };
        anim.raf = requestAnimationFrame(tick);
      });
    }

    cancel() {
      const anim = this.anim;
      if (!anim) return;
      anim.cancelled = true;
      cancelAnimationFrame(anim.raf);
      this.anim = null;
      this.renderAll();
      anim.resolve(false);
    }

    // Chiếu một vectơ 3D lên màn hình theo góc nhìn hiện tại (bỏ qua phối cảnh).
    project(v) {
      const a = (this.rotX * Math.PI) / 180;
      const b = (this.rotY * Math.PI) / 180;
      const x1 = v[0] * Math.cos(b) + v[2] * Math.sin(b);
      const z1 = -v[0] * Math.sin(b) + v[2] * Math.cos(b);
      return [x1, v[1] * Math.cos(a) - z1 * Math.sin(a)];
    }

    // Từ ô màu được kéo và hướng kéo trên màn hình, suy ra lớp nào xoay và xoay chiều nào.
    turnFromDrag(info, dx, dy) {
      const cubie = this.state.cubies[info.i];
      const d = C.matVec(cubie.rot, info.n);
      const q = cubie.pos.map((v, k) => v + d[k] * 0.5);
      // Hướng chuyển động của điểm q khi xoay chiều dương (theo CSS) quanh từng trục.
      const tangent = { x: [0, -q[2], q[1]], y: [q[2], 0, -q[0]], z: [-q[1], q[0], 0] };
      let best = null;
      for (const axis of ['x', 'y', 'z']) {
        const k = C.AXIS_INDEX[axis];
        if (d[k] !== 0) continue;
        const [sx, sy] = this.project(tangent[axis]);
        const len = Math.hypot(sx, sy);
        if (len < 1e-6) continue;
        const score = (sx * dx + sy * dy) / len;
        if (!best || Math.abs(score) > Math.abs(best.score)) best = { axis, score, layer: cubie.pos[k] };
      }
      return best ? C.moveFromLayer(best.axis, best.layer, best.score > 0 ? 1 : -1) : null;
    }

    bindDrag() {
      let last = null;
      let turn = null;
      this.scene.addEventListener('pointerdown', (e) => {
        const face = e.target.closest ? e.target.closest('.face') : null;
        if (this.turnHandler && face && face._info) turn = { x: e.clientX, y: e.clientY, info: face._info, done: false };
        else last = { x: e.clientX, y: e.clientY };
        try {
          this.scene.setPointerCapture(e.pointerId);
        } catch (err) { /* sự kiện giả lập không có con trỏ thật */ }
        this.scene.classList.add('dragging');
      });
      this.scene.addEventListener('pointermove', (e) => {
        if (turn) {
          const dx = e.clientX - turn.x;
          const dy = e.clientY - turn.y;
          if (turn.done || Math.hypot(dx, dy) < 14) return;
          turn.done = true;
          const move = this.turnFromDrag(turn.info, dx, dy);
          if (move && this.turnHandler) this.turnHandler(move);
          return;
        }
        if (!last) return;
        this.rotY += (e.clientX - last.x) * 0.5;
        this.rotX = Math.max(-90, Math.min(90, this.rotX - (e.clientY - last.y) * 0.5));
        last = { x: e.clientX, y: e.clientY };
        this.applyView();
      });
      const end = () => {
        last = null;
        turn = null;
        this.scene.classList.remove('dragging');
      };
      this.scene.addEventListener('pointerup', end);
      this.scene.addEventListener('pointercancel', end);
      this.scene.addEventListener('dblclick', (e) => {
        if (this.turnHandler && e.target.closest('.face')) return;
        this.resetView();
      });
    }
  }

  window.CubeView = CubeView;
})();
