import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Game } = require('../src/core/game.js');

const SIZE = 4;

function makeGame(rows, score = 0) {
  // rng 恒为 0：新方块总是 2，且落在行优先的第一个空位，方便断言
  const game = new Game({ size: SIZE, rng: () => 0 });
  const grid = rows.map((row) => row.slice());
  while (grid.length < SIZE) grid.push(new Array(SIZE).fill(0));
  game.applySnapshot({ grid, score, won: false, over: false, keepPlaying: false });
  return game;
}

function values(game) {
  return game.serialize().grid;
}

function count(game, value) {
  let total = 0;
  for (const row of values(game)) {
    for (const cell of row) if (cell === value) total++;
  }
  return total;
}

test('新开局有两个方块', () => {
  const game = new Game({ size: SIZE, rng: () => 0 });
  assert.equal(count(game, 2) + count(game, 4), 2);
  assert.equal(game.score, 0);
  assert.equal(game.over, false);
});

test('四个 2 向左移动只合并成两个 4，得分 8', () => {
  const game = makeGame([[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const result = game.move('left');
  assert.ok(result);
  assert.equal(game.score, 8);
  assert.equal(count(game, 4), 2);
  assert.equal(count(game, 8), 0);
});

test('合并产生的方块本回合不再参与合并', () => {
  const game = makeGame([[2, 2, 4, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  game.move('left');
  assert.equal(game.score, 4);
  assert.equal(count(game, 4), 2);
  assert.equal(count(game, 8), 0);
});

test('同值方块按移动方向靠拢后合并', () => {
  const game = makeGame([[0, 4, 0, 4], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  game.move('right');
  assert.equal(game.score, 8);
  assert.equal(count(game, 8), 1);
});

test('无法移动时不生成新方块', () => {
  const game = makeGame([[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const before = JSON.stringify(values(game));
  const result = game.move('left');
  assert.equal(result, null);
  assert.equal(JSON.stringify(values(game)), before);
  assert.equal(game.score, 0);
  assert.equal(game.canUndo(), false);
});

test('撤销可以恢复棋盘与分数', () => {
  const game = makeGame([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  game.move('left');
  assert.equal(game.score, 4);
  assert.equal(game.canUndo(), true);
  game.undo();
  assert.equal(game.score, 0);
  assert.deepEqual(values(game)[0].slice(0, 2), [2, 2]);
  assert.equal(game.canUndo(), false);
});

test('填满且无法合并时判定为游戏结束', () => {
  const game = makeGame([
    [2, 4, 2, 16],
    [4, 8, 16, 4],
    [16, 32, 8, 16],
    [0, 4, 8, 4]
  ]);
  assert.equal(game.hasMoves(), true);
  game.move('left');
  assert.equal(game.over, true);
  assert.equal(game.hasMoves(), false);
});

test('达成 2048 时记录胜利，继续挑战后可继续移动', () => {
  const game = makeGame([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  game.move('left');
  assert.equal(game.won, true);
  assert.equal(count(game, 2048), 1);
  game.keepPlaying = true;
  assert.ok(game.move('right') || game.move('down') || game.move('up'));
});

test('存档序列化与恢复保持一致', () => {
  const game = makeGame([[2, 4, 8, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 128);
  game.move('right');
  const saved = JSON.parse(JSON.stringify(game.serialize()));

  const restored = new Game({ size: SIZE, rng: () => 0 });
  restored.applySnapshot(saved);
  assert.deepEqual(values(restored), values(game));
  assert.equal(restored.score, game.score);
});
