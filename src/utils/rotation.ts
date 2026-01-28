import type {
  Axis,
  EulerAngles,
  Quaternion,
  RotationMatrix,
  RotationResult,
  RotationStep,
} from '../types';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Returns identity quaternion
 */
export function identityQuaternion(): Quaternion {
  return { x: 0, y: 0, z: 0, w: 1 };
}

/**
 * Creates quaternion from axis and angle (degrees)
 */
export function axisAngleToQuaternion(
  axis: Axis,
  angleDeg: number,
): Quaternion {
  const halfAngle = (angleDeg * DEG_TO_RAD) / 2;
  const s = Math.sin(halfAngle);
  const c = Math.cos(halfAngle);

  switch (axis) {
    case 'x':
      return { x: s, y: 0, z: 0, w: c };
    case 'y':
      return { x: 0, y: s, z: 0, w: c };
    case 'z':
      return { x: 0, y: 0, z: s, w: c };
  }
}

/**
 * Quaternion multiplication: q1 * q2
 * For global axis rotation: q_new = q_rotation * q_current
 */
export function multiplyQuaternions(
  q1: Quaternion,
  q2: Quaternion,
): Quaternion {
  return {
    w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
    x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
    y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
    z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
  };
}

/**
 * Normalizes quaternion
 */
export function normalizeQuaternion(q: Quaternion): Quaternion {
  const mag = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
  if (mag < 1e-10) return identityQuaternion();
  return {
    x: q.x / mag,
    y: q.y / mag,
    z: q.z / mag,
    w: q.w / mag,
  };
}

/**
 * Converts quaternion to rotation matrix
 */
export function quaternionToMatrix(q: Quaternion): RotationMatrix {
  const { x, y, z, w } = q;
  const x2 = x + x,
    y2 = y + y,
    z2 = z + z;
  const xx = x * x2,
    xy = x * y2,
    xz = x * z2;
  const yy = y * y2,
    yz = y * z2,
    zz = z * z2;
  const wx = w * x2,
    wy = w * y2,
    wz = w * z2;

  return [
    [1 - (yy + zz), xy - wz, xz + wy],
    [xy + wz, 1 - (xx + zz), yz - wx],
    [xz - wy, yz + wx, 1 - (xx + yy)],
  ];
}

/**
 * Converts quaternion to Euler angles (XYZ order, degrees)
 * roll: around X axis, pitch: around Y axis, yaw: around Z axis
 */
export function quaternionToEuler(q: Quaternion): EulerAngles {
  const { x, y, z, w } = q;

  // Roll (X axis)
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);

  // Pitch (Y axis)
  const sinp = 2 * (w * y - z * x);
  let pitch: number;
  if (Math.abs(sinp) >= 1) {
    pitch = Math.sign(sinp) * (Math.PI / 2); // Gimbal lock
  } else {
    pitch = Math.asin(sinp);
  }

  // Yaw (Z axis)
  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);

  return {
    roll: roll * RAD_TO_DEG,
    pitch: pitch * RAD_TO_DEG,
    yaw: yaw * RAD_TO_DEG,
  };
}

/**
 * Computes combined rotation from multiple rotation steps
 * Global axis rotation: multiply each rotation from the left
 */
export function computeRotationChain(steps: RotationStep[]): RotationResult {
  let result = identityQuaternion();

  for (const step of steps) {
    const rotation = axisAngleToQuaternion(step.axis, step.angleDeg);
    // Global axis rotation: multiply new rotation from the left
    result = multiplyQuaternions(rotation, result);
  }

  result = normalizeQuaternion(result);

  return {
    quaternion: result,
    euler: quaternionToEuler(result),
    matrix: quaternionToMatrix(result),
  };
}

/**
 * Converts Euler angles (XYZ order, degrees) to quaternion
 */
export function eulerToQuaternion(euler: EulerAngles): Quaternion {
  const roll = euler.roll * DEG_TO_RAD;
  const pitch = euler.pitch * DEG_TO_RAD;
  const yaw = euler.yaw * DEG_TO_RAD;

  const cr = Math.cos(roll / 2);
  const sr = Math.sin(roll / 2);
  const cp = Math.cos(pitch / 2);
  const sp = Math.sin(pitch / 2);
  const cy = Math.cos(yaw / 2);
  const sy = Math.sin(yaw / 2);

  return normalizeQuaternion({
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
  });
}

/**
 * Converts axis-angle representation to quaternion
 * @param axisX X component of rotation axis
 * @param axisY Y component of rotation axis
 * @param axisZ Z component of rotation axis
 * @param angleDeg Rotation angle in degrees
 */
export function axisAngleVectorToQuaternion(
  axisX: number,
  axisY: number,
  axisZ: number,
  angleDeg: number,
): Quaternion {
  // Normalize axis
  const mag = Math.sqrt(axisX * axisX + axisY * axisY + axisZ * axisZ);
  if (mag < 1e-10) return identityQuaternion();

  const nx = axisX / mag;
  const ny = axisY / mag;
  const nz = axisZ / mag;

  const halfAngle = (angleDeg * DEG_TO_RAD) / 2;
  const s = Math.sin(halfAngle);
  const c = Math.cos(halfAngle);

  return {
    x: nx * s,
    y: ny * s,
    z: nz * s,
    w: c,
  };
}

/**
 * Converts rotation matrix to quaternion
 */
export function matrixToQuaternion(m: RotationMatrix): Quaternion {
  const trace = m[0][0] + m[1][1] + m[2][2];
  let x: number, y: number, z: number, w: number;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1.0);
    w = 0.25 / s;
    x = (m[2][1] - m[1][2]) * s;
    y = (m[0][2] - m[2][0]) * s;
    z = (m[1][0] - m[0][1]) * s;
  } else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    const s = 2.0 * Math.sqrt(1.0 + m[0][0] - m[1][1] - m[2][2]);
    w = (m[2][1] - m[1][2]) / s;
    x = 0.25 * s;
    y = (m[0][1] + m[1][0]) / s;
    z = (m[0][2] + m[2][0]) / s;
  } else if (m[1][1] > m[2][2]) {
    const s = 2.0 * Math.sqrt(1.0 + m[1][1] - m[0][0] - m[2][2]);
    w = (m[0][2] - m[2][0]) / s;
    x = (m[0][1] + m[1][0]) / s;
    y = 0.25 * s;
    z = (m[1][2] + m[2][1]) / s;
  } else {
    const s = 2.0 * Math.sqrt(1.0 + m[2][2] - m[0][0] - m[1][1]);
    w = (m[1][0] - m[0][1]) / s;
    x = (m[0][2] + m[2][0]) / s;
    y = (m[1][2] + m[2][1]) / s;
    z = 0.25 * s;
  }

  return normalizeQuaternion({ x, y, z, w });
}

/**
 * Computes RotationResult from quaternion
 */
export function quaternionToResult(q: Quaternion): RotationResult {
  const normalized = normalizeQuaternion(q);
  return {
    quaternion: normalized,
    euler: quaternionToEuler(normalized),
    matrix: quaternionToMatrix(normalized),
  };
}

/**
 * Formats number with specified decimal places
 */
export function formatNumber(n: number, decimals: number = 4): string {
  return n.toFixed(decimals);
}
