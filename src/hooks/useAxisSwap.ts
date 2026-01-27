import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AxisMapping,
  Quaternion,
  RotationResult,
  SignedAxis,
} from '../types';
import { quaternionToEuler, quaternionToMatrix } from '../utils/rotation';
import { useUrlState } from './useUrlState';

// Identity mapping: each axis points to itself
const IDENTITY_MAPPING: AxisMapping = { x: 'x', y: 'y', z: 'z' };

// Apply a 90° global (world-frame) rotation around an axis
// This rotates around the world axis shown in the "Original" view
// For +90° around world X: y→z, z→-y
// For +90° around world Y: z→x, x→-z
// For +90° around world Z: x→y, y→-x
function applyRotation(
  mapping: AxisMapping,
  axis: 'x' | 'y' | 'z',
  positive: boolean,
): AxisMapping {
  // Transform a signed axis through the world rotation
  const transform = (a: SignedAxis): SignedAxis => {
    if (axis === 'x') {
      // +90° around world X: y→z, z→-y, -y→-z, -z→y
      // -90° around world X: y→-z, z→y, -y→z, -z→-y
      if (a === 'y') return positive ? 'z' : '-z';
      if (a === '-y') return positive ? '-z' : 'z';
      if (a === 'z') return positive ? '-y' : 'y';
      if (a === '-z') return positive ? 'y' : '-y';
      return a; // x, -x unchanged
    } else if (axis === 'y') {
      // +90° around world Y: z→x, x→-z, -z→-x, -x→z
      // -90° around world Y: z→-x, x→z, -z→x, -x→-z
      if (a === 'z') return positive ? 'x' : '-x';
      if (a === '-z') return positive ? '-x' : 'x';
      if (a === 'x') return positive ? '-z' : 'z';
      if (a === '-x') return positive ? 'z' : '-z';
      return a; // y, -y unchanged
    } else {
      // +90° around world Z: x→y, y→-x, -x→-y, -y→x
      // -90° around world Z: x→-y, y→x, -x→y, -y→-x
      if (a === 'x') return positive ? 'y' : '-y';
      if (a === '-x') return positive ? '-y' : 'y';
      if (a === 'y') return positive ? '-x' : 'x';
      if (a === '-y') return positive ? 'x' : '-x';
      return a; // z, -z unchanged
    }
  };

  return {
    x: transform(mapping.x),
    y: transform(mapping.y),
    z: transform(mapping.z),
  };
}

// Convert signed axis to unit vector
function signedAxisToVector(axis: SignedAxis): [number, number, number] {
  const sign = axis.startsWith('-') ? -1 : 1;
  const baseAxis = axis.replace('-', '') as 'x' | 'y' | 'z';

  switch (baseAxis) {
    case 'x':
      return [sign, 0, 0];
    case 'y':
      return [0, sign, 0];
    case 'z':
      return [0, 0, sign];
  }
}

// Convert axis mapping to rotation matrix, then to quaternion
function mappingToQuaternion(mapping: AxisMapping): Quaternion {
  // The rotation matrix columns are where the original axes end up
  const xVec = signedAxisToVector(mapping.x);
  const yVec = signedAxisToVector(mapping.y);
  const zVec = signedAxisToVector(mapping.z);

  // Rotation matrix (row-major): each row is where the basis vector points
  // R = [xVec, yVec, zVec]^T means R * [1,0,0]^T = xVec, etc.
  // Actually for the matrix columns representation:
  // Column 0 = where X axis goes = xVec
  // Column 1 = where Y axis goes = yVec
  // Column 2 = where Z axis goes = zVec

  const m00 = xVec[0],
    m01 = yVec[0],
    m02 = zVec[0];
  const m10 = xVec[1],
    m11 = yVec[1],
    m12 = zVec[1];
  const m20 = xVec[2],
    m21 = yVec[2],
    m22 = zVec[2];

  // Convert rotation matrix to quaternion
  // Using Shepperd's method
  const trace = m00 + m11 + m22;

  let x: number, y: number, z: number, w: number;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s;
    x = (m21 - m12) * s;
    y = (m02 - m20) * s;
    z = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    w = (m21 - m12) / s;
    x = 0.25 * s;
    y = (m01 + m10) / s;
    z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    w = (m02 - m20) / s;
    x = (m01 + m10) / s;
    y = 0.25 * s;
    z = (m12 + m21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    w = (m10 - m01) / s;
    x = (m02 + m20) / s;
    y = (m12 + m21) / s;
    z = 0.25 * s;
  }

  // Normalize
  const len = Math.sqrt(x * x + y * y + z * z + w * w);
  return { x: x / len, y: y / len, z: z / len, w: w / len };
}

export function useAxisSwap() {
  const { getSwap, setSwap } = useUrlState();
  const initialized = useRef(false);

  const [mapping, setMapping] = useState<AxisMapping>(() => {
    const urlMapping = getSwap();
    return urlMapping ?? IDENTITY_MAPPING;
  });

  // Update URL when mapping changes
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    setSwap(mapping);
  }, [mapping, setSwap]);

  const quaternion = useMemo(() => mappingToQuaternion(mapping), [mapping]);

  const result: RotationResult = useMemo(() => {
    return {
      quaternion,
      euler: quaternionToEuler(quaternion),
      matrix: quaternionToMatrix(quaternion),
    };
  }, [quaternion]);

  const rotateX = useCallback((positive: boolean) => {
    setMapping((prev) => applyRotation(prev, 'x', positive));
  }, []);

  const rotateY = useCallback((positive: boolean) => {
    setMapping((prev) => applyRotation(prev, 'y', positive));
  }, []);

  const rotateZ = useCallback((positive: boolean) => {
    setMapping((prev) => applyRotation(prev, 'z', positive));
  }, []);

  const reset = useCallback(() => {
    setMapping(IDENTITY_MAPPING);
  }, []);

  return {
    mapping,
    quaternion,
    result,
    rotateX,
    rotateY,
    rotateZ,
    reset,
  };
}
