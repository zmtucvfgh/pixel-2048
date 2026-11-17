# Changelog

遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-11-17

首个可发布版本。

### 新增

- 4×4 2048 核心规则：合并、计分、胜负判定，支持注入随机源便于测试
- Canvas 2D 全量界面：标题、分数/最高分、棋盘、工具栏、弹层
- 输入：方向键、WASD、触摸/鼠标滑动、画布按钮
- 动画：滑动缓出（150ms）、合并弹跳、新块缩放、吞并淡出
- 存档：局面、最高分、音效开关；切后台与关闭页面时保存
- 撤销：最近 20 步
- 音效：WebAudio 合成，无音频文件
- 自适应布局：内容最大宽度 560px，窄屏自动降级字号
- B站小游戏适配层与构建脚本（`dist/bilibili`）
- 规则单测 9 例（`node --test`）

### 文档

- `docs/GAMEPLAY.md` 玩法与功能梳理
- `docs/BILIBILI-PLATFORM.md` 平台发布要求调研
- `docs/RELEASE-CHECKLIST.md` 上线检查清单
- `NOTICE.md` 来源与授权声明
