# 小齐对话组件：界面记录

这是既有博物馆视觉系统中的一个操作型组件，不建立新品牌。对话面板采用与背景融合的暖纸、淡墨、细分隔线和少量朱色，保留原有小齐形象及馆藏式语气，不再使用大块深绿标题栏。对话优先保证问题、回答、资料出处和能力状态清晰。桌面为右下角收起入口和浮层，手机为可滚动的底部面板。

内容与可信度边界：本机服务调用 Qwen3.8-Flash；用户问题与所选展品名称及其可用事实摘记会发送到阿里云百炼，页面明确提示并建议不输入隐私信息。浏览器只保留内存中的最近问答，服务不持久化对话；密钥不嵌入网页。关键词匹配提供的是“相关资料”，并非对每项回答的逐句引用；模型事实仍需核对，当前尚未接入完整知识库检索。

输入框下不再显示说明文字；数据、费用及核验提醒收纳于面板标题旁可用键盘展开的“使用说明”中。

## 看哪件，问哪件

展品卡片的“问问小齐”打开同一侧边面板，并显示当前展品及来源链接。不同展品和普通对话各自保留本页内存中的对话；切换时中止正在进行的请求，并保留未完成的问题供重试。自动讲解默认开启，停留在已登记场景后也会调用模型，可通过开关关闭；文字与语音可分别控制。关闭面板后焦点返回触发展品入口；原来的普通入口和问答不受影响。

浏览器只发送展品 ID，服务端用 `dist/museum/artwork-context.json` 查找站内名称；不要把浏览器传来的自由文本当作馆藏事实。当前身份索引涵盖展馆现有全部 60 幅影像，新增或调整展品后运行 `node tools/build-museum-context.mjs` 更新，并以 `node tools/build-museum-context.mjs --check` 核查同步。

`verified-exhibits.json` 单独保存逐件核对的事实摘记及原始馆藏链接，2026-11-03 首批核对 8 条；它不是完整知识库，也不表示相关图片已经获准转载。选中其他影像时仅提供展签名称，模型应说明具体资料尚待核实；来源链接可供观众自行查阅，不把标题或图片报道自动升级成已核实事实。模型回答仍可能有误，馆藏资料链接也不是每句话的逐句引用。增加已核实条目时须人工核对事实与来源，不可从索引自动生成“已核实”状态。

交互中的视觉强调只服务开关、发送与焦点。入口和面板不会改写宿主页面的样式或路由；组件提供销毁接口，需在实际集成时验证与展馆弹层、移动端和键盘焦点的关系。

## 本次验收

桌面及 360、320 像素宽模拟视口截图已检查：面板、输入与主要问题在视口内可操作，窄屏内容在面板内滚动，页面没有横向溢出。模型接口已通过模拟、真实请求与展馆页面端到端检查；真实手机、屏幕阅读器仍待验收。

## 金石纸笺背景

背景为新生成的 `xiaoqi-jinshi-paper-v1.png`（1024 × 1536，SHA-256 `EE5609A8E141F84C7D65B0415AE37BA4834167FA43B519C9AB4F32193F2AFEF8`），由用户指定的生图会话使用内置 Image 工具生成一次；原图另存于 `山东文化图片/小齐对话背景-金石纸笺-v1.png`。画面以宣纸和嘉祥汉画像石的车马线条为灵感，是装饰性 AI 想象画，不代表真实馆藏或特定文物。

空白状态可见车马纹样，有对话内容时加深浅色叠层以保证阅读；不支持 `:has()` 的浏览器默认使用更浅的阅读状态。标题、正文和输入区作为一整张纸笺处理，推荐问题缩为三个轻量入口；对话开始后小齐的形象留在标题区。图片不可用时回退到浅纸色，输入和文字仍是可交互的独立 HTML 层。

### 实际生成提示词

```text
Use case: stylized-concept
Asset type: An original vertical background image for the right-hand conversation panel of a digital Shandong culture museum called “一物见山东”.
Primary request: Create one elegant “金石纸笺” background. Most of the image is warm, light-colored traditional xuan paper with very subtle, authentic paper fibers. Inspired by the carved lines and visual language of Han-dynasty Jiaxiang stone-relief rubbings, create original, restrained decorative chariot-and-horse linework and stone-carving motifs, concentrated mostly along the lower portion and corners. The motifs are imaginative decoration, not a representation of any specific existing artifact, museum holding, or archaeological find.
Composition: Portrait orientation, suitable for a tall narrow chat panel. Keep the upper and central portions predominantly light, quiet, and nearly empty for readable overlaid conversation text. The historical linework must remain subordinate to the blank paper and softly fade toward the center. This is only a background asset, not a poster or an interface mockup.
Palette and mood: warm paper white, very pale ink grey, and restrained low-saturation celadon green; at most a tiny touch of vermilion. Refined, calm, tactile, understated; no heavy contrast or busy visual textures behind the intended text area.
Constraints: No words, Chinese characters, calligraphy, inscriptions, seals, logos, symbols resembling text, typography, interface controls, frames, dialog bubbles, watermarks, or captions. Do not imitate or claim to depict any particular real cultural relic or collection. One image only.
```
