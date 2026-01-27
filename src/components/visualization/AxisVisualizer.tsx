import { Line, OrbitControls, Text } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import type { ElementRef } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Quaternion } from '../../types';

interface AxisVisualizerProps {
  quaternion: Quaternion;
  size?: number;
  showOverlay?: boolean; // Show both original and rotated axes (default: true)
  indicatorQuaternion?: Quaternion; // Show rotation indicator for this quaternion (independent of axes)
  cameraState?: CameraState;
  onCameraChange?: (state: CameraState) => void;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

interface AxisArrowProps {
  direction: THREE.Vector3;
  color: string;
  opacity?: number;
}

function AxisArrow({ direction, color, opacity = 1 }: AxisArrowProps) {
  const length = 1;
  const headLength = 0.2;
  const headWidth = 0.1;

  const rotation = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(up, direction.clone().normalize());
    return q;
  }, [direction]);

  return (
    <group quaternion={rotation}>
      <mesh position={[0, (length - headLength) / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, length - headLength, 8]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, length - headLength / 2, 0]}>
        <coneGeometry args={[headWidth, headLength, 8]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

interface AxisSetProps {
  quaternion?: THREE.Quaternion;
  opacity?: number;
}

function AxisSet({ quaternion, opacity = 1 }: AxisSetProps) {
  const directions = useMemo(() => {
    const xDir = new THREE.Vector3(1, 0, 0);
    const yDir = new THREE.Vector3(0, 1, 0);
    const zDir = new THREE.Vector3(0, 0, 1);

    if (quaternion) {
      xDir.applyQuaternion(quaternion);
      yDir.applyQuaternion(quaternion);
      zDir.applyQuaternion(quaternion);
    }

    return { xDir, yDir, zDir };
  }, [quaternion]);

  return (
    <group>
      <AxisArrow
        direction={directions.xDir}
        color="#ef4444"
        opacity={opacity}
      />
      <AxisArrow
        direction={directions.yDir}
        color="#22c55e"
        opacity={opacity}
      />
      <AxisArrow
        direction={directions.zDir}
        color="#3b82f6"
        opacity={opacity}
      />
    </group>
  );
}

interface AxisLabelsProps {
  quaternion?: THREE.Quaternion;
  opacity?: number;
  prime?: boolean;
}

function AxisLabels({
  quaternion,
  opacity = 1,
  prime = false,
}: AxisLabelsProps) {
  const labels: { label: string; basePos: THREE.Vector3; color: string }[] = [
    {
      label: prime ? "X'" : 'X',
      basePos: new THREE.Vector3(1.25, 0, 0),
      color: '#ef4444',
    },
    {
      label: prime ? "Y'" : 'Y',
      basePos: new THREE.Vector3(0, 1.25, 0),
      color: '#22c55e',
    },
    {
      label: prime ? "Z'" : 'Z',
      basePos: new THREE.Vector3(0, 0, 1.25),
      color: '#3b82f6',
    },
  ];

  return (
    <>
      {labels.map(({ label, basePos, color }) => {
        const pos = basePos.clone();
        if (quaternion) {
          pos.applyQuaternion(quaternion);
        }
        return (
          <Text
            key={label}
            position={pos}
            fontSize={0.25}
            color={color}
            anchorX="center"
            anchorY="middle"
            fillOpacity={opacity}
          >
            {label}
          </Text>
        );
      })}
    </>
  );
}

interface RotationIndicatorProps {
  quaternion: THREE.Quaternion;
}

function RotationIndicator({ quaternion }: RotationIndicatorProps) {
  const { axis, angle, arcPoints, arrowHeadPoints } = useMemo(() => {
    // Extract axis and angle from quaternion
    const axis = new THREE.Vector3(quaternion.x, quaternion.y, quaternion.z);
    const sinHalfAngle = axis.length();

    if (sinHalfAngle < 0.001) {
      return {
        axis: new THREE.Vector3(0, 0, 1),
        angle: 0,
        arcPoints: [],
        arrowHeadPoints: [],
      };
    }

    axis.normalize();
    const angle = 2 * Math.atan2(sinHalfAngle, quaternion.w);

    // Generate points for arc
    const arcRadius = 0.5;
    const arcSegments = 24;
    const displayAngle = Math.min(Math.abs(angle), Math.PI * 1.5);
    const angleSign = angle >= 0 ? 1 : -1;

    // Select start vector perpendicular to rotation axis, aligned with coordinate axis
    // Rotation around X axis -> start from Y axis
    // Rotation around Y axis -> start from Z axis
    // Rotation around Z axis -> start from X axis
    const startVector = new THREE.Vector3();
    const absX = Math.abs(axis.x);
    const absY = Math.abs(axis.y);
    const absZ = Math.abs(axis.z);

    if (absX >= absY && absX >= absZ) {
      // Close to X axis -> start from Y axis
      startVector.set(0, 1, 0);
    } else if (absY >= absX && absY >= absZ) {
      // Close to Y axis -> start from Z axis
      startVector.set(0, 0, 1);
    } else {
      // Close to Z axis -> start from X axis
      startVector.set(1, 0, 0);
    }

    // Project startVector onto the plane perpendicular to the axis
    const projection = axis.clone().multiplyScalar(startVector.dot(axis));
    const perpVector1 = startVector.clone().sub(projection).normalize();
    const perpVector2 = new THREE.Vector3()
      .crossVectors(axis, perpVector1)
      .normalize();

    // Generate arc points
    const arcPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= arcSegments; i++) {
      const t = (i / arcSegments) * displayAngle * angleSign;
      const point = new THREE.Vector3()
        .addScaledVector(perpVector1, Math.cos(t) * arcRadius)
        .addScaledVector(perpVector2, Math.sin(t) * arcRadius);
      arcPoints.push(point);
    }

    // Generate arrow head
    const lastPoint = arcPoints[arcPoints.length - 1];
    const secondLastPoint = arcPoints[arcPoints.length - 2] || arcPoints[0];
    const tangent = new THREE.Vector3()
      .subVectors(lastPoint, secondLastPoint)
      .normalize();
    const arrowSize = 0.1;

    const arrowBack = lastPoint.clone().addScaledVector(tangent, -arrowSize);
    const perpToTangent = new THREE.Vector3()
      .crossVectors(tangent, axis)
      .normalize();

    const arrowHeadPoints: THREE.Vector3[] = [
      lastPoint.clone(),
      arrowBack.clone().addScaledVector(perpToTangent, arrowSize * 0.5),
      lastPoint.clone(),
      arrowBack.clone().addScaledVector(perpToTangent, -arrowSize * 0.5),
    ];

    return { axis, angle, arcPoints, arrowHeadPoints };
  }, [quaternion]);

  if (Math.abs(angle) < 0.01) {
    return null;
  }

  const axisLength = 0.7;

  return (
    <group>
      {/* Rotation axis line */}
      <Line
        points={[
          axis.clone().multiplyScalar(-axisLength),
          axis.clone().multiplyScalar(axisLength),
        ]}
        color="#f97316"
        lineWidth={2}
      />

      {/* Arc */}
      {arcPoints.length > 1 && (
        <Line points={arcPoints} color="#f97316" lineWidth={2} />
      )}

      {/* Arrow head */}
      {arrowHeadPoints.length === 4 && (
        <>
          <Line
            points={[arrowHeadPoints[0], arrowHeadPoints[1]]}
            color="#f97316"
            lineWidth={2}
          />
          <Line
            points={[arrowHeadPoints[2], arrowHeadPoints[3]]}
            color="#f97316"
            lineWidth={2}
          />
        </>
      )}
    </group>
  );
}

interface SceneProps {
  quaternion: Quaternion;
  showOverlay: boolean;
  indicatorQuaternion?: Quaternion;
  cameraState?: CameraState;
  onCameraChange?: (state: CameraState) => void;
}

function Scene({
  quaternion,
  showOverlay,
  indicatorQuaternion,
  cameraState,
  onCameraChange,
}: SceneProps) {
  const threeQuat = useMemo(() => {
    return new THREE.Quaternion(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w,
    );
  }, [quaternion]);

  const indicatorQuat = useMemo(() => {
    if (!indicatorQuaternion) return null;
    return new THREE.Quaternion(
      indicatorQuaternion.x,
      indicatorQuaternion.y,
      indicatorQuaternion.z,
      indicatorQuaternion.w,
    );
  }, [indicatorQuaternion]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

      {showOverlay ? (
        <>
          {/* Original axes (solid) */}
          <AxisSet opacity={1} />
          <AxisLabels opacity={1} />

          {/* Rotation indicator (axis + arc arrow) */}
          <RotationIndicator quaternion={threeQuat} />

          {/* Rotated axes (faded) */}
          <AxisSet quaternion={threeQuat} opacity={0.5} />
          <AxisLabels quaternion={threeQuat} opacity={0.5} prime />
        </>
      ) : (
        <>
          {/* Single set of axes at the rotated position */}
          <AxisSet quaternion={threeQuat} opacity={1} />
          <AxisLabels quaternion={threeQuat} opacity={1} />

          {/* Show rotation indicator if indicatorQuaternion is provided */}
          {indicatorQuat && <RotationIndicator quaternion={indicatorQuat} />}
        </>
      )}

      <SyncedOrbitControls
        cameraState={cameraState}
        onCameraChange={onCameraChange}
      />
    </>
  );
}

interface SyncedOrbitControlsProps {
  cameraState?: CameraState;
  onCameraChange?: (state: CameraState) => void;
}

function SyncedOrbitControls({
  cameraState,
  onCameraChange,
}: SyncedOrbitControlsProps) {
  const { camera } = useThree();
  const controlsRef = useRef<ElementRef<typeof OrbitControls>>(null);
  const isUpdatingRef = useRef(false);

  // Apply external camera state
  useEffect(() => {
    if (cameraState && controlsRef.current && !isUpdatingRef.current) {
      isUpdatingRef.current = true;
      camera.position.set(...cameraState.position);
      controlsRef.current.target.set(...cameraState.target);
      controlsRef.current.update();
      isUpdatingRef.current = false;
    }
  }, [cameraState, camera]);

  const handleChange = useCallback(() => {
    if (onCameraChange && controlsRef.current && !isUpdatingRef.current) {
      const pos = camera.position;
      const target = controlsRef.current.target;
      onCameraChange({
        position: [pos.x, pos.y, pos.z],
        target: [target.x, target.y, target.z],
      });
    }
  }, [camera, onCameraChange]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={false}
      enablePan={false}
      makeDefault
      onChange={handleChange}
    />
  );
}

export function AxisVisualizer({
  quaternion,
  size = 100,
  showOverlay = true,
  indicatorQuaternion,
  cameraState,
  onCameraChange,
}: AxisVisualizerProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded overflow-hidden"
    >
      <Canvas
        camera={{
          position: [-2, -2, 1.5],
          up: [0, 0, 1],
          fov: 50,
        }}
        style={{ background: 'transparent' }}
      >
        <Scene
          quaternion={quaternion}
          showOverlay={showOverlay}
          indicatorQuaternion={indicatorQuaternion}
          cameraState={cameraState}
          onCameraChange={onCameraChange}
        />
      </Canvas>
    </div>
  );
}
