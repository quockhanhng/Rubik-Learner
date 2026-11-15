/*
 * Bộ OLL và PLL đầy đủ (phần chưa có trong bản 2 bước).
 * OLL 21-27 (đã có chữ thập) và các PLL T, Y, Ua, Ub, H, Z nằm sẵn trong js/data.js.
 * Nhóm của từng OLL được tính tự động từ hình dạng các cạnh vàng trong js/data.js.
 */
(function (root) {
  'use strict';

  const oll = {
    1: "R U2 R2 F R F' U2 R' F R F'",
    2: "r U r' U2 r U2 R' U2 R U' r'",
    3: "f R U R' U' f' U' F R U R' U' F'",
    4: "f R U R' U' f' U F R U R' U' F'",
    5: "r' U2 R U R' U r",
    6: "r U2 R' U' R U' r'",
    7: "r U R' U R U2 r'",
    8: "r' U' R U' R' U2 r",
    9: "R U R' U' R' F R2 U R' U' F'",
    10: "R U R' U R' F R F' R U2 R'",
    11: "r U R' U R' F R F' R U2 r'",
    12: "M' R' U' R U' R' U2 R U' R r'",
    13: "F U R U' R2 F' R U R U' R'",
    14: "R' F R U R' F' R F U' F'",
    15: "r' U' r R' U' R U r' U r",
    16: "r U r' R U R' U' r U' r'",
    17: "F R' F' R2 r' U R U' R' U' M'",
    18: "r U R' U R U2 r2 U' R U' R' U2 r",
    19: "r' R U R U R' U' M' R' F R F'",
    20: "r U R' U' M2 U R U' R' U' M'",
    28: "r U R' U' r' R U R U' R'",
    29: "R U R' U' R U' R' F' U' F R U R'",
    30: "F R' F R2 U' R' U' R U R' F2",
    31: "R' U' F U R U' R' F' R",
    32: "L U F' U' L' U L F L'",
    33: "R U R' U' R' F R F'",
    34: "R U R2 U' R' F R U R U' F'",
    35: "R U2 R2 F R F' R U2 R'",
    36: "L' U' L U' L' U L U L F' L' F",
    37: "F R' F' R U R U' R'",
    38: "R U R' U R U' R' U' R' F R F'",
    39: "L F' L' U' L U F U' L'",
    40: "R' F R U R' U' F' U R",
    41: "R U R' U R U2 R' F R U R' U' F'",
    42: "R' U' R U' R' U2 R F R U R' U' F'",
    43: "R' U' F' U F R",
    44: "f R U R' U' f'",
    45: "F R U R' U' F'",
    46: "R' U' R' F R F' U R",
    47: "F' L' U' L U L' U' L U F",
    48: "F R U R' U' R U R' U' F'",
    49: "r U' r2 U r2 U r2 U' r",
    50: "r' U r2 U' r2 U' r2 U r'",
    51: "f R U R' U' R U R' U' f'",
    52: "R U R' U R U' B U' B' R'",
    53: "r' U' R U' R' U R U' R' U2 r",
    54: "r U R' U R U' R' U R U2 r'",
    55: "R U2 R2 U' R U' R' U2 F R F'",
    56: "r U r' U R U' R' U R U' R' r U' r'",
    57: "R U R' U' M' U R U' r'",
  };

  const pll = [
    { id: 'pll-aa', group: 'pll-x-corner', name: 'Aa perm', alg: "x R' U R' D2 R U' R' D2 R2 x'", note: 'Xoay vòng 3 góc, các cạnh giữ nguyên.' },
    { id: 'pll-ab', group: 'pll-x-corner', name: 'Ab perm', alg: "x R2 D2 R U R' D2 R U' R x'", note: 'Xoay vòng 3 góc theo chiều ngược lại.' },
    { id: 'pll-e', group: 'pll-x-corner', name: 'E perm', alg: "x' R U' R' D R U R' D' R U R' D R U' R' D' x", note: 'Đổi chỗ hai cặp góc kề nhau, các cạnh giữ nguyên.' },
    { id: 'pll-f', group: 'pll-x-adj', name: 'F perm', alg: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R", note: 'Đổi 2 góc kề và 2 cạnh; có một mặt bên hoàn chỉnh.' },
    { id: 'pll-ja', group: 'pll-x-adj', name: 'Ja perm', alg: "x R2 F R F' R U2 r' U r U2 x'", note: 'Đổi 2 góc kề và 2 cạnh kề; có một khối 3 ô và một khối 2 ô.' },
    { id: 'pll-jb', group: 'pll-x-adj', name: 'Jb perm', alg: "R U R' F' R U R' U' R' F R2 U' R'", note: 'Bản đối xứng của Ja.' },
    { id: 'pll-ra', group: 'pll-x-adj', name: 'Ra perm', alg: "R U' R' U' R U R D R' U' R D' R' U2 R'", note: 'Đổi 2 góc kề và 2 cạnh kề.' },
    { id: 'pll-rb', group: 'pll-x-adj', name: 'Rb perm', alg: "R2 F R U R U' R' F' R U2 R' U2 R", note: 'Bản đối xứng của Ra.' },
    { id: 'pll-ga', group: 'pll-x-g', name: 'Ga perm', alg: "R2 U R' U R' U' R U' R2 U' D R' U R D'", note: 'Xoay vòng 3 góc và 3 cạnh cùng lúc.' },
    { id: 'pll-gb', group: 'pll-x-g', name: 'Gb perm', alg: "R' U' R U D' R2 U R' U R U' R U' R2 D", note: 'Bản ngược của Ga.' },
    { id: 'pll-gc', group: 'pll-x-g', name: 'Gc perm', alg: "R2 U' R U' R U R' U R2 U D' R U' R' D", note: 'Bản đối xứng của Ga.' },
    { id: 'pll-gd', group: 'pll-x-g', name: 'Gd perm', alg: "R U R' U' D R2 U' R U' R' U R' U R2 D'", note: 'Bản ngược của Gc.' },
    { id: 'pll-v', group: 'pll-x-diag', name: 'V perm', alg: "R' U R' U' y R' F' R2 U' R' U R' F R F", note: 'Đổi 2 góc chéo và 2 cạnh kề.' },
    { id: 'pll-na', group: 'pll-x-diag', name: 'Na perm', alg: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'", note: 'Đổi 2 góc chéo và 2 cạnh đối.' },
    { id: 'pll-nb', group: 'pll-x-diag', name: 'Nb perm', alg: "R' U R U' R' F' U' F R U R' F R' F' R U' R", note: 'Bản đối xứng của Na.' },
  ];

  const data = { oll, pll };
  root.RUBIK_LL = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
