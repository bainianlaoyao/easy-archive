# easy-archive

一个 DSH(DeepSeek Harness)Web 插件:把「归档会话」从 ⋮ 二级菜单里移到工作区侧边栏条目本身上,两击归档:

1. **悬停会话条目** — 归档图标出现在 ⋮ 按钮旁边;
2. **点击一次** — 按钮切换成红色 **「确认归档」** 胶囊;
3. **再点击一次** — 直接归档该会话。

**⋮ 菜单里的「归档会话」项会被自动隐藏** — 归档只存在于条目上,绝不藏在二级菜单里。

## 特性

- 每个会话条目行内两击归档(第一击武装红色确认,第二击提交)。
- ⋮ 菜单每次打开时自动移除「归档会话」项(重命名/分叉保留原位)。
- 不接管任何内置插槽,不替换自带工作区浏览器:重命名、分叉、搜索、拖拽排序等全部原样保留。
- 归档走与内置菜单完全相同的调用(`ctx.workspaces.archiveSession`),行为与权限一致。
- 安全兜底:确认态在 4 秒、鼠标离开条目、或点击其它位置时自动解除;身份存疑的条目宁可不放按钮,也不冒误归档的风险。
- 中英双语、零构建、不依赖 React。

## 安装

从 DSH 插件市场安装(推荐):

```
dsh plugin --profile web add github:bainianlaoyao/easy-archive
```

或手动加入 web profile 的 `package.json`:

```json
{
  "dependencies": { "easy-archive": "github:bainianlaoyao/easy-archive" },
  "dsh": { "profile": { "bundles": [ "...", "easy-archive" ] } }
}
```

然后在 profile 目录执行 `pnpm install` 并重启 `dsh web`(新插件在启动时进入
`window.__DSH_BOOT__` 图;之后修改 `lib/client.js` 刷新页面即可生效)。

## 工作原理

宿主半区(`lib/index.js`)是一个空插件行,负责把 `dsh.client` 声明带进 profile 的加载图;
浏览器半区(`lib/client.js`)观察侧边栏 DOM,对每个渲染出的会话条目:

- 从 `ctx.sessions.list` 快照按显示标题精确解析会话 id(标题重复时用渲染出的相对时间分桶消歧);
- 在条目上盖 id 戳,并把 16px 归档按钮插入条目的操作区、⋮ 按钮之前;
- 一旦发现打开的 ⋮ 菜单,移除其中的「归档会话」项。

点击按钮不会冒泡到条目的「打开会话」事件。

## 说明

- 空白「新会话」行与搜索结果行不会出现归档按钮。
- 显示标题与时间分桶完全相同的会话会被跳过(保守策略:绝不误归档)。
- 卸载:移除依赖与 bundles 条目,`pnpm install`,重启 `dsh web`。

## 许可证

MIT
