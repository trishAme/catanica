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
      "Низкий лоток с мягкими зелёными ростками, почти маленькая комнатная лужайка.",
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
      "Тонкие прямые ростки в плотном пучке, похожие на маленький горшочек травы для питомцев.",
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
      "Плотные узкие зелёные листочки в невысоком горшке, как мини-луг на подоконнике.",
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
      "Свежие зелёные ростки выглядят чуть более растрёпанно, чем аккуратная кошачья травка.",
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
      "Длинные полосатые листья дугами свисают из горшка, иногда с маленькими детками на усах.",
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
      "Пышная шапка из множества мелких листочков, как мягкий зелёный фонтан.",
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
      "Аккуратные широкие листья и высокий стебель с цветами, похожими на бабочек.",
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
      "Комнатное деревце с тонкими ветками и множеством овальных глянцевых листьев.",
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
      "Классический цветок с круглым бутоном и плотными лепестками на зелёном стебле.",
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
      "Ароматные тонкие игольчатые листочки торчат вверх плотным зелёным кустиком.",
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
      "Яркий жёлтый цветок с тёмной серединкой, как маленькое солнце в горшке.",
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
      "Узкие серо-зелёные листики и фиолетовые колоски с сильным ароматом.",
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
      "Крупные заметные цветы из букетов, с длинными лепестками и видимой пыльцой.",
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
      "Колючий суккулент с толстыми мясистыми листьями и светлыми пятнышками.",
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
      "Свисающие сердцевидные листья, которые красиво ползут с полки или из горшка.",
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
      "Высокие жёсткие листья-стрелы торчат вверх и часто покрыты светлыми полосами.",
    resultFact:
      "Сансевиерия, она же щучий хвост, опасна для кошек. Горшок вниз, котик горд собой.",
    visualTags: ["upright-leaves", "striped"],
    sourceKeys: ["aspca-cats-plant-list"]
  }
];

export function getPlantById(id: string): Plant | undefined {
  return PLANTS.find((plant) => plant.id === id);
}
