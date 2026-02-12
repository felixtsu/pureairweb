export interface Product {
  id: string;
  name: string;
  nameEn: string;
  tagline: string;
  area: string;
  areaRange: string;
  features: string[];
  noise: string;
  price: number;
  currency: string;
  highlights: string[];
  tier: "home" | "pro" | "max";
}

export const products: Product[] = [
  {
    id: "pureair-home",
    name: "PureAir Home",
    nameEn: "家用版",
    tagline: "性價比高，體積小，適合臥室",
    area: "30 - 50",
    areaRange: "30 - 50 平方米",
    features: ["HEPA 13 濾網", "去除 PM2.5", "基礎除甲醛"],
    noise: "25dB (睡眠模式) - 45dB (強力模式)",
    price: 1299,
    currency: "HKD",
    highlights: ["性價比高", "體積小", "適合臥室", "不支持 App 遠程控制"],
    tier: "home",
  },
  {
    id: "pureair-pro",
    name: "PureAir Pro",
    nameEn: "專業版",
    tagline: "支持手機 App 控制，寵物毛髮專用濾層",
    area: "60 - 100",
    areaRange: "60 - 100 平方米",
    features: [
      "HEPA 14 醫療級濾網",
      "UV 紫外線殺菌",
      "負離子發生器",
    ],
    noise: "30dB - 55dB",
    price: 3599,
    currency: "HKD",
    highlights: [
      "支持手機 App 控制",
      "寵物毛髮專用濾層",
      "適合有寵物或過敏體質家庭",
    ],
    tier: "pro",
  },
  {
    id: "pureair-max",
    name: "PureAir Max",
    nameEn: "商用旗艦",
    tagline: "辦公室吸菸室、剛裝修大型店鋪首選",
    area: "150 - 300",
    areaRange: "150 - 300 平方米",
    features: [
      "雙核渦輪過濾",
      "工業級除煙味",
      "活性炭加量 500%",
    ],
    noise: "45dB - 70dB (較大聲)",
    price: 8800,
    currency: "HKD",
    highlights: [
      "針對辦公室吸菸室、剛裝修的大型店鋪",
      "外殼金屬材質，極其耐用",
    ],
    tier: "max",
  },
];

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
