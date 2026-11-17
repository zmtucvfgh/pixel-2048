/*!
 * 2048 像素版 - 核心规则引擎
 * MIT License | 独立实现的 2048 玩法，规则来源见 NOTICE.md
 */
(function (glob) {
  'use strict';

  var VECTORS = {
    up: { dr: -1, dc: 0 },
    right: { dr: 0, dc: 1 },
    down: { dr: 1, dc: 0 },
    left: { dr: 0, dc: -1 }
  };

  function emptyGrid(size) {
    var grid = [];
    for (var r = 0; r < size; r++) {
      grid.push(new Array(size).fill(null));
    }
    return grid;
  }

  /**
   * @param {{size?:number, winValue?:number, rng?:Function, historyLimit?:number}} options
   */
  function Game(options) {
    options = options || {};
    this.size = options.size || 4;
    this.winValue = options.winValue || 2048;
    this.rng = options.rng || Math.random;
    this.historyLimit = typeof options.historyLimit === 'number' ? options.historyLimit : 20;
    this._nextId = 1;
    this.reset();
  }

  Game.prototype.reset = function () {
    this.grid = emptyGrid(this.size);
    this.score = 0;
    this.won = false;
    this.over = false;
    this.keepPlaying = false;
    this.history = [];
    this.lastMove = null;
    this.spawn();
    this.spawn();
    return this;
  };

  Game.prototype.inBounds = function (r, c) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  };

  Game.prototype.emptyCells = function () {
    var cells = [];
    for (var r = 0; r < this.size; r++) {
      for (var c = 0; c < this.size; c++) {
        if (!this.grid[r][c]) cells.push({ r: r, c: c });
      }
    }
    return cells;
  };

  /** 随机生成一个新方块（90% 为 2，10% 为 4） */
  Game.prototype.spawn = function () {
    var cells = this.emptyCells();
    if (!cells.length) return null;
    var index = Math.floor(this.rng() * cells.length) % cells.length;
    var cell = cells[index];
    var value = this.rng() < 0.9 ? 2 : 4;
    var tile = { id: this._nextId++, value: value, r: cell.r, c: cell.c };
    this.grid[cell.r][cell.c] = tile;
    return tile;
  };

  /** 从“远端”到“近端”的遍历顺序，保证同一方向的方块先处理靠近边缘的 */
  Game.prototype.traversal = function (vec) {
    var rows = [], cols = [], i;
    for (i = 0; i < this.size; i++) { rows.push(i); cols.push(i); }
    if (vec.dr > 0) rows.reverse();
    if (vec.dc > 0) cols.reverse();
    var order = [];
    for (var ri = 0; ri < rows.length; ri++) {
      for (var ci = 0; ci < cols.length; ci++) {
        order.push({ r: rows[ri], c: cols[ci] });
      }
    }
    return order;
  };

  /**
   * 执行一次移动
   * @returns {{dir:string, anim:Array, gained:number, moved:boolean, spawned:object|null}|null}
   */
  Game.prototype.move = function (dir) {
    var vec = VECTORS[dir];
    if (!vec || this.over) return null;

    var snapshot = this.serialize();
    var anim = [];
    var mergedIds = {};
    var gained = 0;
    var moved = false;
    var order = this.traversal(vec);

    for (var i = 0; i < order.length; i++) {
      var r = order[i].r, c = order[i].c;
      var tile = this.grid[r][c];
      if (!tile) continue;

      var cr = r, cc = c;

      // 一路滑到最远
      for (;;) {
        var nr = cr + vec.dr, nc = cc + vec.dc;
        if (!this.inBounds(nr, nc) || this.grid[nr][nc]) break;
        this.grid[nr][nc] = tile;
        this.grid[cr][cc] = null;
        cr = nr; cc = nc;
      }

      // 尝试与前方同值方块合并（每个方块每回合只合并一次）
      var tr = cr + vec.dr, tc = cc + vec.dc;
      if (this.inBounds(tr, tc)) {
        var target = this.grid[tr][tc];
        if (target && target.value === tile.value && !mergedIds[target.id]) {
          this.grid[cr][cc] = null;
          target.value *= 2;
          mergedIds[target.id] = true;
          gained += target.value;
          moved = true;
          anim.push({
            id: tile.id, value: tile.value,
            fromR: r, fromC: c, r: tr, c: tc,
            absorbed: true
          });
          anim.push({
            id: target.id, value: target.value,
            fromR: tr, fromC: tc, r: tr, c: tc,
            pop: true
          });
          if (target.value >= this.winValue && !this.won) this.won = true;
          continue;
        }
      }

      if (cr !== r || cc !== c) {
        moved = true;
        anim.push({
          id: tile.id, value: tile.value,
          fromR: r, fromC: c, r: cr, c: cc
        });
      }
    }

    if (!moved) return null;

    this.score += gained;
    this.history.push(snapshot);
    if (this.history.length > this.historyLimit) this.history.shift();

    var spawned = this.spawn();
    if (spawned) {
      anim.push({
        id: spawned.id, value: spawned.value,
        fromR: spawned.r, fromC: spawned.c, r: spawned.r, c: spawned.c,
        isNew: true
      });
    }

    this.over = !this.hasMoves();
    this.lastMove = { dir: dir, anim: anim, gained: gained, moved: true, spawned: spawned };
    return this.lastMove;
  };

  Game.prototype.hasMoves = function () {
    for (var r = 0; r < this.size; r++) {
      for (var c = 0; c < this.size; c++) {
        var tile = this.grid[r][c];
        if (!tile) return true;
        if (c + 1 < this.size && this.grid[r][c + 1] && this.grid[r][c + 1].value === tile.value) return true;
        if (r + 1 < this.size && this.grid[r + 1][c] && this.grid[r + 1][c].value === tile.value) return true;
      }
    }
    return false;
  };

  Game.prototype.canUndo = function () {
    return this.history.length > 0;
  };

  Game.prototype.undo = function () {
    if (!this.history.length) return false;
    var snapshot = this.history.pop();
    this.applySnapshot(snapshot);
    this.lastMove = null;
    return true;
  };

  Game.prototype.maxTile = function () {
    var max = 0;
    for (var r = 0; r < this.size; r++) {
      for (var c = 0; c < this.size; c++) {
        var tile = this.grid[r][c];
        if (tile && tile.value > max) max = tile.value;
      }
    }
    return max;
  };

  Game.prototype.serialize = function () {
    var values = [];
    for (var r = 0; r < this.size; r++) {
      var row = [];
      for (var c = 0; c < this.size; c++) {
        row.push(this.grid[r][c] ? this.grid[r][c].value : 0);
      }
      values.push(row);
    }
    return {
      size: this.size,
      grid: values,
      score: this.score,
      won: this.won,
      over: this.over,
      keepPlaying: this.keepPlaying
    };
  };

  Game.prototype.applySnapshot = function (data) {
    if (!data || !data.grid || data.grid.length !== this.size) return false;
    this.grid = emptyGrid(this.size);
    for (var r = 0; r < this.size; r++) {
      for (var c = 0; c < this.size; c++) {
        var value = data.grid[r][c];
        if (value) {
          this.grid[r][c] = { id: this._nextId++, value: value, r: r, c: c };
        }
      }
    }
    this.score = data.score || 0;
    this.won = !!data.won;
    this.over = !!data.over;
    this.keepPlaying = !!data.keepPlaying;
    return true;
  };

  /** 棋盘上是否还有空位（用于能否继续下棋与提示语） */
  Game.prototype.isFull = function () {
    return this.emptyCells().length === 0;
  };

  var api = {
    Game: Game,
    VECTORS: VECTORS
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  glob.Pixel2048Core = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : this)));
