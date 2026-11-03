import { newArtworks } from './new-artworks.mjs';

// Each entry describes the pictured object, not an inferred city collection.
// Photo sources and rights notes remain available through the source link.
const existingArtworks = [
  {
    id: 'sdu-egg', title: '蛋壳陶高柄杯', subtitle: '龙山文化黑陶',
    date: '龙山文化 · 陶器', medium: '黑陶', image: 'images/sdu-egg.jpg',
    alt: '深色的蛋壳陶高柄杯，杯身细薄，杯柄带有镂孔',
    description: '细薄的杯身与修长的高柄，让我们看见龙山文化陶器的精巧。',
    credit: '山东大学博物馆', source: 'https://museum.sdu.edu.cn/info/1075/7023.htm', sourceLabel: '查看馆藏资料',
    themes: ['earth'], colors: ['ink','earth'], keywords: ['龙山文化','蛋壳陶','黑陶','高柄杯','陶器','日照'], position: 'center center'
  },
  {
    id: 'folk-lantern', title: '十子闹元宵', subtitle: '杨家埠木版年画',
    date: '杨家埠年画 · 民间绘画', medium: '木版年画', image: 'images/folk-lantern.png',
    alt: '杨家埠年画《十子闹元宵》，画面中孩童欢庆元宵',
    description: '喜庆的色彩和热闹的场景，把节日里的欢欣留在纸上。',
    credit: '山东美术馆藏 · 程依伦摄', source: 'https://huacheng.gz-cmc.com/pages/2023/01/31/c1eeb1fb86f240558fd4c77eed0abf90.html', sourceLabel: '查看图片来源',
    themes: ['painting','craft'], colors: ['red','white'], keywords: ['杨家埠','年画','木版','元宵','民俗','纹样'], position: 'center center'
  },
  {
    id: 'sdu-fanghu', title: '铜方壶', subtitle: '山东大学博物馆藏青铜器',
    date: '青铜器', medium: '青铜', image: 'images/sdu-fanghu.jpg',
    alt: '一件双耳铜方壶，器身有层次分明的纹饰',
    description: '方整的器身与层层纹饰，让青铜器的造型之美清晰可见。',
    credit: '山东大学博物馆', source: 'https://museum.sdu.edu.cn/info/1074/7033.htm', sourceLabel: '查看馆藏资料',
    themes: ['bronze'], colors: ['jade','earth'], keywords: ['青铜','铜方壶','纹饰','器物'], position: 'center center'
  },
  {
    id: 'jiaxiang-rubbing', title: '嘉祥画像石拓片', subtitle: '楼阙人物车骑出行画像石拓片',
    date: '东汉画像石 · 纸本拓片', medium: '画像石拓片', image: 'images/jiaxiang-rubbing.jpg',
    alt: '嘉祥楼阙人物车骑出行画像石拓片，画面中可见车马和人物',
    description: '从车马、楼阙与人物的排列里，细看汉代画像石留下的生活图景。',
    credit: '台北故宫博物院开放数据 · CC BY 4.0',
    source: 'https://digitalarchive.npm.gov.tw/opendata/Pub/Detail?id=34384&dep=P&mode=full',
    sourceLabel: '查看原始资料', themes: ['painting','bronze'], colors: ['ink','white'],
    keywords: ['汉画像石','拓片','嘉祥','车马','人物','石刻','纹样'], position: 'center center'
  },
  {
    id: 'linqing-bricks', title: '明代临清贡砖', subtitle: '成化、嘉靖与万历年间贡砖',
    date: '明代 · 砖', medium: '建筑材料', image: 'images/linqing-bricks.jpg',
    alt: '展柜中陈列的几块明代临清贡砖',
    description: '一方砖，连接起窑火、运河与传统建筑中的手工技艺。',
    credit: 'Gary Todd / Wikimedia Commons',
    source: 'https://commons.wikimedia.org/wiki/File:Ming_Linqing_Bricks_Chenghua,_Jiajing,_%26_Wanli_Reigns_(10129290003).jpg',
    sourceLabel: '查看图片来源', themes: ['earth','craft'], colors: ['earth','ink'],
    keywords: ['临清','贡砖','砖','窑火','运河','建筑','明代'], position: 'center center'
  },
  {
    id: 'sdu-basin', title: '青花釉里红缠枝花卉纹盆', subtitle: '青花与釉里红瓷器',
    date: '瓷器 · 花卉纹', medium: '瓷器', image: 'images/sdu-basin.jpg',
    alt: '青花釉里红缠枝花卉纹盆，盆身装饰花卉纹样',
    description: '从器形到花卉纹饰，在一件瓷器上细看线条与色彩。',
    credit: '山东大学博物馆', source: 'https://museum.sdu.edu.cn/info/1075/7056.htm', sourceLabel: '查看馆藏资料',
    themes: ['earth','painting'], colors: ['white','jade'], keywords: ['青花','釉里红','瓷器','花卉','纹样','盆'], position: 'center center'
  },
  {
    id: 'folk-spring-ox', title: '春牛图', subtitle: '杨家埠木版年画',
    date: '杨家埠年画 · 民间绘画', medium: '木版年画', image: 'images/folk-spring-ox.png',
    alt: '杨家埠年画《春牛图》，彩色画面中有春牛和人物',
    description: '春牛、人物和文字共同组成一幅充满生活气息的年画。',
    credit: '山东美术馆藏 · 程依伦摄', source: 'https://huacheng.gz-cmc.com/pages/2023/01/31/c1eeb1fb86f240558fd4c77eed0abf90.html', sourceLabel: '查看图片来源',
    themes: ['painting','craft'], colors: ['red','white'], keywords: ['杨家埠','年画','木版','春牛','民俗','纹样'], position: 'center center'
  },
  {
    id: 'sdu-bird', title: '铜鸟柱', subtitle: '立柱与飞鸟造型青铜器',
    date: '春秋 · 青铜器', medium: '青铜', image: 'images/sdu-bird.jpg',
    alt: '春秋铜鸟柱，柱上有两只飞鸟造型',
    description: '两只飞鸟栖于立柱之上，细看器物结构与装饰的巧思。',
    credit: '山东大学博物馆', source: 'https://museum.sdu.edu.cn/info/1074/7031.htm', sourceLabel: '查看馆藏资料',
    themes: ['bronze'], colors: ['jade','earth'], keywords: ['青铜','鸟','春秋','仙人台','器物'], position: 'center center'
  },
  {
    id: 'sdu-sancai', title: '三彩三足罐', subtitle: '三彩釉陶器',
    date: '陶器 · 三彩', medium: '陶器', image: 'images/sdu-sancai.jpg',
    alt: '一件三足罐，器身呈现三彩釉色',
    description: '流动的釉色与圆润的器形，为日常器物增添鲜活的表情。',
    credit: '山东大学博物馆', source: 'https://museum.sdu.edu.cn/info/1075/7058.htm', sourceLabel: '查看馆藏资料',
    themes: ['earth'], colors: ['earth','jade'], keywords: ['三彩','陶器','罐','釉色'], position: 'center center'
  },
  {
    id: 'folk-zaowang', title: '灶王对', subtitle: '杨家埠木版年画',
    date: '杨家埠年画 · 民间绘画', medium: '木版年画', image: 'images/folk-zaowang.png',
    alt: '成对的杨家埠年画《灶王对》，画面色彩鲜明',
    description: '成对的画面与鲜明的套色，呈现民间年画的热闹与想象。',
    credit: '潍坊市博物馆藏 · 程依伦摄', source: 'https://huacheng.gz-cmc.com/pages/2023/01/31/c1eeb1fb86f240558fd4c77eed0abf90.html', sourceLabel: '查看图片来源',
    themes: ['painting','craft'], colors: ['red','white'], keywords: ['杨家埠','年画','木版','灶王','民俗'], position: 'center center'
  },
  {
    id: 'sdu-horse', title: '彩绘陶马', subtitle: '两件彩绘陶马',
    date: '陶器 · 彩绘', medium: '陶器', image: 'images/sdu-horse.jpg',
    alt: '两件彩绘陶马同框陈列',
    description: '同框的两件陶马，保留着各自的形态与彩绘痕迹。',
    credit: '山东大学博物馆', source: 'https://museum.sdu.edu.cn/info/1075/7052.htm', sourceLabel: '查看馆藏资料',
    themes: ['earth'], colors: ['earth','white'], keywords: ['彩绘','陶马','陶器','马'], position: 'center center'
  },
  {
    id: 'sdu-he', title: '铜盉', subtitle: '两件铜盉',
    date: '青铜器', medium: '青铜', image: 'images/sdu-he.jpg',
    alt: '两件造型各异的铜盉同框陈列',
    description: '两件铜盉并置，器身与流、足之间的变化值得细看。',
    credit: '山东大学博物馆', source: 'https://museum.sdu.edu.cn/info/1074/7029.htm', sourceLabel: '查看馆藏资料',
    themes: ['bronze'], colors: ['earth','jade'], keywords: ['青铜','铜盉','器物'], position: 'center center'
  },
  {
    id: 'sdu-jade-face', title: '玉神人头像', subtitle: '玉石器',
    date: '玉石器', medium: '玉石', image: 'images/sdu-jade-face.jpg',
    alt: '一件玉神人头像，正面有镂雕纹饰',
    description: '一张小小的玉雕面容，留下了关于古人想象与技艺的线索。',
    credit: '山东大学博物馆', source: 'https://museum.sdu.edu.cn/info/1091/7027.htm', sourceLabel: '查看馆藏资料',
    themes: ['jadeglass'], colors: ['earth','jade'], keywords: ['玉','玉器','玉神人头像','镂雕','大辛庄'], position: 'center center'
  },
  {
    id: 'sdu-jade-knife', title: '玉刀', subtitle: '大汶口文化玉器',
    date: '大汶口文化 · 玉器', medium: '玉石', image: 'images/sdu-jade-knife.jpg',
    alt: '一件玉刀，横向陈列，器形细长',
    description: '温润的玉质与简洁的器形，呈现远古玉作的另一种面貌。',
    credit: '山东大学博物馆', source: 'https://museum.sdu.edu.cn/info/1091/7018.htm', sourceLabel: '查看馆藏资料',
    themes: ['jadeglass'], colors: ['jade','earth'], keywords: ['玉','玉器','玉刀','大汶口文化','焦家遗址'], position: 'center center'
  },
  {
    id: 'glaze-liyue', title: '礼乐共鸣', subtitle: '琉璃作品',
    date: '琉璃 · 当代作品', medium: '琉璃', image: 'images/glaze-liyue.jpg',
    alt: '琉璃作品《礼乐共鸣》，呈现温润的黄色',
    description: '光穿过琉璃的色彩，传统技艺在当代作品中继续生长。',
    credit: '作品：孙云毅 · 图片来源：中国大运河博物馆展览', source: 'https://www.grandcanalmuseum.cn/yunboxinwen/1175.html', sourceLabel: '查看展览资料',
    themes: ['jadeglass','craft'], colors: ['earth'], keywords: ['琉璃','礼乐共鸣','孙云毅','当代','淄博'], position: 'center center'
  },
  {
    id: 'glaze-guanyin-vase', title: '松石绿观音瓶', subtitle: '琉璃作品',
    date: '琉璃 · 当代作品', medium: '琉璃', image: 'images/glaze-guanyin-vase.jpg',
    alt: '琉璃作品《松石绿观音瓶》，瓶身呈松石绿色',
    description: '松石绿的光泽与瓶身轮廓，让人愿意多停留片刻。',
    credit: '作品：孙云浩、孙恒山 · 图片来源：中国大运河博物馆展览', source: 'https://www.grandcanalmuseum.cn/yunboxinwen/1175.html', sourceLabel: '查看展览资料',
    themes: ['jadeglass','craft'], colors: ['jade'], keywords: ['琉璃','松石绿','观音瓶','孙云浩','孙恒山','当代','淄博'], position: 'center center'
  }
];

// Keep every original ID stable while bringing new material into the first screens.
export const artworks = [
  ...existingArtworks.flatMap((item, index) => [item, ...newArtworks.slice(index * 2, index * 2 + 2)]),
  ...newArtworks.slice(existingArtworks.length * 2)
];

export function filterArtworks(items, {query = '', theme = 'all', color = 'all'} = {}) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(item => {
    const searchable = [item.title, item.subtitle, item.date, item.medium, item.description, ...item.keywords].join(' ').toLocaleLowerCase();
    return (theme === 'all' || item.themes.includes(theme)) &&
      (color === 'all' || item.colors.includes(color)) && terms.every(term => searchable.includes(term));
  });
}
