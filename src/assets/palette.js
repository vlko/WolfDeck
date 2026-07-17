// The cozy storybook palette, sampled from visual.png.
// Builders take colors only from here (plus per-prop option overrides).
export const palette = {
  // greens
  sageDark: '#5d6b58',
  sage: '#7d8b74',
  sageLight: '#a3b096',
  meadow: '#96a583',
  pineDark: '#4f6152',
  pine: '#6a7d68',
  pineLight: '#8a9c85',

  // neutrals
  cream: '#efe9dc',
  parchment: '#e3dac8',
  paperWhite: '#f6f2e8',

  // pinks / roses
  dustyRose: '#c9a1a6',
  roseMauve: '#a98289',
  cheekPink: '#d9a8ad',

  // browns
  tanBrown: '#b39a77',
  strawGold: '#c8ab74',
  barkBrown: '#8a7359',
  deepBrown: '#5f5142',
  plankBrown: '#9c8163',

  // grays
  wolfGray: '#9aa0a0',
  wolfGrayDark: '#7d8585',
  slateGray: '#8b9494',
  stoneGray: '#a8ada7',
  charcoal: '#3d3a35',

  // city
  asphalt: '#858983',
  towerSlate: '#6f7a74',
  windowLit: '#f0e6c8',

  // accents
  duckEggBlue: '#a9c0b4',
  waterTeal: '#8fb0a5',
  skyCream: '#f2eee4',
  sunGold: '#e8cf9a',
  cloudWhite: '#faf7ef',

  // presentation panels — near-white card faces and high-contrast inks
  // (the diorama props keep the muted storybook tones above)
  panel: '#fbf8f1',
  ink: '#2b2620',
  inkBody: '#3f3931',
  inkMuted: '#6d6355',
};

// Categorical colors for chart series — deeper than the prop palette so
// they hold their own against the near-white panel faces.
export const chartColors = [
  '#557a4e', // deep sage green
  '#b25a5c', // brick rose
  '#c68f35', // amber gold
  '#4a7f96', // slate blue
  '#8f5f7d', // plum mauve
  '#8a6a44', // warm brown
];
