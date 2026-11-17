/*!
 * 2048 像素版 - 存档 / 最高分 / 偏好设置持久化
 * MIT License
 *
 * 默认用 localStorage；小游戏等无 DOM 环境可通过
 * Pixel2048Storage.useAdapter({ getItem, setItem }) 注入平台存储。
 */
(function (glob) {
  'use strict';

  var PREFIX = 'pixel2048.v1.';
  var fallback = {};

  function safeParse(text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  var adapter = {
    getItem: function (key) {
      try {
        if (typeof localStorage !== 'undefined' && localStorage) {
          return localStorage.getItem(key);
        }
      } catch (e) { /* 隐私模式下会被禁用 */ }
      return Object.prototype.hasOwnProperty.call(fallback, key) ? fallback[key] : null;
    },
    setItem: function (key, value) {
      try {
        if (typeof localStorage !== 'undefined' && localStorage) {
          localStorage.setItem(key, value);
          return true;
        }
      } catch (e) { /* 配额或隐私模式 */ }
      fallback[key] = value;
      return false;
    }
  };

  var Storage = {
    /** 注入平台存储实现（如 bl.setStorageSync / bl.getStorageSync） */
    useAdapter: function (custom) {
      if (!custom || typeof custom.getItem !== 'function' || typeof custom.setItem !== 'function') {
        return false;
      }
      adapter = custom;
      return true;
    },

    read: function (name) {
      return safeParse(adapter.getItem(PREFIX + name));
    },

    write: function (name, value) {
      try {
        adapter.setItem(PREFIX + name, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },

    clearGame: function () {
      adapter.setItem(PREFIX + 'state', '');
    },

    saveState: function (state) {
      return Storage.write('state', state);
    },

    loadState: function () {
      var data = Storage.read('state');
      if (!data || !data.grid || !data.grid.length) return null;
      return data;
    },

    loadBest: function () {
      var value = Storage.read('best');
      return typeof value === 'number' && isFinite(value) ? value : 0;
    },

    saveBest: function (value) {
      return Storage.write('best', Math.max(0, Math.floor(value) || 0));
    },

    loadMuted: function () {
      return Storage.read('muted') === true;
    },

    saveMuted: function (muted) {
      return Storage.write('muted', !!muted);
    },

    loadUndoEnabled: function () {
      var value = Storage.read('undo');
      return value === null ? true : value !== false;
    },

    saveUndoEnabled: function (enabled) {
      return Storage.write('undo', !!enabled);
    }
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = Storage;
  }
  glob.Pixel2048Storage = Storage;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : this)));
