import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Axis, RotationResult, RotationStep } from '../types';
import { computeRotationChain } from '../utils/rotation';
import { useUrlState } from './useUrlState';

let stepIdCounter = 0;
function generateStepId(): string {
  return `step-${++stepIdCounter}`;
}

function createDefaultStep(): RotationStep {
  return { id: generateStepId(), axis: 'x', angleDeg: 0 };
}

export function useRotation() {
  const { getChain, setChain } = useUrlState();
  const initialized = useRef(false);

  const [steps, setSteps] = useState<RotationStep[]>(() => {
    const urlSteps = getChain();
    if (urlSteps && urlSteps.length > 0) {
      // Assign unique IDs to steps loaded from URL
      return urlSteps.map((s) => ({ ...s, id: generateStepId() }));
    }
    return [createDefaultStep()];
  });

  // Update URL when steps change
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    setChain(steps);
  }, [steps, setChain]);

  const result: RotationResult = useMemo(() => {
    return computeRotationChain(steps);
  }, [steps]);

  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, createDefaultStep()]);
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const updateStep = useCallback((id: string, axis: Axis, angleDeg: number) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, axis, angleDeg } : s)),
    );
  }, []);

  const reset = useCallback(() => {
    setSteps([createDefaultStep()]);
  }, []);

  return {
    steps,
    result,
    addStep,
    removeStep,
    updateStep,
    reset,
  };
}
