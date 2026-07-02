export type PlantCategory = "edible" | "neutral" | "dangerous";

export type Plant = {
  id: string;
  commonName: string;
  scientificName?: string;
  category: PlantCategory;
  sniffDescription: string;
  resultFact: string;
  visualTags: string[];
  sourceKeys: string[];
};

export const PLANTS: Plant[] = [
  {
    id: "cat-grass",
    commonName: "Кошачья трава",
    scientificName: "Mixed young cereal grasses",
    category: "edible",
    sniffDescription:
      "Плотный низкий коврик из мягких злаковых ростков: много тонких травинок, без крупных листьев и цветов.",
    resultFact:
      "Это подходящая кошачья травка: котик мурчит и становится ближе ко сну.",
    visualTags: ["grass", "short-blades"],
    sourceKeys: ["cat-grass-general"]
  },
  {
    id: "oat-grass",
    commonName: "Овёс",
    scientificName: "Avena sativa",
    category: "edible",
    sniffDescription:
      "Тонкие прямые травинки растут плотным пучком; кончики узкие, стебли выглядят как свежая мини-грядка овса.",
    resultFact:
      "Овёс часто выращивают как кошачью траву. В игре он приносит довольное мурчание.",
    visualTags: ["grass", "thin-blades"],
    sourceKeys: ["cat-grass-general"]
  },
  {
    id: "wheat-grass",
    commonName: "Пшеница",
    scientificName: "Triticum aestivum",
    category: "edible",
    sniffDescription:
      "Пучок узких плоских листьев в невысоком горшке; выглядит гуще и ровнее, чем овёс, как маленький газон.",
    resultFact:
      "Пшеницу часто выращивают для кошачьего перекуса, так что котик доволен.",
    visualTags: ["grass", "dense-blades"],
    sourceKeys: ["cat-grass-general"]
  },
  {
    id: "barley-grass",
    commonName: "Ячмень",
    scientificName: "Hordeum vulgare",
    category: "edible",
    sniffDescription:
      "Зелёные злаковые ростки с чуть растрёпанными, разной длины травинками; пучок выглядит менее ровным.",
    resultFact:
      "Ячмень тоже выращивают как кошачью траву. Подношение принято с мурчанием.",
    visualTags: ["grass", "wild-blades"],
    sourceKeys: ["cat-grass-general"]
  },
  {
    id: "spider-plant",
    commonName: "Хлорофитум",
    scientificName: "Chlorophytum comosum",
    category: "neutral",
    sniffDescription:
      "Длинные дугообразные листья с белой или светлой полосой; часто выпускает тонкие усы с маленькими розетками-детками.",
    resultFact:
      "С котиком всё хорошо, но это не кошачий перекус. Некоторые растения лучше просто рассматривать.",
    visualTags: ["arching-leaves", "striped"],
    sourceKeys: ["aspca-cats-plant-list"]
  },
  {
    id: "boston-fern",
    commonName: "Нефролепис",
    scientificName: "Nephrolepis exaltata",
    category: "neutral",
    sniffDescription:
      "Пышный папоротник: длинные перистые вайи расходятся фонтаном, каждая веточка покрыта множеством мелких листочков.",
    resultFact:
      "Котик в порядке, но папоротник не добавляет мурчаний перед сном.",
    visualTags: ["fern", "many-leaflets"],
    sourceKeys: ["aspca-cats-plant-list"]
  },
  {
    id: "moth-orchid",
    commonName: "Фаленопсис",
    scientificName: "Phalaenopsis sp.",
    category: "neutral",
    sniffDescription:
      "У основания несколько толстых овальных листьев; над ними длинный цветонос с плоскими цветами-бабочками.",
    resultFact:
      "Котик в порядке, но для миссии мурчаний этот цветок бесполезен.",
    visualTags: ["flower", "broad-leaves"],
    sourceKeys: ["aspca-cats-plant-list"]
  },
  {
    id: "ficus-benjamina",
    commonName: "Фикус",
    scientificName: "Ficus benjamina",
    category: "dangerous",
    sniffDescription:
      "Небольшое комнатное деревце: тонкие поникающие ветви, много гладких овальных листьев с заострённым кончиком.",
    resultFact:
      "Фикус Бенджамина считается токсичным для кошек. Лучше убрать его с кошачьего маршрута.",
    visualTags: ["tree", "glossy-leaves"],
    sourceKeys: ["aspca-cats-plant-list"]
  },
  {
    id: "rose",
    commonName: "Роза",
    scientificName: "Rosa spp.",
    category: "neutral",
    sniffDescription:
      "Слоистый бутон или раскрытый цветок на жёстком стебле; листья обычно зубчатые, на стеблях могут быть шипы.",
    resultFact:
      "Сама роза не кошачье лакомство. В реальности отдельно опасны шипы и химия на букетах.",
    visualTags: ["flower", "round-bloom"],
    sourceKeys: ["rose-cat-safety"]
  },
  {
    id: "rosemary",
    commonName: "Розмарин",
    scientificName: "Salvia rosmarinus",
    category: "neutral",
    sniffDescription:
      "Древесный пряный кустик с множеством узких игольчатых листьев; веточки плотные и часто пахнут смолисто.",
    resultFact:
      "Розмарин не считается токсичным для кошек, но это всё равно не кошачья трава для награды.",
    visualTags: ["herb", "needle-leaves"],
    sourceKeys: ["rosemary-cat-safety"]
  },
  {
    id: "sunflower",
    commonName: "Подсолнух",
    scientificName: "Helianthus annuus",
    category: "neutral",
    sniffDescription:
      "Крупная жёлтая корзинка с тёмной серединой на жёстком стебле; листья широкие, слегка шершавые.",
    resultFact:
      "Подсолнух не даёт кошачьей награды. Красиво, но котику полезнее трава.",
    visualTags: ["flower", "yellow-bloom"],
    sourceKeys: ["aspca-cats-plant-list"]
  },
  {
    id: "lavender",
    commonName: "Лаванда",
    scientificName: "Lavandula spp.",
    category: "dangerous",
    sniffDescription:
      "Серо-зелёные узкие листья и фиолетовые колоски на тонких стеблях; кустик заметно пахнет даже рядом.",
    resultFact:
      "Лаванда токсична для кошек. В игре правильнее сбросить горшок, чем пробовать на вкус.",
    visualTags: ["herb", "purple-spikes"],
    sourceKeys: ["lavender-cat-safety"]
  },
  {
    id: "lily",
    commonName: "Лилия",
    scientificName: "Lilium / Hemerocallis",
    category: "dangerous",
    sniffDescription:
      "Крупные лилейные цветы-звёзды или трубки: шесть длинных лепестков, заметные тычинки и пыльца.",
    resultFact:
      "Лилии опасны для кошек. В реальной жизни их лучше держать подальше от котиков.",
    visualTags: ["flower", "bouquet", "long-petals"],
    sourceKeys: ["aspca-cats-plant-list", "pet-poison-helpline-lilies"]
  },
  {
    id: "aloe-vera",
    commonName: "Алоэ вера",
    scientificName: "Aloe vera",
    category: "dangerous",
    sniffDescription:
      "Розетка из толстых мясистых листьев-копий; края часто зубчатые, на листьях бывают светлые пятна.",
    resultFact:
      "Алоэ считается опасным для кошек. Правильное кошачье решение — драматично сбросить горшок.",
    visualTags: ["succulent", "spiky"],
    sourceKeys: ["aspca-cats-plant-list"]
  },
  {
    id: "pothos",
    commonName: "Сциндапсус",
    scientificName: "Epipremnum aureum",
    category: "dangerous",
    sniffDescription:
      "Вьющаяся лиана со свисающими стеблями; листья сердцевидные, часто с жёлтыми или светлыми пятнами.",
    resultFact:
      "Сциндапсус опасен для кошек: хорош как декор на полке, ужасен как кошачий салат.",
    visualTags: ["trailing", "heart-leaves"],
    sourceKeys: ["aspca-cats-plant-list"]
  },
  {
    id: "snake-plant",
    commonName: "Сансевиерия",
    scientificName: "Sansevieria trifasciata",
    category: "dangerous",
    sniffDescription:
      "Жёсткие вертикальные листья-мечи растут прямо из земли; часто есть поперечные полосы и жёлтая кайма.",
    resultFact:
      "Сансевиерия, она же щучий хвост, опасна для кошек. Горшок вниз, котик горд собой.",
    visualTags: ["upright-leaves", "striped"],
    sourceKeys: ["aspca-cats-plant-list"]
  }
];

export function getPlantById(id: string): Plant | undefined {
  return PLANTS.find((plant) => plant.id === id);
}
