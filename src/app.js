/*!
 * 2048 像素版 - 平台无关的应用层
 * MIT License
 *
 * 负责：游戏实例、渲染器、音效、存档、按钮动作。
 * 平台差异（canvas 创建、尺寸、事件）由 browser / bilibili 各自的入口处理。
 */
(function (glob) {
  'use strict';

  var Core = glob.Pixel2048Core;
  var RendererLib = glob.Pixel2048Renderer;
  var Storage = glob.Pixel2048Storage;

  if (!Core || !RendererLib || !Storage) {
    throw new Error('核心脚本未加载：请先引入 core/game.js、core/storage.js、render/renderer.js');
  }

  /** 极轻量的 WebAudio 音效，无外部音频文件，避免素材版权问题 */
  function Sound(renderer) {
    this.renderer = renderer;
    this.ctx = null;
  }

  Sound.prototype._ensure = function () {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume();
      return this.ctx;
    }
    var AC = glob.AudioContext || glob.webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
    } catch (e) {
      return null;
    }
    return this.ctx;
  };

  Sound.prototype.blip = function (freq, duration, type, peak) {
    if (this.renderer.muted) return;
    var ctx = this._ensure();
    if (!ctx) return;
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      var now = ctx.currentTime;
      var level = peak || 0.045;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(level, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) { /* 音频不可用时静默降级 */ }
  };

  Sound.prototype.sequence = function (freqs, gap, type) {
    var self = this;
    freqs.forEach(function (freq, index) {
      glob.setTimeout(function () { self.blip(freq, 0.14, type, 0.05); }, index * gap);
    });
  };

  Sound.prototype.move = function () { this.blip(220, 0.05, 'square', 0.03); };
  Sound.prototype.merge = function (value) {
    var step = Math.log2(Math.max(4, value));
    this.blip(Math.min(880, 330 + step * 42), 0.09, 'square', 0.05);
  };
  Sound.prototype.undo = function () { this.blip(180, 0.08, 'sine', 0.04); };
  Sound.prototype.win = function () { this.sequence([523, 659, 784, 1046], 90, 'square'); };
  Sound.prototype.over = function () { this.sequence([330, 262, 196], 110, 'triangle'); };

  /**
   * @param {{canvas:object, size?:number, announce?:Function}} options
   */
  function createApp(options) {
    options = options || {};
    var canvas = options.canvas;
    var announce = typeof options.announce === 'function' ? options.announce : function () {};

    var game = new Core.Game({ size: options.size || 4 });
    var renderer = new RendererLib.Renderer(canvas, game, { onAction: onAction });
    var sound = new Sound(renderer);
    var winAnnounced = false;

    renderer.best = Storage.loadBest();
    renderer.muted = Storage.loadMuted();

    var saved = Storage.loadState();
    if (saved && saved.grid && saved.grid.length === game.size) {
      game.applySnapshot(saved);
      game.over = !game.hasMoves();
      winAnnounced = game.won && game.keepPlaying;
    }

    function persist() {
      Storage.saveState(game.serialize());
      Storage.saveBest(renderer.best);
    }

    function refresh() {
      renderer.best = Math.max(renderer.best, game.score);
      renderer.muted = Storage.loadMuted();
      renderer.invalidate();
    }

    function move(dir) {
      var result = game.move(dir);
      if (!result) return false;

      if (result.gained > 0) sound.merge(game.maxTile());
      else sound.move();

      if (game.won && !game.keepPlaying && !winAnnounced) {
        winAnnounced = true;
        sound.win();
        announce('达成 2048，可以继续挑战更大的方块');
      }
      if (game.over) sound.over();

      renderer.best = Math.max(renderer.best, game.score);
      persist();
      renderer.startAnimation(result.anim);
      if (!game.over) {
        announce('得分 ' + game.score + '，最大方块 ' + game.maxTile());
      } else {
        announce('游戏结束，得分 ' + game.score);
      }
      return true;
    }

    function restart() {
      game.reset();
      winAnnounced = false;
      Storage.clearGame();
      persist();
      renderer.anim = null;
      refresh();
      announce('已开始新的一局');
    }

    function undo() {
      if (!game.canUndo()) return false;
      game.undo();
      sound.undo();
      persist();
      renderer.anim = null;
      refresh();
      announce('已撤销上一步，得分 ' + game.score);
      return true;
    }

    function toggleSound() {
      renderer.muted = !renderer.muted;
      Storage.saveMuted(renderer.muted);
      if (!renderer.muted) sound.move();
      refresh();
      announce(renderer.muted ? '已关闭音效' : '已开启音效');
    }

    function onAction(id) {
      if (id === 'restart') restart();
      else if (id === 'undo') undo();
      else if (id === 'sound') toggleSound();
      else if (id === 'continue') {
        game.keepPlaying = true;
        persist();
        refresh();
        announce('继续挑战');
      }
    }

    refresh();
    persist();
    announce('2048 像素版，当前得分 ' + game.score);

    return {
      game: game,
      renderer: renderer,
      sound: sound,
      move: move,
      restart: restart,
      undo: undo,
      toggleSound: toggleSound,
      persist: persist,
      refresh: refresh
    };
  }

  var api = { createApp: createApp, Sound: Sound };
  if (typeof module === 'object' && module.exports) module.exports = api;
  glob.Pixel2048App = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : this)));
