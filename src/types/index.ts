export type Axis = 'x' | 'y' | 'z';

export interface RotationStep {
  id: string;
  axis: Axis;
  angleDeg: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface EulerAngles {
  roll: number; // around X axis
  pitch: number; // around Y axis
  yaw: number; // around Z axis
}

// 3x3 rotation matrix (row-major)
export type RotationMatrix = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

export interface RotationResult {
  quaternion: Quaternion;
  euler: EulerAngles;
  matrix: RotationMatrix;
}

// Signed axis for axis swap (e.g., 'x', '-x', 'y', '-y', 'z', '-z')
export type SignedAxis = 'x' | '-x' | 'y' | '-y' | 'z' | '-z';

// Axis mapping: where each original axis points after swap
export interface AxisMapping {
  x: SignedAxis; // Where original X axis now points
  y: SignedAxis; // Where original Y axis now points
  z: SignedAxis; // Where original Z axis now points
}
