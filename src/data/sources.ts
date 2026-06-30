export type PlantSource = {
  key: string;
  label: string;
  url: string;
};

export const PLANT_SOURCES: Record<string, PlantSource> = {
  "aspca-cats-plant-list": {
    key: "aspca-cats-plant-list",
    label: "ASPCA Toxic and Non-Toxic Plant List - Cats",
    url: "https://www.aspca.org/pet-care/animal-poison-control/cats-plant-list"
  },
  "pet-poison-helpline-lilies": {
    key: "pet-poison-helpline-lilies",
    label: "Pet Poison Helpline - Lilies",
    url: "https://www.petpoisonhelpline.com/poison/lilies/"
  },
  "cat-grass-general": {
    key: "cat-grass-general",
    label: "General cat grass references for oat, wheat, and barley grass",
    url: "https://en.wikipedia.org/wiki/Cat_grass"
  },
  "lavender-cat-safety": {
    key: "lavender-cat-safety",
    label: "The Spruce Pets - Lavender and Cats",
    url: "https://www.thesprucepets.com/is-lavender-safe-for-cats-7602701"
  },
  "rosemary-cat-safety": {
    key: "rosemary-cat-safety",
    label: "The Spruce Pets - Rosemary and Cats",
    url: "https://www.thesprucepets.com/is-rosemary-safe-for-cats-6828205"
  },
  "rose-cat-safety": {
    key: "rose-cat-safety",
    label: "Southern Living - Roses and Cats",
    url: "https://www.southernliving.com/culture/pets/are-roses-poisonous-to-cats"
  }
};
