/*!
 * 2048 像素版 - Canvas 渲染与输入
 * MIT License
 *
 * 全部界面元素（标题、分数、按钮、棋盘、弹层）都绘制在同一张 Canvas 上，
 * 因此同一份代码可以运行在浏览器与「仅 Canvas + 触摸事件」的小游戏容器里。
 */
(function (glob) {
  'use strict';

  var ANIM_MS = 150;
  var FONT_STACK = '"Cascadia Mono", "JetBrains Mono", Consolas, "PingFang SC", "Microsoft YaHei", monospace';

  var TILE_COLORS = {
    2: ['#efe6d8', '#3b332a'],
    4: ['#eddec3', '#3b332a'],
    8: ['#f3b27a', '#341f12'],
    16: ['#f59663', '#ffffff'],
    32: ['#f57c6a', '#ffffff'],
    64: ['#f25c3f', '#ffffff'],
    128: ['#e9c46a', '#3a2c08'],
    256: ['#e6bd53', '#3a2c08'],
    512: ['#e2b13c', '#3a2c08'],
    1024: ['#dda72c', '#3a2c08'],
    2048: ['#7bd88f', '#10281c'],
    4096: ['#5b8cff', '#ffffff'],
    8192: ['#a78bfa', '#ffffff'],
    16384: ['#f472b6', '#ffffff'],
    32768: ['#38bdf8', '#08202b'],
    65536: ['#facc15', '#2b2202']
  };

  var COLORS = {
    bgTop: '#171a22',
    bgBottom: '#10131a',
    title: '#f2f5fa',
    subtitle: '#7c8798',
    scoreBox: '#20252f',
    scoreLabel: '#78839a',
    scoreValue: '#f2f5fa',
    board: '#242a36',
    cell: '#1b2029',
    btnBg: '#2b3140',
    btnBgPressed: '#39425433',
    btnBorder: '#3a4256',
    btnText: '#d7deea',
    btnTextDisabled: '#5b6478',
    footer: '#5f6a7d',
    overlay: 'rgba(13, 15, 20, 0.98)',
    overlayTitle: '#f2f5fa',
    overlayText: '#9aa5b8'
  };

  function clamp(value, min, max) {
    return value < min ? min : (value > max ? max : value);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    var p = 1 - t;
    return 1 - p * p * p;
  }

  function roundRect(ctx, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function tileStyle(value) {
    return TILE_COLORS[value] || ['#8b5cf6', '#ffffff'];
  }

  /**
   * @param {HTMLCanvasElement|object} canvas 需要具备 width/height/getContext
   * @param {object} game Pixel2048Core.Game 实例
   * @param {{onAction?:Function}} options
   */
  function Renderer(canvas, game, options) {
    options = options || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.onAction = options.onAction || function () {};
    this.width = 320;
    this.height = 480;
    this.dpr = 1;
    this.best = 0;
    this.muted = false;
    this.anim = null;
    this.hitAreas = [];
    this.pressed = null;
    this.dirty = true;
    this.raf = null;
    this.time = 0;
    this._loop = this._loop.bind(this);
  }

  Renderer.prototype.setSize = function (width, height) {
    this.dpr = (glob.devicePixelRatio || 1);
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    if (this.canvas.style) {
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
    }
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.invalidate();
  };

  Renderer.prototype.invalidate = function () {
    this.dirty = true;
    if (this.raf === null) {
      this.raf = glob.requestAnimationFrame(this._loop);
    }
  };

  Renderer.prototype.startAnimation = function (list) {
    if (!list || !list.length) return;
    this.anim = { list: list, start: (glob.performance ? glob.performance.now() : Date.now()) + 20 };
    this.invalidate();
  };

  Renderer.prototype._loop = function (ts) {
    this.raf = null;
    this.time = ts;
    this.draw(ts);
    var animating = false;
    if (this.anim) {
      var elapsed = ts - this.anim.start;
      if (elapsed < ANIM_MS + 40) animating = true;
      else this.anim = null;
    }
    if (animating) {
      this.raf = glob.requestAnimationFrame(this._loop);
    } else if (this.dirty) {
      this.dirty = false;
      this.raf = glob.requestAnimationFrame(this._loop);
    }
  };

  Renderer.prototype.layout = function () {
    var w = this.width;
    var h = this.height;
    var contentW = Math.min(w, 560);
    var left = Math.floor((w - contentW) / 2);
    var pad = clamp(contentW * 0.045, 12, 26);
    var narrow = contentW < 420;

    var titleSize = narrow ? 32 : 42;
    var headerH = titleSize + 18;
    var scoreW = narrow ? 74 : 90;
    var scoreH = narrow ? 44 : 50;
    var toolbarH = 42;
    var footerH = 26;
    var gapAfterBoard = 14;

    var boardMaxW = contentW - pad * 2;
    var boardMaxH = h - pad * 2 - headerH - 10 - gapAfterBoard - toolbarH - footerH - 6;
    var boardSize = Math.floor(Math.min(boardMaxW, Math.max(0, boardMaxH)));
    if (boardSize < 220) {
      // 高度特别紧张时优先保证棋盘可玩，允许内容略微溢出
      boardSize = Math.floor(Math.min(boardMaxW, Math.max(180, h * 0.42)));
    }

    var stackH = pad * 2 + headerH + 10 + boardSize + gapAfterBoard + toolbarH + footerH;
    var spare = Math.max(0, h - stackH);
    var offsetY = Math.floor(pad + Math.min(spare * 0.5, 160));

    var boardX = Math.floor(left + (contentW - boardSize) / 2);
    var boardY = offsetY + headerH + 10;

    var boardBottom = boardY + boardSize;
    var toolbarY = boardBottom + gapAfterBoard;

    return {
      w: w, h: h, left: left, contentW: contentW, pad: pad, narrow: narrow,
      titleSize: titleSize,
      headerY: offsetY,
      scoreW: scoreW, scoreH: scoreH,
      board: { x: boardX, y: boardY, size: boardSize },
      toolbar: { x: left + pad, y: toolbarY, w: contentW - pad * 2, h: toolbarH },
      footerY: toolbarY + toolbarH + 22,
      footerX: left + contentW / 2
    };
  };

  Renderer.prototype.cellMetrics = function (layout) {
    var size = this.game.size;
    var gap = clamp(layout.board.size * 0.028, 6, 12);
    var cell = (layout.board.size - gap * (size + 1)) / size;
    return { gap: gap, cell: cell };
  };

  Renderer.prototype.draw = function (now) {
    var ctx = this.ctx;
    var layout = this.layout();
    var m = this.cellMetrics(layout);

    ctx.clearRect(0, 0, this.width, this.height);

    var bg = ctx.createLinearGradient(0, 0, 0, this.height);
    bg.addColorStop(0, COLORS.bgTop);
    bg.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.width, this.height);

    this.hitAreas = [];

    this.drawHeader(layout);
    this.drawBoard(layout, m, now);
    this.drawToolbar(layout);
    this.drawFooter(layout);
    this.drawOverlay(layout);
  };

  Renderer.prototype.font = function (size, weight) {
    return (weight || 600) + ' ' + Math.round(size) + 'px ' + FONT_STACK;
  };

  Renderer.prototype.drawHeader = function (layout) {
    var ctx = this.ctx;
    var titleX = layout.left + layout.pad;
    var scoreX = layout.left + layout.contentW - layout.pad - layout.scoreW * 2 - 8;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COLORS.title;
    ctx.font = this.font(layout.titleSize, 800);
    ctx.fillText('2048', titleX, layout.headerY + layout.titleSize * 0.86);

    ctx.fillStyle = COLORS.subtitle;
    ctx.font = this.font(layout.narrow ? 10 : 11, 600);
    ctx.fillText('像素版', titleX, layout.headerY + layout.titleSize * 0.86 + 15);

    this.drawScoreBox(scoreX, layout.headerY + 2, layout.scoreW, layout.scoreH, '分数', this.game.score);
    this.drawScoreBox(scoreX + layout.scoreW + 8, layout.headerY + 2, layout.scoreW, layout.scoreH, '最高', this.best);
  };

  Renderer.prototype.drawScoreBox = function (x, y, w, h, label, value) {
    var ctx = this.ctx;
    ctx.fillStyle = COLORS.scoreBox;
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.scoreLabel;
    ctx.font = this.font(10, 700);
    ctx.fillText(label, x + w / 2, y + h * 0.33);

    ctx.fillStyle = COLORS.scoreValue;
    ctx.font = this.font(Math.min(w * 0.28, 18), 800);
    ctx.fillText(String(value), x + w / 2, y + h * 0.76);
  };

  Renderer.prototype.drawBoard = function (layout, metrics, now) {
    var ctx = this.ctx;
    var b = layout.board;
    var game = this.game;
    var size = game.size;
    var gap = metrics.gap;
    var cell = metrics.cell;

    ctx.fillStyle = COLORS.board;
    roundRect(ctx, b.x, b.y, b.size, b.size, 8);
    ctx.fill();

    ctx.save();
    roundRect(ctx, b.x, b.y, b.size, b.size, 8);
    ctx.clip();

    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        ctx.fillStyle = COLORS.cell;
        roundRect(ctx, b.x + gap + c * (cell + gap), b.y + gap + r * (cell + gap), cell, cell, 4);
        ctx.fill();
      }
    }

    var progress = 1;
    var anim = this.anim;
    var moving = {};
    if (anim) {
      progress = clamp((now - anim.start) / ANIM_MS, 0, 1);
      for (var i = 0; i < anim.list.length; i++) moving[anim.list[i].id] = true;
    }

    // 未参与动画的方块直接画在最终位置
    for (var rr = 0; rr < size; rr++) {
      for (var cc = 0; cc < size; cc++) {
        var tile = game.grid[rr][cc];
        if (tile && !moving[tile.id]) {
          this.paintTile(b, cell, gap, cc, rr, tile.value, 1, 1);
        }
      }
    }

    if (anim) {
      var eased = easeOutCubic(progress);
      for (var k = 0; k < anim.list.length; k++) {
        var a = anim.list[k];
        var x = lerp(a.fromC, a.c, eased);
        var y = lerp(a.fromR, a.r, eased);
        var scale = 1;
        var alpha = 1;
        if (a.absorbed) {
          alpha = 1 - clamp((progress - 0.55) / 0.45, 0, 1);
        } else if (a.pop) {
          scale = 1 + 0.16 * Math.sin(Math.PI * clamp(progress * 1.15, 0, 1));
        } else if (a.isNew) {
          scale = 0.25 + 0.75 * easeOutCubic(clamp((progress - 0.35) / 0.65, 0, 1));
        }
        this.paintTile(b, cell, gap, x, y, a.value, scale, alpha);
      }
    }

    ctx.restore();
  };

  Renderer.prototype.paintTile = function (board, cell, gap, col, row, value, scale, alpha) {
    var ctx = this.ctx;
    var style = tileStyle(value);
    var cx = board.x + gap + col * (cell + gap) + cell / 2;
    var cy = board.y + gap + row * (cell + gap) + cell / 2;
    var w = cell * scale;
    var h = cell * scale;
    var x = cx - w / 2;
    var y = cy - h / 2;

    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = style[0];
    roundRect(ctx, x, y, w, h, Math.max(3, w * 0.05));
    ctx.fill();

    // 像素风高光：顶部 3px 亮条 + 底部 3px 暗条，做成立方块的立体感
    var bar = Math.max(2, w * 0.045);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    roundRect(ctx, x + bar, y + bar, w - bar * 2, bar, 1);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    roundRect(ctx, x + bar, y + h - bar * 2, w - bar * 2, bar, 1);
    ctx.fill();

    var digits = String(value).length;
    var ratio = digits <= 2 ? 0.44 : digits === 3 ? 0.36 : digits === 4 ? 0.30 : 0.25;
    var fontSize = Math.max(10, w * ratio);
    ctx.fillStyle = style[1];
    ctx.font = this.font(fontSize, 800);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), cx, cy + h * 0.02);

    ctx.restore();
  };

  Renderer.prototype.button = function (id, label, x, y, w, h, disabled) {
    var ctx = this.ctx;
    var pressed = this.pressed === id;

    ctx.fillStyle = pressed ? '#3a4255' : COLORS.btnBg;
    roundRect(ctx, x, y + (pressed ? 1 : 0), w, h, 6);
    ctx.fill();

    ctx.strokeStyle = COLORS.btnBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = disabled ? COLORS.btnTextDisabled : COLORS.btnText;
    ctx.font = this.font(Math.min(14, h * 0.36), 700);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + (pressed ? 1 : 0));

    this.hitAreas.push({ id: id, x: x, y: y, w: w, h: h, disabled: !!disabled });
  };

  Renderer.prototype.drawToolbar = function (layout) {
    var t = layout.toolbar;
    var gap = 8;
    var w = (t.w - gap * 2) / 3;
    var canUndo = this.game.canUndo() && !this.game.over;

    this.button('restart', '新游戏', t.x, t.y, w, t.h);
    this.button('undo', '撤销', t.x + w + gap, t.y, w, t.h, !canUndo);
    this.button('sound', this.muted ? '音效 关' : '音效 开', t.x + (w + gap) * 2, t.y, w, t.h);
  };

  Renderer.prototype.drawFooter = function (layout) {
    var ctx = this.ctx;
    var hint = this.game.size === 4
      ? '方向键 / WASD / 滑动屏幕 · 同值方块相撞即合并'
      : '方向键 / WASD / 滑动屏幕';
    var size = layout.narrow ? 11 : 12;
    ctx.font = this.font(size, 500);
    var maxWidth = layout.contentW - layout.pad * 2;
    while (size > 8 && ctx.measureText(hint).width > maxWidth) {
      size -= 1;
      ctx.font = this.font(size, 500);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.footer;
    ctx.fillText(hint, layout.footerX, layout.footerY);
  };

  Renderer.prototype.drawOverlay = function (layout) {
    var game = this.game;
    var showWin = game.won && !game.keepPlaying;
    if (!showWin && !game.over) return;

    var ctx = this.ctx;
    var b = layout.board;

    ctx.save();
    roundRect(ctx, b.x, b.y, b.size, b.size, 8);
    ctx.clip();
    ctx.fillStyle = COLORS.overlay;
    ctx.fillRect(b.x, b.y, b.size, b.size);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = COLORS.overlayTitle;
    ctx.font = this.font(Math.min(30, b.size * 0.13), 800);
    ctx.fillText(showWin ? '达成 2048!' : '游戏结束', b.x + b.size / 2, b.y + b.size * 0.34);

    ctx.fillStyle = COLORS.overlayText;
    ctx.font = this.font(Math.min(14, b.size * 0.055), 600);
    ctx.fillText(
      showWin ? '可以继续挑战更大的方块' : '本局得分 ' + game.score,
      b.x + b.size / 2,
      b.y + b.size * 0.46
    );

    var btnW = Math.min(b.size * 0.42, 150);
    var btnH = 44;
    var btnY = b.y + b.size * 0.62;
    if (showWin) {
      var gap = 10;
      var totalW = btnW * 2 + gap;
      this.button('continue', '继续挑战', b.x + (b.size - totalW) / 2, btnY, btnW, btnH);
      this.button('restart', '再来一局', b.x + (b.size - totalW) / 2 + btnW + gap, btnY, btnW, btnH);
    } else {
      this.button('restart', '再来一局', b.x + (b.size - btnW) / 2, btnY, btnW, btnH);
    }

    ctx.restore();
  };

  Renderer.prototype.hitTest = function (x, y) {
    for (var i = this.hitAreas.length - 1; i >= 0; i--) {
      var area = this.hitAreas[i];
      if (x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h) {
        return area;
      }
    }
    return null;
  };

  Renderer.prototype.pointerDown = function (x, y) {
    var area = this.hitTest(x, y);
    this.pressed = area && !area.disabled ? area.id : null;
    this.invalidate();
  };

  Renderer.prototype.pointerUp = function (x, y) {
    var area = this.hitTest(x, y);
    var id = this.pressed;
    this.pressed = null;
    this.invalidate();
    if (area && !area.disabled && area.id === id) {
      this.onAction(area.id);
      return area.id;
    }
    return null;
  };

  Renderer.prototype.cancelPointer = function () {
    this.pressed = null;
    this.invalidate();
  };

  var api = { Renderer: Renderer, TILE_COLORS: TILE_COLORS, ANIM_MS: ANIM_MS };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  glob.Pixel2048Renderer = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : this)));
