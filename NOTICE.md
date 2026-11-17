# 来源与授权声明（NOTICE）

## 1. 本项目是什么

本项目是一个**独立重写的 2048 玩法实现**（名称：2048 像素版 / Pixel 2048），
可运行于浏览器与 B站小游戏容器。全部代码、绘制、音效均为本项目原创，
**不包含任何第三方游戏的可执行文件、图片、字体、音乐或反编译产物**。

## 2. 玩法来源

2048 玩法由 Gabriele Cirulli 于 2014 年以 MIT 协议公开发布：

- 仓库：https://github.com/gabrielecirulli/2048
- 许可证：MIT
- 其自述：2048 是 1024（Veewo）的克隆，2048/1024 均受 Threes!（Asher Vollmer）启发

MIT 许可证全文（原文引用，用于满足其署名要求）：

```
The MIT License (MIT)

Copyright (c) 2014 Gabriele Cirulli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

本项目**未复制**上述仓库的任何源代码文件，仅实现同一套公开的游戏规则
（4×4 网格、同值合并、每回合生成 2 或 4、达成 2048 获胜）。游戏规则本身
属于思想/玩法，不受著作权保护；受保护的是具体代码、美术、音频与商标。

## 3. 与截图中的 Android 应用的关系

用户截图中的应用为「2048 开放趣味游戏」v1.16.2（Android，约 3.98 MB）。
本项目与该应用**没有任何代码或资源上的关联**：

- 没有反编译、解包、Hook 或提取该 APK 的任何内容；
- 没有使用它的名称、图标、包名、界面素材或配色方案；
- 仅有「2048」这一公共玩法与数字方块形态相同。

若要在应用商店/平台发布，**请勿使用**上述应用或原版 2048 的名称、图标、
包名（如 `com.gabrielecirulli.app2048`）以及任何第三方美术资源。

## 4. 本项目自身的许可

- 代码：MIT（见 [LICENSE](../LICENSE)）
- 你可以在保留版权与许可声明的前提下商用、修改、闭源再分发。
- 本项目不含外部素材，因此不存在素材授权链问题：
  - 图形：全部由 Canvas 2D 代码绘制
  - 音效：全部由 WebAudio 振荡器实时合成
  - 字体：使用系统字体栈，不打包字体文件

## 5. 平台侧要求（与开源许可不同）

开源许可解决的是「版权」，平台审核解决的是「资质与内容合规」。
即使代码是 MIT，上架 B站仍需满足：实名/主体认证、ICP 备案、小游戏备案、
软著或版号（视商业模式而定）、内容规范与未成年人保护要求。
详见 [B站平台调研](BILIBILI-PLATFORM.md) 与 [发布检查清单](RELEASE-CHECKLIST.md)。
