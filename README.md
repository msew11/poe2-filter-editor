# Exile Forge · 流放之路 2 过滤器工坊

暗金风格的 React 页面工程：顶部 Header、左侧导航、多标签工作区，以及独立规则库。

## 启动与检查

这是一个由 `package.json` 管理的 React + TypeScript + Vite 前端工程。请在 `poe2-filter-editor` 目录中执行命令；该目录是工程根目录。

需要 Node.js 20.19+ 或 22.12+，推荐 Node.js 24 LTS。项目使用 pnpm 锁定依赖，已安装依赖后，npm 与 pnpm 都可以运行 `scripts`。

```sh
pnpm install
pnpm start
```

当前电脑已经安装依赖，可以直接使用 npm 启动：

```sh
npm start
```

| scripts | npm 命令 | 用途 |
| --- | --- | --- |
| start | `npm start` | 启动开发服务 |
| dev | `npm run dev` | 启动开发服务，与 start 相同 |
| typecheck | `npm run typecheck` | TypeScript 类型检查 |
| build | `npm run build` | 类型检查并生成 dist/ |
| preview | `npm run preview` | 预览已经生成的生产构建 |
| test | `npm test` | 运行规则逻辑测试 |

浏览器访问 http://127.0.0.1:5173 。也可以在编辑器的 NPM Scripts 面板选择 `start` 运行。当前电脑保留 `./start.ps1` 兼容入口，该脚本最终调用同一个 start 脚本。

## 规则库

- 规则页只创建、删除独立规则，没有启用开关和规则优先级排序。
- 创建弹窗支持命名、Show/Hide 切换。
- 字段组件垂直排列，可添加、删除，通过手柄拖动或键盘调整字段顺序。
- 手柄获得焦点后，空格拾起、上下方向键移动、空格放下，Escape 取消。
- 支持 25 种字段：品质、稀有度、物品/区域/掉落等级、堆叠、孔数、途石阶级、未鉴定阶级、基础防御、类别、底材、鉴定/腐化/镜像/双重腐化、颜色、字号、音效、光柱、小地图图标。
- 同类型字段允许重复添加，例如 ItemLevel >= 70 与 ItemLevel <= 85。
- 弹窗底部实时生成规则文本；保存前校验名称、数值范围和文本值。
- 空字段规则合法，会匹配所有物品，弹窗底部会提示。
- 取消关闭弹窗会丢弃草稿，创建后加入规则库并自动保存至本机。

规则之间的组合与执行顺序留给后续编排功能。当前的列表顺序不表示执行优先级；规则库不会自动拼接成完整过滤器。

## 其他页面

- 导航打开标签时去重，支持切换、关闭、键盘切换、空工作区。
- 工作区和规则库保存到浏览器 localStorage，支持旧版两条示例规则的数据迁移。
- 外观页提供试色参考，不会自动修改已创建规则；实际样式在规则中添加颜色/字号字段。
- 掉落预览只测试所选的单条规则，示例是区域/物品等级 80 的 Iron Cuirass。
- 源码页查看、复制、导出单条规则的 UTF-8 `.filter` 文件，不代表完整编排结果。

尚未实现完整物品数据库、已有过滤器导入、规则编排、账号及云端同步。预览是固定示例演示，未模拟实际游戏的音效、光柱和小地图效果。底材和类别值使用英文游戏名称，一行一个值。

## 技术与目录

React 19 + TypeScript + Vite + Tailwind CSS 4，UI 组件采用 shadcn/ui 的本地源码组织方式。Dialog/标签基于 Radix，字段排序使用 dnd-kit，保留 `components.json` 便于扩充。

```text
src/
  App.tsx                    # Header、导航、标签与持久化
  styles.css                 # 工坊主题与响应式布局
  components/
    pages.tsx                # 规则库、外观、单规则预览与源码
    rule-builder.tsx         # 创建弹窗、字段增删、拖动及实时文本
    fields/                  # 每个字段类型对应的编辑组件
      numeric-fields.tsx
      condition-fields.tsx
      action-fields.tsx
      index.ts               # 字段类型与组件的注册表
    ui/                      # 基础 UI 组件
  lib/
    rules.ts                 # 字段定义、校验、序列化和单规则匹配
    rules.test.ts            # 语法、匹配、校验与数据迁移测试
    workspace.ts             # 工作区模型及兼容读取
    utils.ts
```

新增字段时，在 `lib/rules.ts` 定义默认参数与语法，添加对应编辑组件，并在 `components/fields/index.ts` 注册。规则文本使用稳定 ID 保存字段顺序，方便后续编排功能引用规则。

修改 `src/styles.css` 顶部变量可统一调整配色。没有依赖远程字体或游戏图片。

语法参考：[GGG 官方文档](https://www.pathofexile.com/item-filter/about)。
