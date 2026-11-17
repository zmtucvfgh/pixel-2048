/*!
 * 2048 像素版 - B站小游戏启动适配层
 * MIT License
 *
 * 这一层只做平台相关的事：取画布、取屏幕尺寸、接平台存储、接触摸事件、上报启动成功。
 * 游戏本身（规则 / 渲染 / 存档）与浏览器版完全共用 src/ 下的同一份代码。
 */
(function (glob) {
  'use strict';

  var api = glob.bl || glob.wx || null;
  var Storage = glob.Pixel2048Storage;
  var App = glob.Pixel2048App;

  if (!Storage || !App) {
    throw new Error('缺少核心脚本，请检查 game.js 的 require 顺序');
  }

  // 1) 存储适配：小游戏没有 localStorage，改用平台同步存储
  if (api && typeof api.getStorageSync === 'function' && typeof api.setStorageSync === 'function') {
    Storage.useAdapter({
      getItem: function (key) {
        try {
          var value = api.getStorageSync(key);
          if (value === '' || value === null || value === undefined) return null;
          return typeof value === 'string' ? value : JSON.stringify(value);
        } catch (e) {
          return null;
        }
      },
      setItem: function (key, value) {
        try {
          api.setStorageSync(key, value);
          return true;
        } catch (e) {
          return false;
        }
      }
    });
  }

  // 2) 画布：小游戏环境里首个 createCanvas() 即为上屏画布
  var canvas = null;
  if (api && typeof api.createCanvas === 'function') {
    canvas = api.createCanvas();
  } else if (glob.canvas) {
    canvas = glob.canvas;
  }
  if (!canvas) throw new Error('无法获取画布对象');

  // 3) 屏幕尺寸（逻辑像素）
  var info = null;
  try {
    info = api && typeof api.getSystemInfoSync === 'function' ? api.getSystemInfoSync() : null;
  } catch (e) {
    info = null;
  }
  var screenW = (info && (info.windowWidth || info.screenWidth)) || 375;
  var screenH = (info && (info.windowHeight || info.screenHeight)) || 667;

  var app = App.createApp({ canvas: canvas });
  app.renderer.setSize(screenW, screenH);
  app.renderer.invalidate();

  // 4) 触摸输入：轻点触发按钮，滑动切换方向
  var THRESHOLD = 22;
  var startPoint = null;

  function pointOf(touch) {
    return {
      x: touch.clientX !== undefined ? touch.clientX : touch.x,
      y: touch.clientY !== undefined ? touch.clientY : touch.y
    };
  }

  function onStart(event) {
    var touch = event.touches && event.touches[0];
    if (!touch) return;
    var p = pointOf(touch);
    startPoint = { x: p.x, y: p.y, moved: false };
    app.renderer.pointerDown(p.x, p.y);
  }

  function onMove(event) {
    if (!startPoint) return;
    var touch = event.touches && event.touches[0];
    if (!touch) return;
    var p = pointOf(touch);
    if (Math.abs(p.x - startPoint.x) > 12 || Math.abs(p.y - startPoint.y) > 12) {
      startPoint.moved = true;
      app.renderer.cancelPointer();
    }
  }

  function onEnd(event) {
    if (!startPoint) return;
    var touch = (event.changedTouches && event.changedTouches[0]) || (event.touches && event.touches[0]);
    var p = touch ? pointOf(touch) : startPoint;
    var dx = p.x - startPoint.x;
    var dy = p.y - startPoint.y;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);

    if (Math.max(absX, absY) >= THRESHOLD) {
      app.renderer.cancelPointer();
      if (absX > absY) app.move(dx > 0 ? 'right' : 'left');
      else app.move(dy > 0 ? 'down' : 'up');
    } else if (!startPoint.moved) {
      app.renderer.pointerUp(p.x, p.y);
    } else {
      app.renderer.cancelPointer();
    }
    startPoint = null;
  }

  if (api && typeof api.onTouchStart === 'function') {
    api.onTouchStart(onStart);
    api.onTouchMove(onMove);
    api.onTouchEnd(onEnd);
    if (typeof api.onTouchCancel === 'function') {
      api.onTouchCancel(function () {
        startPoint = null;
        app.renderer.cancelPointer();
      });
    }
  } else if (typeof canvas.addEventListener === 'function') {
    canvas.addEventListener('touchstart', onStart);
    canvas.addEventListener('touchmove', onMove);
    canvas.addEventListener('touchend', onEnd);
    canvas.addEventListener('touchcancel', onEnd);
  }

  // 5) 尺寸变化（折叠屏、横竖屏切换）
  if (api && typeof api.onWindowResize === 'function') {
    api.onWindowResize(function (res) {
      app.renderer.setSize(res.windowWidth, res.windowHeight);
    });
  }

  // 6) 切后台时保存进度
  if (api && typeof api.onHide === 'function') api.onHide(app.persist);
  if (api && typeof api.onShow === 'function') {
    api.onShow(function () {
      app.persist();
      app.renderer.invalidate();
    });
  }

  // 7) 启动成功埋点：审核必查项，必须在首页渲染成功后上报一次
  var reported = false;
  function reportLaunchSuccess() {
    if (reported) return;
    reported = true;
    try {
      if (api && typeof api.launchSuccess === 'function') api.launchSuccess({});
    } catch (e) { /* 埋点失败不阻塞游戏 */ }
  }

  // 首帧绘制完成后再上报
  if (typeof glob.requestAnimationFrame === 'function') {
    glob.requestAnimationFrame(function () {
      glob.requestAnimationFrame(reportLaunchSuccess);
    });
  } else {
    glob.setTimeout(reportLaunchSuccess, 100);
  }

  glob.__pixel2048 = app;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof GameGlobal !== 'undefined' ? GameGlobal : this));
