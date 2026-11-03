// Supplementary images keep their source-page identity; a detail is not a new object.
const met = 'https://www.metmuseum.org/art/collection/search/';
const paris = 'https://www.parismuseescollections.paris.fr/fr/musee-cernuschi/oeuvres/';
const scissors = 'https://www.sohu.com/a/297522068_120021510';
const exhibition = 'https://www.sohu.com/a/1000795049_121106991';
const prints = 'https://static.nfnews.com/content/202102/10/c4776155.html';
const yangjiabu = 'https://www.cnacs.net.cn/14/202608/8488.html';
const metCredit = '美国大都会艺术博物馆 · 图片 CC0';
const parisCredit = '巴黎市立亚洲艺术博物馆（Musée Cernuschi）/ Paris Musées · 图片 CC0';
const scissorsCredit = '图片来源：中国美术馆山东剪纸收藏专题；单件馆藏信息待核';

function record(file, title, date, medium, description, credit, source, themes, colors, keywords, mosaic = false) {
  return {
    id: file.replace(/\.[^.]+$/, ''), title, subtitle: medium, date, medium,
    image: `images/new/${file}`, alt: `${title}，${description}`, description,
    credit, source, sourceLabel: '查看图片来源', themes, colors, keywords,
    position: 'center center', mosaic
  };
}

export const newArtworks = [
  record('met-42698.jpg', '高柄杯', '龙山文化 · 陶器', '黑陶', '细薄的杯身与高柄，展现龙山文化陶作的轻盈。', metCredit, met + '42698', ['earth'], ['ink','earth'], ['龙山','山东','陶器','高柄杯'], true),
  record('met-49379.jpg', '陶鬹', '大汶口文化 · 陶器', '陶器', '三足与器口共同构成富有辨识度的陶器轮廓。', metCredit, met + '49379', ['earth'], ['earth'], ['大汶口','陶鬹','陶器'], true),
  record('met-42753.jpg', '玉斧', '大汶口至龙山文化 · 玉器', '玉石', '打磨后的器形，留下远古玉作的线条。', metCredit, met + '42753', ['jadeglass'], ['jade','earth'], ['玉斧','大汶口','龙山'], true),
  record('met-51280.jpg', '有牙玉璧', '龙山文化 · 玉器', '玉石', '玉璧边缘的齿状轮廓，让圆形器物呈现出别样节奏。', metCredit, met + '51280', ['jadeglass'], ['jade','earth'], ['玉璧','玉器','龙山'], true),
  record('met-36441.jpg', '礼仪性玉斧', '大汶口晚期至龙山早期 · 玉器', '玉石', '宽阔的玉斧展现了古代玉石打磨与造形的工艺。', metCredit, met + '36441', ['jadeglass'], ['jade','earth'], ['玉斧','大汶口','龙山'], true),
  record('met-52532.jpg', '磨光黑陶杯', '龙山文化 · 陶器', '黑陶', '杯身经过磨光，深色陶面呈现含蓄的光泽。', metCredit, met + '52532', ['earth'], ['ink','earth'], ['黑陶','龙山','陶杯'], true),
  record('cma-1985-73.jpg', '车马出行画像石', '东汉 · 石刻', '石质浅浮雕与阴刻', '车马与人物展开一幅出行图景；馆方将其风格与山东嘉祥石刻比较。', '克利夫兰艺术博物馆 · Andrew R. and Martha Holden Jennings Fund · 图片 CC0', 'https://www.clevelandart.org/art/1985.73', ['bronze','painting'], ['ink','earth'], ['画像石','石刻','车马','汉代','嘉祥风格'], true),
  record('paris-9908.jpg', '黑陶高足杯', '龙山文化 · 陶器', '黑陶', '高足托起轻巧杯身，馆方记录其制作地为山东。', parisCredit, paris + 'gobelet-a-pied', ['earth'], ['ink','earth'], ['山东','龙山','黑陶','高足杯'], true),
  record('paris-9909.jpg', '黑陶壶', '龙山文化 · 陶器', '黑陶', '圆润壶身与细长颈部相接，呈现黑陶的造型之美。', parisCredit, paris + 'vase-188', ['earth'], ['ink','earth'], ['山东','龙山','黑陶','陶壶'], true),
  record('paris-9910.jpg', '黑陶壶（三纽）', '龙山文化 · 陶器', '黑陶', '壶身带有三处纽饰，馆方记录其制作地为山东。', parisCredit, paris + 'vase-189', ['earth'], ['ink','earth'], ['山东','龙山','黑陶','陶壶'], true),
  record('paris-2019-154.jpg', '刀币', '战国 · 青铜', '青铜', '刀形货币留下了古代交易与铸造技艺的线索。', parisCredit, paris + 'monnaie-couteau-0', ['bronze'], ['jade','earth'], ['山东','战国','青铜','刀币'], true),

  record('gdm-gaomi-liukai.png', '榴开百子', '民国 · 高密扑灰年画', '年画', '成对的年画以石榴与人物寄托生活中的美好愿望。', '潍坊市博物馆藏 · 图片来源：广东省博物馆展览', 'https://www.gdmuseum.org.cn/cn/col48/15782', ['painting','craft'], ['red','white'], ['高密','扑灰年画','石榴']),
  record('shandong-cut-laoshu.jpg', '老鼠娶亲（局部）', '高密剪纸 · 作品局部', '剪纸', '这幅局部画面来自一套老鼠娶亲剪纸，并非全套作品。', '作品：范祚信 · ' + scissorsCredit, scissors, ['painting','craft'], ['red','white'], ['高密','剪纸','老鼠娶亲','局部']),
  record('shandong-cut-shuihu.jpg', '水浒人物', '高密剪纸 · 民间艺术', '剪纸', '两个人物在剪纸的线条与留白中生动呈现。', '作品：刘彩花 · ' + scissorsCredit, scissors, ['painting','craft'], ['red','white'], ['高密','剪纸','水浒']),
  record('shandong-cut-shuiman.jpg', '水漫金山（局部）', '牟平剪纸 · 作品局部', '剪纸', '从人物和繁密线条中，细看民间剪纸对戏曲故事的表达。', '作品：胡维英 · ' + scissorsCredit, scissors, ['painting','craft'], ['red','white'], ['牟平','剪纸','水漫金山','局部']),
  record('shandong-cut-bianfu.jpg', '蝙蝠', '胶东染色剪纸 · 民间艺术', '剪纸', '蝙蝠造型与鲜明色彩，呈现胶东剪纸中的吉祥寓意。', scissorsCredit, scissors, ['painting','craft'], ['red','white'], ['胶东','染色剪纸','蝙蝠','纹样']),
  record('shandong-cut-baxian.jpg', '八仙', '胶东剪纸 · 民间艺术', '剪纸', '民间传说中的人物形象，被剪纸化为连贯的画面。', scissorsCredit, scissors, ['painting','craft'], ['red','white'], ['胶东','剪纸','八仙']),
  record('shandong-cut-jinyu.jpg', '金玉满堂（剪纸）', '胶东剪纸 · 民间艺术', '剪纸', '以纸为材，剪出寄托美好祝愿的图样。', scissorsCredit, scissors, ['painting','craft'], ['red','white'], ['胶东','剪纸','金玉满堂']),
  record('shandong-cut-jinshan.jpg', '金山寺抬阁', '牟平剪纸 · 民间艺术', '剪纸', '抬阁场景中的人物与装饰，在剪纸中交织。', '作品：孙绪民 · ' + scissorsCredit, scissors, ['painting','craft'], ['red','white'], ['牟平','剪纸','金山寺','抬阁']),
  record('shandong-cut-liangzhu.jpg', '梁祝', '胶东剪纸 · 民间艺术', '剪纸', '熟悉的民间故事，在剪纸的对称与留白中重新展开。', scissorsCredit, scissors, ['painting','craft'], ['red','white'], ['胶东','剪纸','梁祝']),
  record('shandong-cut-tianhe.jpg', '天河配', '胶东剪纸 · 民间艺术', '剪纸', '纸上的人物与纹样，承载着民间故事的想象。', scissorsCredit, scissors, ['painting','craft'], ['red','white'], ['胶东','剪纸','天河配']),

  record('hanfu-hongpao-01.png', '大红色暗花纱缀绣云鹤方补圆领袍', '明 · 服饰', '服饰与刺绣', '整件服饰的影像，可见圆领袍的形制与胸前补子。', '山东博物馆藏 · 孔府旧藏 · 图片来源：展览报道', exhibition, ['craft','painting'], ['red','earth'], ['明代','服饰','孔府','云鹤','刺绣'], true),
  record('hanfu-hongpao-02.png', '云鹤方补圆领袍（补子局部）', '明 · 服饰细节', '服饰与刺绣', '同一件圆领袍的补子局部，适合细看云鹤刺绣。', '山东博物馆藏 · 孔府旧藏 · 图片来源：展览报道', exhibition, ['craft','painting'], ['red','earth'], ['明代','服饰','孔府','云鹤','刺绣','局部'], true),
  record('hanfu-xiangshan-01.png', '香色芝麻纱绣过肩蟒女长衫', '明 · 服饰', '服饰与刺绣', '整件女长衫的影像，保留服饰形制与纹样的整体关系。', '山东博物馆藏 · 孔府旧藏 · 图片来源：展览报道', exhibition, ['craft','painting'], ['earth','white'], ['明代','服饰','孔府','刺绣'], true),
  record('hanfu-xiangshan-02.png', '过肩蟒女长衫（局部）', '明 · 服饰细节', '服饰与刺绣', '同一件女长衫的局部，细看针线与纹样。', '山东博物馆藏 · 孔府旧藏 · 图片来源：展览报道', exhibition, ['craft','painting'], ['earth','white'], ['明代','服饰','刺绣','纹样','局部'], true),
  record('hanfu-feiyu-01.png', '香色麻飞鱼贴里', '明 · 服饰', '服饰与纹样', '整件贴里服饰的影像，展示衣身与纹样的布局。', '山东博物馆藏 · 图片来源：展览报道', exhibition, ['craft','painting'], ['earth','white'], ['明代','服饰','飞鱼','纹样'], true),
  record('hanfu-feiyu-02.png', '飞鱼贴里（局部）', '明 · 服饰细节', '服饰与纹样', '同一件贴里的纹样局部，让细节得以近看。', '山东博物馆藏 · 图片来源：展览报道', exhibition, ['craft','painting'], ['earth','white'], ['明代','服饰','飞鱼','纹样','局部']),
  record('hanhua-riyue.png', '日月同辉汉画像石图像', '汉 · 画像石图像', '画像石图像', '画面为画像石图像，具体载体尚待核实，不视作原石照片。', '原石：滕州市汉画像石馆 · 此图载体与收藏单位待核', exhibition, ['bronze','painting'], ['ink','white'], ['汉画像石','日月同辉','滕州','石刻']),
  record('hanhua-yinan-01.png', '乐舞百戏（拓片全景）', '汉 · 沂南北寨汉墓画像石拓片', '画像石拓片', '横向全景展示画像石上的乐舞与百戏；拓片收藏单位待核。', '沂南北寨汉墓画像石图像 · 拓片收藏单位待核', exhibition, ['bronze','painting'], ['ink','white'], ['汉画像石','沂南','北寨','乐舞百戏','拓片','全景']),
  record('hanhua-yinan-02.png', '乐舞百戏（拓片左部）', '汉 · 沂南北寨汉墓画像石拓片', '画像石拓片', '同一画像石拓片的左部细节，记录乐舞与人物。', '沂南北寨汉墓画像石图像 · 拓片收藏单位待核', exhibition, ['bronze','painting'], ['ink','white'], ['汉画像石','沂南','乐舞百戏','拓片','左部']),
  record('hanhua-yinan-03.png', '乐舞百戏（拓片右部）', '汉 · 沂南北寨汉墓画像石拓片', '画像石拓片', '同一画像石拓片的右部细节，延续画面中的人物与故事。', '沂南北寨汉墓画像石图像 · 拓片收藏单位待核', exhibition, ['bronze','painting'], ['ink','white'], ['汉画像石','沂南','乐舞百戏','拓片','右部']),
  record('hanhua-paochu.png', '庖厨主题汉画像石展出图', '汉 · 画像石展出影像', '画像石展出图', '图片由上下两幅展品照片组成，单件名称与对应关系待核。', '图片来源：临沂市博物馆相关展览报道', exhibition, ['bronze','painting'], ['ink','earth'], ['汉画像石','庖厨','临沂','展览']),

  record('nianhua-fenglin.jpg', '凤含芝草 麟吐玉书（对）', '清 · 平度宗家庄年画', '木版年画', '成对的画面中，凤凰与麒麟承载祥瑞的想象。', '平度新盛元泰画店 · 山东东方中国民艺博物馆藏', prints, ['painting','craft'], ['red','white'], ['平度','宗家庄','年画','凤凰','麒麟']),
  record('nianhua-jinyu.jpg', '金鱼（玉）满堂', '清末 · 平度宗家庄年画', '年画', '朱色单版画面，以金鱼图样寄寓吉祥。', '宗成云藏 · 图片来源：南方日报报道', prints, ['painting','craft'], ['red','white'], ['平度','宗家庄','年画','金鱼']),
  record('nianhua-gusao.jpg', '姑嫂闲话', '清 · 高密扑灰年画', '扑灰年画', '一对人物在日常对话中，呈现民间绘画的生活趣味。', '高密盛合画店石玉山 · 高密市文化馆藏', prints, ['painting','craft'], ['red','white'], ['高密','扑灰年画','人物'], true),
  record('nianhua-tijian.jpg', '踢毽子', '清 · 高密扑灰年画', '扑灰年画', '人物与动作相映成趣，留下民间生活的轻快一刻。', '高密万聚永画店李云香 · 高密市文化馆藏', prints, ['painting','craft'], ['red','white'], ['高密','扑灰年画','人物','踢毽子'], true),
  record('nianhua-longdan.jpg', '龙丹献瑞 延年益寿', '清 · 高密年画', '年画', '线版与手绘相结合，画面带有民间年画的吉祥意味。', '高密增盛画店胡锡琪 · 中国美术馆藏', prints, ['painting','craft'], ['red','white'], ['高密','年画','线版','手绘']),
  record('nianhua-shangguan.jpg', '上关下财', '清 · 东昌府年画', '木版年画', '套版年画中的人物形象与色彩，体现民间版画的表现力。', '山东东方中国民艺博物馆藏 · 图片来源：南方日报报道', prints, ['painting','craft'], ['red','white'], ['东昌府','年画','套版']),
  record('nianhua-jingniang.jpg', '千里送京娘', '清末民初 · 东昌府年画', '木版年画', '戏曲故事走入年画，在套色画面中留下民间叙事。', '个人藏 · 图片来源：南方日报报道', prints, ['painting','craft'], ['red','white'], ['东昌府','年画','戏曲','京娘']),
  record('nianhua-nongjiale.png', '农家乐（局部）', '杨家埠年画 · 作品局部', '木版年画', '作品局部呈现乡村生活画面。', '图片来源：张殿英 / 中国民间文艺家协会报道 · 作品作者与收藏待核', yangjiabu, ['painting','craft'], ['red','white'], ['杨家埠','年画','农家乐','局部']),
  record('nianhua-tractor.jpg', '拖拉机耕地', '杨家埠年画 · 民间绘画', '木版年画', '农田与拖拉机进入年画，记录不断变化的乡村生活。', '来源页标注原潍县杨家埠木版年画研究所藏 · 现藏待核', yangjiabu, ['painting','craft'], ['red','white'], ['杨家埠','年画','拖拉机','农耕']),
  record('nianhua-kongcheng.jpg', '空城计', '杨家埠年画 · 民间绘画', '木版年画', '戏曲故事与杨家埠年画的造型相遇。', '威海市博物馆藏 · 图片来源：中国民间文艺家协会报道', yangjiabu, ['painting','craft'], ['red','white'], ['杨家埠','年画','空城计','戏曲']),
  record('nianhua-zhenzhai.jpg', '镇宅神虎', '清 · 杨家埠年画', '木版年画', '醒目的虎形与套版色彩，传达民间祈福的愿望。', '杨家埠南公兴画店 · 圣彼得堡国立艾尔米塔什博物馆藏', prints, ['painting','craft'], ['red','white'], ['杨家埠','年画','老虎','套版']),
  record('nianhua-tianquan.jpg', '天地全神', '清版 · 杨家埠年画', '木版年画', '画面汇集民间信仰中的神祇形象；具体印制时间待核。', '来源页标注潍坊市杨家埠木版年画研究所藏', prints, ['painting','craft'], ['red','white'], ['杨家埠','年画','神祇','清版'])
];
