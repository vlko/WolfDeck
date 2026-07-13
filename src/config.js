// Global layout constants. Distances are world units; 1 unit ≈ 1 "diorama meter".

// Depth rows: named z positions the author places props/parts on.
// More negative = further from the camera = higher on screen = slower parallax.
export const ROWS = {
  back: -7,
  mid: -3.5,
  action: 0,
  front: 3,
};

// Distance between scene centers along x.
export const SCENE_SPACING = 34;

// Vertical extent of the visible frame at z = 0 (action row).
export const FRAME_HEIGHT = 15;

// Camera.
export const CAMERA_TILT = (20 * Math.PI) / 180; // downward pitch
export const CAMERA_FOV = 40; // vertical, degrees
export const CAMERA_TARGET_Y = 3.2; // look-at height at the action row
export const FIT_ASPECT = 1.15; // below this aspect, back off to fit width

// Hero.
export const WALK_SPEED = 8; // units/second
export const HURRY_MULTIPLIER = 2.5;

// How far (in scenes) from the camera a scene keeps animating.
export const ACTIVE_SCENE_RADIUS = 1.6 * SCENE_SPACING;

// Part reveal timing.
export const REVEAL_DURATION = 0.45;

// Default cascade for parts that don't give an explicit position/depth:
// step k lands at (x0 + k·dx, y ± yAlt, z0 + k·dz) — every new panel in
// FRONT of the older ones, fanned rightward and alternating slightly up/down
// so earlier titles and graphs stay visible. The cascade spans the diorama
// from the MID row level to the FRONT row level (z −3 … +3): the first
// panels stand behind the wolf among the mid-row props (but in front of
// them), the last ones reach the foreground — never as deep as the trees
// and buildings in the back row. The generous dz makes the depth ordering
// unmistakable and leaves plenty of room for the 3D chart elements.
export const PART_CASCADE = { x0: -6, dx: 2.1, y: 4.2, yAlt: 0.55, z0: -3, dz: 1.2 };

export const WARN_PREFIX = '[wolfdeck]';

export function warn(...args) {
  console.warn(WARN_PREFIX, ...args);
}
