/*
 * 41 trường hợp F2L cho khe phải phía trước (trắng ở dưới).
 * File này do tools/gen-f2l.js sinh ra, đừng sửa tay: chạy lại `node tools/gen-f2l.js`.
 */
(function (root) {
  'use strict';
  const list = [
    { id: 'f2l-01', group: 'f2l-basic', name: 'F2L 1', alg: "F' U F", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay ra sau; cạnh ở tầng trên." },
    { id: 'f2l-02', group: 'f2l-basic', name: 'F2L 2', alg: "F' U' F", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay ra trước; cạnh ở tầng trên." },
    { id: 'f2l-03', group: 'f2l-basic', name: 'F2L 3', alg: "R U R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay sang phải; cạnh ở tầng trên." },
    { id: 'f2l-04', group: 'f2l-basic', name: 'F2L 4', alg: "R U' R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay sang trái; cạnh ở tầng trên." },
    { id: 'f2l-05', group: 'f2l-side', name: 'F2L 5', alg: "F' U F U' F' U' F", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay sang trái; cạnh ở tầng trên." },
    { id: 'f2l-06', group: 'f2l-side', name: 'F2L 6', alg: "F' U' F U2 F' U F", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay ra trước; cạnh ở tầng trên." },
    { id: 'f2l-07', group: 'f2l-side', name: 'F2L 7', alg: "F' U2 F U' R U R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay ra trước; cạnh ở tầng trên." },
    { id: 'f2l-08', group: 'f2l-side', name: 'F2L 8', alg: "F' U2 F U2 F' U F", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay ra trước; cạnh ở tầng trên." },
    { id: 'f2l-09', group: 'f2l-side', name: 'F2L 9', alg: "R U R' U2 R U' R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay sang phải; cạnh ở tầng trên." },
    { id: 'f2l-10', group: 'f2l-side', name: 'F2L 10', alg: "R U' R' U F' U' F", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay sang phải; cạnh ở tầng trên." },
    { id: 'f2l-11', group: 'f2l-side', name: 'F2L 11', alg: "R U' R' U R U R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay ra sau; cạnh ở tầng trên." },
    { id: 'f2l-12', group: 'f2l-side', name: 'F2L 12', alg: "R U' R' U' R U R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay sang trái; cạnh ở tầng trên." },
    { id: 'f2l-13', group: 'f2l-side', name: 'F2L 13', alg: "R U' R' U2 F' U' F", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay sang phải; cạnh ở tầng trên." },
    { id: 'f2l-14', group: 'f2l-side', name: 'F2L 14', alg: "R U2 R' U F' U' F", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay sang phải; cạnh ở tầng trên." },
    { id: 'f2l-15', group: 'f2l-side', name: 'F2L 15', alg: "R U2 R' U2 R U' R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay sang phải; cạnh ở tầng trên." },
    { id: 'f2l-16', group: 'f2l-side', name: 'F2L 16', alg: "R' U2 R' U R' U' R U2 R", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay sang phải; cạnh ở tầng trên." },
    { id: 'f2l-17', group: 'f2l-up', name: 'F2L 17', alg: "R U R' F' U' F", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay lên; cạnh ở tầng trên." },
    { id: 'f2l-18', group: 'f2l-up', name: 'F2L 18', alg: "F' U2 F U F' U' F", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay lên; cạnh ở tầng trên." },
    { id: 'f2l-19', group: 'f2l-up', name: 'F2L 19', alg: "R U R' U R U' R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay lên; cạnh ở tầng trên." },
    { id: 'f2l-20', group: 'f2l-up', name: 'F2L 20', alg: "R U2 R' U R U' R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay lên; cạnh ở tầng trên." },
    { id: 'f2l-21', group: 'f2l-up', name: 'F2L 21', alg: "R U2 R' U' R U R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay lên; cạnh ở tầng trên." },
    { id: 'f2l-22', group: 'f2l-up', name: 'F2L 22', alg: "F R' F' R U R U R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay lên; cạnh ở tầng trên." },
    { id: 'f2l-23', group: 'f2l-up', name: 'F2L 23', alg: "R' F R F' U' F' U' F", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay lên; cạnh ở tầng trên." },
    { id: 'f2l-24', group: 'f2l-up', name: 'F2L 24', alg: "R U' R' F' U2 F R U R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay lên; cạnh ở tầng trên." },
    { id: 'f2l-25', group: 'f2l-cu-es', name: 'F2L 25', alg: "F' U2 F R U R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay lên; cạnh nằm trong khe, bị lật." },
    { id: 'f2l-26', group: 'f2l-cu-es', name: 'F2L 26', alg: "F' U' F U R U' R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay sang trái; cạnh nằm trong khe, bị lật." },
    { id: 'f2l-27', group: 'f2l-cu-es', name: 'F2L 27', alg: "R U R' F R' F' R", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay ra sau; cạnh nằm trong khe, bị lật." },
    { id: 'f2l-28', group: 'f2l-cu-es', name: 'F2L 28', alg: "R U' R' U2 R U' R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay sang phải; cạnh nằm trong khe, đúng chiều." },
    { id: 'f2l-29', group: 'f2l-cu-es', name: 'F2L 29', alg: "R U2 R' U R U R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay ra sau; cạnh nằm trong khe, đúng chiều." },
    { id: 'f2l-30', group: 'f2l-cu-es', name: 'F2L 30', alg: "F R' F' R U' R U R'", prefix: 'z2', mask: 'pair', note: "Góc ở tầng trên, ô trắng quay lên; cạnh nằm trong khe, đúng chiều." },
    { id: 'f2l-31', group: 'f2l-cs-eu', name: 'F2L 31', alg: "R U' R' F' U' F", prefix: 'z2', mask: 'pair', note: "Góc nằm trong khe, ô trắng quay ra trước; cạnh ở tầng trên." },
    { id: 'f2l-32', group: 'f2l-cs-eu', name: 'F2L 32', alg: "R U2 R' F' U2 F", prefix: 'z2', mask: 'pair', note: "Góc nằm trong khe, ô trắng quay sang phải; cạnh ở tầng trên." },
    { id: 'f2l-33', group: 'f2l-cs-eu', name: 'F2L 33', alg: "R U R' U' R U R'", prefix: 'z2', mask: 'pair', note: "Góc nằm trong khe, ô trắng quay sang phải; cạnh ở tầng trên." },
    { id: 'f2l-34', group: 'f2l-cs-eu', name: 'F2L 34', alg: "R U' R' F R' F' R", prefix: 'z2', mask: 'pair', note: "Góc nằm trong khe, ô trắng quay xuống (đúng hướng); cạnh ở tầng trên." },
    { id: 'f2l-35', group: 'f2l-cs-eu', name: 'F2L 35', alg: "R U' R' U R U' R'", prefix: 'z2', mask: 'pair', note: "Góc nằm trong khe, ô trắng quay ra trước; cạnh ở tầng trên." },
    { id: 'f2l-36', group: 'f2l-cs-eu', name: 'F2L 36', alg: "R' U' R' U' R' U R U R", prefix: 'z2', mask: 'pair', note: "Góc nằm trong khe, ô trắng quay xuống (đúng hướng); cạnh ở tầng trên." },
    { id: 'f2l-37', group: 'f2l-both', name: 'F2L 37', alg: "R F U R U' R' F' U' R'", prefix: 'z2', mask: 'pair', note: "Góc nằm trong khe, ô trắng quay ra trước; cạnh nằm trong khe, bị lật." },
    { id: 'f2l-38', group: 'f2l-both', name: 'F2L 38', alg: "R U F R U R' U' F' R'", prefix: 'z2', mask: 'pair', note: "Góc nằm trong khe, ô trắng quay sang phải; cạnh nằm trong khe, bị lật." },
    { id: 'f2l-39', group: 'f2l-both', name: 'F2L 39', alg: "R U R' U' R U2 R' U' R U R'", prefix: 'z2', mask: 'pair', note: "Góc nằm trong khe, ô trắng quay ra trước; cạnh nằm trong khe, đúng chiều." },
    { id: 'f2l-40', group: 'f2l-both', name: 'F2L 40', alg: "R U R' U2 R U2 R' U F' U' F", prefix: 'z2', mask: 'pair', note: "Góc nằm trong khe, ô trắng quay xuống (đúng hướng); cạnh nằm trong khe, bị lật." },
    { id: 'f2l-41', group: 'f2l-both', name: 'F2L 41', alg: "R U' R' U R U2 R' U R U' R'", prefix: 'z2', mask: 'pair', note: "Góc nằm trong khe, ô trắng quay sang phải; cạnh nằm trong khe, đúng chiều." },
  ];
  root.RUBIK_F2L = list;
  if (typeof module !== 'undefined' && module.exports) module.exports = list;
})(typeof window !== 'undefined' ? window : globalThis);
