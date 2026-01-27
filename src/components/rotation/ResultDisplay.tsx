import { useCallback, useState } from 'react';
import { type OutputFormat, useSettings } from '../../contexts/SettingsContext';
import type { RotationResult } from '../../types';
import { formatNumber } from '../../utils/rotation';
import {
  AxisVisualizer,
  type CameraState,
} from '../visualization/AxisVisualizer';

const IDENTITY_QUATERNION = { x: 0, y: 0, z: 0, w: 1 };

const DEFAULT_CAMERA: CameraState = {
  position: [-2, -2, 1.5],
  target: [0, 0, 0],
};

interface ResultDisplayProps {
  result: RotationResult;
}

function formatValues(values: number[], format: OutputFormat): string {
  const formatted = values.map((v) => formatNumber(v));
  switch (format) {
    case 'tuple':
      return `(${formatted.join(', ')})`;
    case 'list':
      return `[${formatted.join(', ')}]`;
    case 'space':
      return formatted.join(' ');
  }
}

export function ResultDisplay({ result }: ResultDisplayProps) {
  const { euler, quaternion, matrix } = result;
  const { angleUnit, outputFormat, setOutputFormat } = useSettings();
  const [cameraState, setCameraState] = useState<CameraState>(DEFAULT_CAMERA);

  const handleCameraChange = useCallback((state: CameraState) => {
    setCameraState(state);
  }, []);

  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const eulerValues =
    angleUnit === 'deg'
      ? [euler.roll, euler.pitch, euler.yaw]
      : [degToRad(euler.roll), degToRad(euler.pitch), degToRad(euler.yaw)];
  const eulerFormatted = formatValues(eulerValues, outputFormat);
  const quatXYZW = formatValues(
    [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
    outputFormat,
  );
  const quatWXYZ = formatValues(
    [quaternion.w, quaternion.x, quaternion.y, quaternion.z],
    outputFormat,
  );

  const formatMatrix = () => {
    const rows = matrix.map((row) => formatValues(row, outputFormat));
    switch (outputFormat) {
      case 'tuple':
        return `(${rows.join(', ')})`;
      case 'list':
        return `[${rows.join(', ')}]`;
      case 'space':
        return rows.join('\n');
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Result</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Format:</span>
          <div className="inline-flex rounded-md bg-gray-200 p-0.5">
            {(['tuple', 'list', 'space'] as OutputFormat[]).map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => setOutputFormat(f)}
                className={`px-2 py-0.5 text-xs font-medium rounded transition-all ${
                  outputFormat === f
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f === 'tuple' ? '( )' : f === 'list' ? '[ ]' : 'a b'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {/* 3D Visualization - Before/After */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center shadow-sm">
          <h4 className="text-sm font-medium text-gray-500 mb-3">
            Visualization
          </h4>
          <div className="flex items-center gap-3">
            {/* Before: Identity axes with rotation indicator */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-400 mb-1">Before</span>
              <AxisVisualizer
                quaternion={IDENTITY_QUATERNION}
                size={100}
                showOverlay={false}
                indicatorQuaternion={quaternion}
                cameraState={cameraState}
                onCameraChange={handleCameraChange}
              />
            </div>
            {/* After: Rotated axes without indicator */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-400 mb-1">After</span>
              <AxisVisualizer
                quaternion={quaternion}
                size={100}
                showOverlay={false}
                cameraState={cameraState}
                onCameraChange={handleCameraChange}
              />
            </div>
          </div>
        </div>

        {/* Euler Angles */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-500 mb-3">
            Euler Angles (XYZ)
          </h4>
          <div className="space-y-1 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">roll (X):</span>
              <span className="text-gray-900">
                {formatNumber(eulerValues[0])}
                {angleUnit === 'deg' ? '°' : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">pitch (Y):</span>
              <span className="text-gray-900">
                {formatNumber(eulerValues[1])}
                {angleUnit === 'deg' ? '°' : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">yaw (Z):</span>
              <span className="text-gray-900">
                {formatNumber(eulerValues[2])}
                {angleUnit === 'deg' ? '°' : ''}
              </span>
            </div>
          </div>
          <input
            type="text"
            readOnly
            value={eulerFormatted}
            onClick={(e) => {
              e.currentTarget.select();
              copyToClipboard(eulerFormatted);
            }}
            className="mt-3 w-full text-xs text-gray-700 bg-gray-50 border border-gray-300 rounded px-2 py-1 font-mono cursor-pointer focus:outline-none focus:border-blue-500"
            title="Click to copy"
          />
        </div>

        {/* Quaternion */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-500 mb-3">Quaternion</h4>
          <div className="space-y-1 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">x:</span>
              <span className="text-gray-900">
                {formatNumber(quaternion.x)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">y:</span>
              <span className="text-gray-900">
                {formatNumber(quaternion.y)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">z:</span>
              <span className="text-gray-900">
                {formatNumber(quaternion.z)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">w:</span>
              <span className="text-gray-900">
                {formatNumber(quaternion.w)}
              </span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div>
              <label htmlFor="quat-xyzw" className="text-xs text-gray-400">
                xyzw
              </label>
              <input
                id="quat-xyzw"
                type="text"
                readOnly
                value={quatXYZW}
                onClick={(e) => {
                  e.currentTarget.select();
                  copyToClipboard(quatXYZW);
                }}
                className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-300 rounded px-2 py-1 font-mono cursor-pointer focus:outline-none focus:border-blue-500"
                title="Click to copy"
              />
            </div>
            <div>
              <label htmlFor="quat-wxyz" className="text-xs text-gray-400">
                wxyz
              </label>
              <input
                id="quat-wxyz"
                type="text"
                readOnly
                value={quatWXYZ}
                onClick={(e) => {
                  e.currentTarget.select();
                  copyToClipboard(quatWXYZ);
                }}
                className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-300 rounded px-2 py-1 font-mono cursor-pointer focus:outline-none focus:border-blue-500"
                title="Click to copy"
              />
            </div>
          </div>
        </div>

        {/* Rotation Matrix */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-500 mb-3">
            Rotation Matrix
          </h4>
          <div className="font-mono text-sm overflow-x-auto">
            <table className="mx-auto">
              <tbody>
                <tr>
                  <td className="text-gray-400 pr-1">{'['}</td>
                  <td className="text-gray-900 px-1 text-right min-w-[60px] text-xs">
                    {formatNumber(matrix[0][0])}
                  </td>
                  <td className="text-gray-900 px-1 text-right min-w-[60px] text-xs">
                    {formatNumber(matrix[0][1])}
                  </td>
                  <td className="text-gray-900 px-1 text-right min-w-[60px] text-xs">
                    {formatNumber(matrix[0][2])}
                  </td>
                  <td className="text-gray-400 pl-1" />
                </tr>
                <tr>
                  <td className="text-gray-400 pr-1"> </td>
                  <td className="text-gray-900 px-1 text-right min-w-[60px] text-xs">
                    {formatNumber(matrix[1][0])}
                  </td>
                  <td className="text-gray-900 px-1 text-right min-w-[60px] text-xs">
                    {formatNumber(matrix[1][1])}
                  </td>
                  <td className="text-gray-900 px-1 text-right min-w-[60px] text-xs">
                    {formatNumber(matrix[1][2])}
                  </td>
                  <td className="text-gray-400 pl-1" />
                </tr>
                <tr>
                  <td className="text-gray-400 pr-1"> </td>
                  <td className="text-gray-900 px-1 text-right min-w-[60px] text-xs">
                    {formatNumber(matrix[2][0])}
                  </td>
                  <td className="text-gray-900 px-1 text-right min-w-[60px] text-xs">
                    {formatNumber(matrix[2][1])}
                  </td>
                  <td className="text-gray-900 px-1 text-right min-w-[60px] text-xs">
                    {formatNumber(matrix[2][2])}
                  </td>
                  <td className="text-gray-400 pl-1">{']'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <input
            type="text"
            readOnly
            value={formatMatrix()}
            onClick={(e) => {
              e.currentTarget.select();
              copyToClipboard(formatMatrix());
            }}
            className="mt-3 w-full text-xs text-gray-700 bg-gray-50 border border-gray-300 rounded px-2 py-1 font-mono cursor-pointer focus:outline-none focus:border-blue-500"
            title="Click to copy"
          />
        </div>
      </div>
    </div>
  );
}
