import { useMemo, useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import type {
  EulerAngles,
  Quaternion,
  RotationMatrix,
  RotationResult,
} from '../../types';
import {
  axisAngleVectorToQuaternion,
  eulerToQuaternion,
  formatNumber,
  identityQuaternion,
  matrixToQuaternion,
  normalizeQuaternion,
  quaternionToEuler,
  quaternionToMatrix,
} from '../../utils/rotation';
import { ResultDisplay } from '../rotation/ResultDisplay';

type InputType = 'euler' | 'quaternion' | 'axis-angle' | 'matrix';

type ValidationResult =
  | { valid: true }
  | { valid: false; error: string; canNormalize: boolean };

const TOLERANCE = 0.01;

function validateQuaternion(
  x: number,
  y: number,
  z: number,
  w: number,
): ValidationResult {
  const mag = Math.sqrt(x * x + y * y + z * z + w * w);
  if (mag < 1e-10) {
    return {
      valid: false,
      error: 'Quaternion magnitude is zero',
      canNormalize: false,
    };
  }
  if (Math.abs(mag - 1) > TOLERANCE) {
    return {
      valid: false,
      error: `Quaternion is not normalized (magnitude: ${formatNumber(mag)})`,
      canNormalize: true,
    };
  }
  return { valid: true };
}

function validateRotationMatrix(m: RotationMatrix): ValidationResult {
  // Check determinant ≈ 1
  const det =
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  if (Math.abs(det) < 1e-10) {
    return {
      valid: false,
      error: 'Matrix is singular (det ≈ 0)',
      canNormalize: false,
    };
  }

  if (det < 0) {
    return {
      valid: false,
      error: `Matrix has negative determinant (${formatNumber(det)}), not a proper rotation`,
      canNormalize: false,
    };
  }

  // Check orthogonality: R * R^T ≈ I
  const RRT = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        RRT[i][j] += m[i][k] * m[j][k];
      }
    }
  }

  let maxError = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const expected = i === j ? 1 : 0;
      maxError = Math.max(maxError, Math.abs(RRT[i][j] - expected));
    }
  }

  if (maxError > TOLERANCE) {
    return {
      valid: false,
      error: `Matrix is not orthonormal (max error: ${formatNumber(maxError)})`,
      canNormalize: true,
    };
  }

  return { valid: true };
}

// Orthonormalize matrix using Gram-Schmidt
function orthonormalizeMatrix(m: RotationMatrix): RotationMatrix {
  // Extract columns
  const c0 = [m[0][0], m[1][0], m[2][0]];
  const c1 = [m[0][1], m[1][1], m[2][1]];

  const dot = (a: number[], b: number[]) =>
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const normalize = (v: number[]) => {
    const len = Math.sqrt(dot(v, v));
    return len > 1e-10 ? [v[0] / len, v[1] / len, v[2] / len] : [1, 0, 0];
  };
  const sub = (a: number[], b: number[], s: number) => [
    a[0] - b[0] * s,
    a[1] - b[1] * s,
    a[2] - b[2] * s,
  ];
  const cross = (a: number[], b: number[]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];

  // Gram-Schmidt
  const u0 = normalize(c0);
  const u1 = normalize(sub(c1, u0, dot(c1, u0)));
  // Use cross product to ensure right-handed coordinate system
  const u2 = cross(u0, u1);

  return [
    [u0[0], u1[0], u2[0]],
    [u0[1], u1[1], u2[1]],
    [u0[2], u1[2], u2[2]],
  ];
}

const INPUT_OPTIONS: { value: InputType; label: string }[] = [
  { value: 'euler', label: 'Euler Angles (XYZ)' },
  { value: 'quaternion', label: 'Quaternion' },
  { value: 'axis-angle', label: 'Axis-Angle' },
  { value: 'matrix', label: 'Rotation Matrix' },
];

export function RotationConverter() {
  const { angleUnit } = useSettings();
  const [inputType, setInputType] = useState<InputType>('euler');

  // Euler input state
  const [eulerRoll, setEulerRoll] = useState('0');
  const [eulerPitch, setEulerPitch] = useState('0');
  const [eulerYaw, setEulerYaw] = useState('0');

  // Quaternion input state
  const [quatX, setQuatX] = useState('0');
  const [quatY, setQuatY] = useState('0');
  const [quatZ, setQuatZ] = useState('0');
  const [quatW, setQuatW] = useState('1');

  // Axis-angle input state
  const [axisX, setAxisX] = useState('0');
  const [axisY, setAxisY] = useState('0');
  const [axisZ, setAxisZ] = useState('1');
  const [axisAngle, setAxisAngle] = useState('0');

  // Matrix input state (row-major: m[row][col])
  const [m00, setM00] = useState('1');
  const [m01, setM01] = useState('0');
  const [m02, setM02] = useState('0');
  const [m10, setM10] = useState('0');
  const [m11, setM11] = useState('1');
  const [m12, setM12] = useState('0');
  const [m20, setM20] = useState('0');
  const [m21, setM21] = useState('0');
  const [m22, setM22] = useState('1');

  // Validation
  const validation: ValidationResult = useMemo(() => {
    switch (inputType) {
      case 'quaternion': {
        const x = parseFloat(quatX) || 0;
        const y = parseFloat(quatY) || 0;
        const z = parseFloat(quatZ) || 0;
        const w = parseFloat(quatW) || 0;
        return validateQuaternion(x, y, z, w);
      }
      case 'matrix': {
        const matrix: RotationMatrix = [
          [parseFloat(m00) || 0, parseFloat(m01) || 0, parseFloat(m02) || 0],
          [parseFloat(m10) || 0, parseFloat(m11) || 0, parseFloat(m12) || 0],
          [parseFloat(m20) || 0, parseFloat(m21) || 0, parseFloat(m22) || 0],
        ];
        return validateRotationMatrix(matrix);
      }
      default:
        return { valid: true };
    }
  }, [
    inputType,
    quatX,
    quatY,
    quatZ,
    quatW,
    m00,
    m01,
    m02,
    m10,
    m11,
    m12,
    m20,
    m21,
    m22,
  ]);

  const handleNormalize = () => {
    if (inputType === 'quaternion') {
      const x = parseFloat(quatX) || 0;
      const y = parseFloat(quatY) || 0;
      const z = parseFloat(quatZ) || 0;
      const w = parseFloat(quatW) || 0;
      const normalized = normalizeQuaternion({ x, y, z, w });
      setQuatX(formatNumber(normalized.x));
      setQuatY(formatNumber(normalized.y));
      setQuatZ(formatNumber(normalized.z));
      setQuatW(formatNumber(normalized.w));
    } else if (inputType === 'matrix') {
      const matrix: RotationMatrix = [
        [parseFloat(m00) || 0, parseFloat(m01) || 0, parseFloat(m02) || 0],
        [parseFloat(m10) || 0, parseFloat(m11) || 0, parseFloat(m12) || 0],
        [parseFloat(m20) || 0, parseFloat(m21) || 0, parseFloat(m22) || 0],
      ];
      const normalized = orthonormalizeMatrix(matrix);
      setM00(formatNumber(normalized[0][0]));
      setM01(formatNumber(normalized[0][1]));
      setM02(formatNumber(normalized[0][2]));
      setM10(formatNumber(normalized[1][0]));
      setM11(formatNumber(normalized[1][1]));
      setM12(formatNumber(normalized[1][2]));
      setM20(formatNumber(normalized[2][0]));
      setM21(formatNumber(normalized[2][1]));
      setM22(formatNumber(normalized[2][2]));
    }
  };

  const result: RotationResult = useMemo(() => {
    const radToDeg = (rad: number) => (rad * 180) / Math.PI;
    let quaternion: Quaternion;

    switch (inputType) {
      case 'euler': {
        const roll = parseFloat(eulerRoll) || 0;
        const pitch = parseFloat(eulerPitch) || 0;
        const yaw = parseFloat(eulerYaw) || 0;
        const euler: EulerAngles = {
          roll: angleUnit === 'deg' ? roll : radToDeg(roll),
          pitch: angleUnit === 'deg' ? pitch : radToDeg(pitch),
          yaw: angleUnit === 'deg' ? yaw : radToDeg(yaw),
        };
        quaternion = eulerToQuaternion(euler);
        break;
      }
      case 'quaternion': {
        const x = parseFloat(quatX) || 0;
        const y = parseFloat(quatY) || 0;
        const z = parseFloat(quatZ) || 0;
        const w = parseFloat(quatW) || 1;
        quaternion = normalizeQuaternion({ x, y, z, w });
        break;
      }
      case 'axis-angle': {
        const x = parseFloat(axisX) || 0;
        const y = parseFloat(axisY) || 0;
        const z = parseFloat(axisZ) || 1;
        const angle = parseFloat(axisAngle) || 0;
        const angleDeg = angleUnit === 'deg' ? angle : radToDeg(angle);
        quaternion = axisAngleVectorToQuaternion(x, y, z, angleDeg);
        break;
      }
      case 'matrix': {
        const matrix: [
          [number, number, number],
          [number, number, number],
          [number, number, number],
        ] = [
          [parseFloat(m00) || 0, parseFloat(m01) || 0, parseFloat(m02) || 0],
          [parseFloat(m10) || 0, parseFloat(m11) || 0, parseFloat(m12) || 0],
          [parseFloat(m20) || 0, parseFloat(m21) || 0, parseFloat(m22) || 0],
        ];
        quaternion = matrixToQuaternion(matrix);
        break;
      }
      default:
        quaternion = identityQuaternion();
    }

    return {
      quaternion,
      euler: quaternionToEuler(quaternion),
      matrix: quaternionToMatrix(quaternion),
    };
  }, [
    inputType,
    eulerRoll,
    eulerPitch,
    eulerYaw,
    quatX,
    quatY,
    quatZ,
    quatW,
    axisX,
    axisY,
    axisZ,
    axisAngle,
    m00,
    m01,
    m02,
    m10,
    m11,
    m12,
    m20,
    m21,
    m22,
    angleUnit,
  ]);

  const renderInputFields = () => {
    switch (inputType) {
      case 'euler':
        return (
          <div className="grid grid-cols-3 gap-4">
            <InputField
              id="euler-roll"
              label={`Roll (X) [${angleUnit}]`}
              value={eulerRoll}
              onChange={setEulerRoll}
            />
            <InputField
              id="euler-pitch"
              label={`Pitch (Y) [${angleUnit}]`}
              value={eulerPitch}
              onChange={setEulerPitch}
            />
            <InputField
              id="euler-yaw"
              label={`Yaw (Z) [${angleUnit}]`}
              value={eulerYaw}
              onChange={setEulerYaw}
            />
          </div>
        );
      case 'quaternion':
        return (
          <div className="grid grid-cols-4 gap-4">
            <InputField
              id="quat-x"
              label="x"
              value={quatX}
              onChange={setQuatX}
            />
            <InputField
              id="quat-y"
              label="y"
              value={quatY}
              onChange={setQuatY}
            />
            <InputField
              id="quat-z"
              label="z"
              value={quatZ}
              onChange={setQuatZ}
            />
            <InputField
              id="quat-w"
              label="w"
              value={quatW}
              onChange={setQuatW}
            />
          </div>
        );
      case 'axis-angle':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <InputField
                id="axis-x"
                label="Axis X"
                value={axisX}
                onChange={setAxisX}
              />
              <InputField
                id="axis-y"
                label="Axis Y"
                value={axisY}
                onChange={setAxisY}
              />
              <InputField
                id="axis-z"
                label="Axis Z"
                value={axisZ}
                onChange={setAxisZ}
              />
            </div>
            <div className="max-w-xs">
              <InputField
                id="axis-angle"
                label={`Angle [${angleUnit}]`}
                value={axisAngle}
                onChange={setAxisAngle}
              />
            </div>
          </div>
        );
      case 'matrix':
        return (
          <div className="grid grid-cols-3 gap-2 max-w-sm">
            <InputField id="m00" label="[0][0]" value={m00} onChange={setM00} />
            <InputField id="m01" label="[0][1]" value={m01} onChange={setM01} />
            <InputField id="m02" label="[0][2]" value={m02} onChange={setM02} />
            <InputField id="m10" label="[1][0]" value={m10} onChange={setM10} />
            <InputField id="m11" label="[1][1]" value={m11} onChange={setM11} />
            <InputField id="m12" label="[1][2]" value={m12} onChange={setM12} />
            <InputField id="m20" label="[2][0]" value={m20} onChange={setM20} />
            <InputField id="m21" label="[2][1]" value={m21} onChange={setM21} />
            <InputField id="m22" label="[2][2]" value={m22} onChange={setM22} />
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Rotation Conversion
        </h2>
      </div>

      <p className="text-sm text-gray-500 mb-6 text-center">
        Convert between different rotation representations.
      </p>

      {/* Input Type Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-6">
        <div className="mb-4">
          <label
            htmlFor="input-type"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Input Type
          </label>
          <select
            id="input-type"
            value={inputType}
            onChange={(e) => setInputType(e.target.value as InputType)}
            className="w-full max-w-xs bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
          >
            {INPUT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Input Fields */}
        <div className="mt-4">{renderInputFields()}</div>

        {/* Validation Error */}
        {!validation.valid && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-red-600">{validation.error}</span>
            {validation.canNormalize && (
              <button
                type="button"
                onClick={handleNormalize}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Normalize
              </button>
            )}
          </div>
        )}
      </div>

      {/* Result */}
      <ResultDisplay result={result} />
    </div>
  );
}

interface InputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function InputField({ id, label, value, onChange }: InputFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-gray-500 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
