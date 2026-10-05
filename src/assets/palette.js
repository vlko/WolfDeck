// The storybook palette, sampled from the reference sheets — the nine
// swatches printed on shop.png are the backbone, the rest are measured off
// the sprites themselves (tree slate, cheek pink, window glow).
// Everything drawn by code (ground, sky, panels, charts) takes colors only
// from here so it sits in the same world as the cut-out sprites.
export const swatch = {
  mauve: '#a5817f',
  ochre: '#bd9662',
  sand: '#d6b386',
  cream: '#e9e2d1',
  ivory: '#ebe7d7',
  sageLight: '#a4b1a2',
  sage: '#798877',
  sageDeep: '#6d7a6c',
  brown: '#7b6548',
};

export const palette = {
  ...swatch,

  // derived tones
  slate: '#4b5654', // darkest tree / tower facets
  slateSoft: '#6f7b78',
  mintGray: '#b9c3b6',
  meadow: '#9aa88a', // ground base, between sageLight and sage
  meadowLight: '#b1bc9f',
  meadowDark: '#86967a',
  water: '#a9beb9',
  asphalt: '#a9ab9e', // roads: warm paper gray, not tarmac
  roseCheek: '#d79c92',
  windowGlow: '#f3e3b8',
  lampGlow: '#ffe7a8',
  bark: '#6e563c',

  // paper
  paper: '#f5f1e8', // the white of the sheets, warmed
  paperShade: '#e6dfcf',
  sky: '#f3efe5',
  skyLow: '#ece6d6',
  sun: '#e2c48f',
  cloud: '#faf7ef',

  // presentation panels — ivory faces with warm, high-contrast inks
  panel: '#fbf8f1',
  panelEdge: '#d9ccb2',
  ink: '#2f3431', // near-black with a hint of slate green
  inkBody: '#454a45',
  inkMuted: '#71705f',

  // legacy keys still read by panel/chart code
  paperWhite: '#fbf8f1',
  parchment: '#e6dfcf',
  dustyRose: '#b98a86', // accent strip / underline — mauve, a touch brighter
  roseMauve: '#9a716e',
  deepBrown: '#5d4a35',
  charcoal: '#2f3431',
  strawGold: '#bd9662',
};

// Categorical chart colors — the swatches pushed one step deeper so they
// hold their own on the ivory panel faces (all ≥ 3:1 against #fbf8f1).
export const chartColors = [
  '#5f7a63', // deep sage
  '#a5645f', // brick mauve
  '#b4843f', // ochre
  '#4f6670', // slate blue-gray
  '#8a6a82', // plum
  '#7b6548', // brown
];
