/*!
 * 2048 像素版 - 浏览器入口
 * MIT License
 */
(function (glob) {
  'use strict';

  var SWIPE_THRESHOLD = 22;

  function boot() {
    var canvas = document.getElementById('game');
    var host = document.getElementById('app');
    var live = document.getElementById('live');
    if (!canvas || !glob.Pixel2048App) return;

    var app = glob.Pixel2048App.createApp({
      canvas: canvas,
      announce: function (text) {
        if (live) live.textContent = text;
      }
    });

    var renderer = app.renderer;
    var swipe = null;

    function resize() {
      var vv = glob.visualViewport;
      var width = vv ? vv.width : (document.documentElement.clientWidth || glob.innerWidth);
      var height = vv ? vv.height : (document.documentElement.clientHeight || glob.innerHeight);
      if (host) {
        var rect = host.getBoundingClientRect();
        // 取容器与视口的最小值，避免 flex 溢出导致画布被撑大
        width = Math.min(width, Math.floor(rect.width) || width);
        height = Math.min(height, Math.floor(rect.height) || height);
      }
      renderer.setSize(Math.floor(width), Math.floor(height));
    }

    if (glob.ResizeObserver && host) {
      new glob.ResizeObserver(resize).observe(host);
    }
    glob.addEventListener('resize', resize);
    glob.addEventListener('orientationchange', function () {
      glob.setTimeout(resize, 120);
    });

    function pointFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    canvas.addEventListener('pointerdown', function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      var p = pointFromEvent(event);
      swipe = { x: p.x, y: p.y, moved: false };
      renderer.pointerDown(p.x, p.y);
      if (canvas.setPointerCapture && event.pointerId !== undefined) {
        try { canvas.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
      }
    });

    canvas.addEventListener('pointermove', function (event) {
      if (!swipe) return;
      var p = pointFromEvent(event);
      if (Math.abs(p.x - swipe.x) > 12 || Math.abs(p.y - swipe.y) > 12) {
        swipe.moved = true;
        renderer.cancelPointer();
      }
    });

    canvas.addEventListener('pointerup', function (event) {
      if (!swipe) return;
      var p = pointFromEvent(event);
      var dx = p.x - swipe.x;
      var dy = p.y - swipe.y;
      var absX = Math.abs(dx);
      var absY = Math.abs(dy);

      if (Math.max(absX, absY) >= SWIPE_THRESHOLD) {
        renderer.cancelPointer();
        if (absX > absY) app.move(dx > 0 ? 'right' : 'left');
        else app.move(dy > 0 ? 'down' : 'up');
      } else if (!swipe.moved) {
        renderer.pointerUp(p.x, p.y);
      } else {
        renderer.cancelPointer();
      }
      swipe = null;
    });

    canvas.addEventListener('pointercancel', function () {
      swipe = null;
      renderer.cancelPointer();
    });

    glob.addEventListener('keydown', function (event) {
      var key = event.key;
      var handled = true;
      if (key === 'ArrowUp' || key === 'w' || key === 'W') app.move('up');
      else if (key === 'ArrowDown' || key === 's' || key === 'S') app.move('down');
      else if (key === 'ArrowLeft' || key === 'a' || key === 'A') app.move('left');
      else if (key === 'ArrowRight' || key === 'd' || key === 'D') app.move('right');
      else if (key === 'r' || key === 'R') app.restart();
      else if (key === 'z' || key === 'Z' || key === 'u' || key === 'U') app.undo();
      else if (key === 'm' || key === 'M') app.toggleSound();
      else handled = false;
      if (handled) event.preventDefault();
    }, { passive: false });

    glob.addEventListener('pagehide', app.persist);
    glob.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') app.persist();
    });

    resize();
    renderer.invalidate();

    glob.__pixel2048 = app;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
