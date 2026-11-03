---
name: 齐鲁文化博物馆
description: 一物见山东的文化影像浏览与收藏页面设计记录
colors:
  pine: "#29493d"
  deep: "#1d3a31"
  pine-hover: "#416153"
  focus-earth: "#9a4b2f"
  paper: "#f6f5f0"
  label-paper: "rgba(248,247,237,.97)"
  board-paper: "#f8f8f2"
  white: "#fff"
  muted-copy: "#68786e"
  artwork-copy: "#465e51"
  filter-text: "#53675c"
  line: "#d7dbd2"
  swatch-ink: "#272d2a"
  swatch-earth: "#9a765c"
  swatch-jade: "#66877a"
  swatch-red: "#aa5347"
  swatch-white: "#f7f5ee"
typography:
  display:
    fontFamily: 'CityDisplay, "Songti SC", "STSong", "SimSun", serif'
    fontSize: "clamp(38px, 4vw, 56px)"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: ".08em"
  headline:
    fontFamily: 'CityDisplay, "Songti SC", "STSong", "SimSun", serif'
    fontSize: "clamp(27px, 2.4vw, 38px)"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: ".04em"
  title:
    fontFamily: 'CityDisplay, "Songti SC", "STSong", "SimSun", serif'
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.35
  body:
    fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif'
  label:
    fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "12px"
    letterSpacing: ".14em"
rounded:
  circle: "50%"
spacing:
  filter-gap: "8px"
  card-image-to-meta: "15px"
  artwork-column-gap: "24px"
components:
  board-trigger:
    backgroundColor: "{colors.pine}"
    textColor: "{colors.white}"
    padding: "11px 18px"
  board-trigger-hover:
    backgroundColor: "{colors.pine-hover}"
  filter:
    backgroundColor: "{colors.white}"
    textColor: "{colors.filter-text}"
    padding: "7px 15px"
  filter-selected:
    backgroundColor: "{colors.pine}"
    textColor: "{colors.white}"
---

# Design System: 齐鲁文化博物馆

## Overview

**Creative North Star:「文化影像档案」**

这是对 `dist/museum/` 当前实现的描述性记录，不是全站规范，也不是新视觉方案。页面借鉴用户选定的 Moodboard Museum 浏览方式，以山东文化整体为主题，从单件器物、纹样和手艺的影像出发，不按十六城划分展区。深松绿、柔白纸面、摄影拼贴、细分隔线与中文展示字体共同形成安静的展签气质；画面中的文化影像是视觉主体。

封面先以铺满视口的影像拼贴建立进入感，居中的浅色展签提供清晰入口；进入后转为可搜索、筛选和收藏的影像档案。此处的名称是对已有实现的概括，不代表另一次用户确认的视觉提案。

**Key Characteristics:**

- 影像主导，浅纸与松绿界面承担组织和阅读。
- 展签式中文标题、少量英文衬线小字、细线与方正边界。
- 从封面过渡到按主题或画面主色浏览的作品瀑布流。
- 每件作品保留说明、署名和来源入口；收藏是当前浏览器中的个人灵感板。

## Colors

松绿与暖白是页面的结构色，作品图像提供主要色彩变化。上方 frontmatter 记录已使用的代表值；局部的相近灰绿和描边仍以 `museum.css` 为准。

### Primary

- **松绿 `pine`**：标题、主要按钮、选中筛选项、页脚及基础文字。
- **深绿 `deep`**：搜索输入文字；`pine-hover` 是主要按钮的悬停色。
- **赭土色 `focus-earth`**：键盘可见焦点轮廓，也用于封面入口悬停，不作为大面积品牌色。

### Neutral

- **浅纸 `paper`**：档案页面底色；`label-paper` 用于封面和横幅上的半透明展签，`board-paper` 用于灵感板。
- **白色 `white`**：输入框和未选中的筛选按钮，以及深绿表面上的文字。
- **灰绿 `muted-copy`、`artwork-copy`、`filter-text`**：辅助说明、作品描述与未选中标签文字；`line` 用于分隔线。
- **影像色样**：`swatch-ink`、`swatch-earth`、`swatch-jade`、`swatch-red`、`swatch-white` 对应墨黑、陶褐、青绿、朱红、素白。它们是人工整理的画面主色筛选，不是文物材质或年代的判定。

## Typography

中文展示字体 `CityDisplay` 从 `../fonts/city-display-v1.woff2` 加载，回退至宋体类衬线；正文与操作文字使用微软雅黑、苹方及无衬线回退。封面英文副题和档案横幅英文采用 Georgia 衬线、小字号和较宽字距。

### Hierarchy

- **Display**：封面馆名；桌面字号与行高见 frontmatter，700px 以下为 `clamp(31px, 9vw, 43px)`，360px 以下为 30px。
- **Headline**：档案介绍标题；桌面规格见 frontmatter，700px 以下为 26px。
- **Title**：作品标题为 20px，700px 以下为 17px；展示字体、500 字重。
- **Body**：作品说明使用展示字体（14px、1.8 行高；移动端 13px）；介绍文字和操作文字多用无衬线（约 12–14px）。
- **Label**：筛选提示为 12px、`.14em` 字距；作品年代和来源使用较小的辅助文字，仍应保留可辨识的层次。

## Layout

- **封面**：至少一屏高（`100svh`）；三行连续影像带以不同速度和方向横向流动，行间约 6px。居中展签最大宽度 640px，内层以 1px 细线围合；地图返回链接与项目署名分别位于角落。
- **档案**：顶部为影像横幅、馆名展签与返回地图入口。内容宽度为 `min(1450px, calc(100% - 80px))`，1000px 以下两侧总留白为 56px，700px 以下为 36px。
- **作品流**：使用 CSS 多列布局，桌面四列、列间距 24px；1000px 以下三列，700px 以下两列且间距 14px，360px 以下一列。图片以自然比例为主，但受最高高度和 `object-fit: cover` 约束，可能裁切；作品不被统一成等高卡片。
- **移动端**：700px 以下保留三行流动影像带及一行档案横幅，适当缩小影像与间隔；页脚纵向排列，作品收藏按钮移到标题下方。360px 以下介绍与灵感板入口纵向排列。
- **留白**：展签、筛选区和结果区间距较宽；标签之间通常为 8px，作品图与说明之间为 15px。这里是实际使用的间距，不宣称存在完整的全站间距刻度。

## Elevation & Depth

档案和作品卡片基本平面化，以纸色、细线和图片区分层级；阴影集中在浮于影像上的封面展签与覆盖页面的灵感板。

- **封面展签**：`0 16px 40px rgba(15,27,21,.2)`，将浅色标签从深色拼贴上轻轻抬起。
- **灵感板**：`-12px 0 40px rgba(19,38,28,.18)`；背景遮罩为 `rgba(16,33,26,.55)`，强调当前的侧边对话层。
- **影像遮罩**：封面和档案横幅分别使用深绿透明叠层（`.46` 与 `.32` 不透明度），使其上的文字保持清晰。

## Shapes

以矩形、直角、1px 细边框和水平细线为主，像展签和纸上目录；作品卡片本身没有圆角容器或常驻阴影。小尺寸圆形仅用于色彩筛选色样和灵感板数量标记。封面标记由两条短线与一个旋转的细边菱形组成。

## Components

### 封面与导航

浅色双层展签居中，中文馆名、英文副题、简短引文与带下划线的「进入博物馆」按纵向顺序排列。入口颜色和边线在悬停时于 0.2 秒内变为赭土色。封面、档案横幅和页脚均保留返回文化地图的路径；档案横幅馆名可返回封面。

### 搜索与筛选

浏览方式为「按主题／按色彩」并列切换；选中项以松绿底、白字呈现。搜索框为白底细边框，输入获得焦点时容器边线加深；右侧深绿搜索按钮保持独立可见。主题和颜色筛选为方形边框按钮，选中状态与浏览方式一致，颜色筛选在文字前附 13px 圆形色样。

### 作品卡片

以图片为首，不加整体卡片背景；下方依次呈现作品名、年代或类别、收藏按钮、简短说明、署名与来源链接。图片按容器宽度显示、最高 560px；作品间保留自然高低差。收藏按钮为空心细边，已收藏状态使用浅绿底并更新文字与 `aria-pressed`。图片有描述性替代文字；封面拼贴是装饰性图片。

### 灵感板

入口为深绿矩形按钮，数量放在细边圆形标记内。面板从右侧覆盖，宽度为 `min(470px, 100%)`，含关闭按钮、说明、空状态和由 78px 方形缩略图组成的收藏列表。收藏保存在当前浏览器；存储不可用时界面明确提示刷新后可能丢失。

### 小齐

已从 `../museum-assistant/assistant.mjs` 接入。它沿用深绿、浅纸和细线，在桌面以右下角入口及浮层出现，600px 以下改为靠底部的面板；组件自身记录见 `../museum-assistant/DESIGN.md`。实际对话能力取决于对应服务配置，回答来源与能力边界应清楚显示。

### 焦点与动态

按钮、链接和输入使用 3px 赭色可见焦点轮廓与 4px 偏移；页面提供跳至展品的跳过链接、筛选及收藏状态、结果变化的辅助提示。封面和横幅提供同步的暂停／继续动态按钮；影像带离开视口或页面隐藏时也会暂停。系统请求减少动态效果时关闭平滑滚动、过渡和动画。

## Do's and Don'ts

### Do:

- **Do** 以作品影像为中心，保留作品名称、说明、署名和可打开的来源信息。
- **Do** 延续松绿与浅纸、细线、方正控件和中文衬线标题，让界面退到影像之后。
- **Do** 保留主题／色彩浏览、可见选中状态、键盘焦点、空结果与返回地图路径。
- **Do** 依据 `SOURCES.md` 核对素材来源与使用条件；部分图片权利仍待确认。

### Don't:

- **Don't** 将山东文化整体展馆改写为十六城目录，或暗示此页面是山东博物馆官方站点。
- **Don't** 凭图像推断作品年代、地点或馆藏身份；未核实的信息保持未确认。整体与局部影像要明确区分。
- **Don't** 把色彩筛选误称为自动识别结果，也不要在服务状态未确认时宣称小齐已接通 AI。
- **Don't** 为作品卡片普遍添加圆角、厚重阴影或与现有系统无关的高饱和装饰。
