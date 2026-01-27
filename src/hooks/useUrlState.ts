import { useCallback } from 'react';
import type { Axis, AxisMapping, RotationStep, SignedAxis } from '../types';

const VALID_AXES: Axis[] = ['x', 'y', 'z'];
const VALID_SIGNED_AXES: SignedAxis[] = ['x', '-x', 'y', '-y', 'z', '-z'];

function isValidAxis(value: string): value is Axis {
  return VALID_AXES.includes(value as Axis);
}

function isValidSignedAxis(value: string): value is SignedAxis {
  return VALID_SIGNED_AXES.includes(value as SignedAxis);
}

// Parse query string directly to avoid encoding
function parseQueryString(search: string): Record<string, string> {
  const params: Record<string, string> = {};
  const query = search.startsWith('?') ? search.slice(1) : search;
  if (!query) return params;

  for (const pair of query.split('&')) {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
    }
  }
  return params;
}

function buildQueryString(params: Record<string, string>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    // Use as-is without encoding (assuming only URL-safe characters)
    parts.push(`${key}=${value}`);
  }
  return parts.join('&');
}

export function useUrlState() {
  const getParams = useCallback(() => {
    return parseQueryString(window.location.search);
  }, []);

  const updateUrl = useCallback((params: Record<string, string>) => {
    const queryString = buildQueryString(params);
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, []);

  // Tab state
  const getTab = useCallback((): string | null => {
    return getParams().tab || null;
  }, [getParams]);

  const setTab = useCallback(
    (tabId: string) => {
      const params = getParams();
      params.tab = tabId;
      updateUrl(params);
    },
    [getParams, updateUrl],
  );

  // Rotation chain state
  // Format: chain=y.25_x.30_z.-45 (axis.angle separated by underscore)
  const getChain = useCallback((): RotationStep[] | null => {
    const chainParam = getParams().chain;
    if (!chainParam) return null;

    try {
      const steps: RotationStep[] = [];
      const pairs = chainParam.split('_');

      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        // First char is axis, rest is angle (including negative)
        const axis = pair[0];
        const angleStr = pair.slice(2); // Skip the dot

        if (!isValidAxis(axis)) continue;

        const angleDeg = parseFloat(angleStr);
        if (Number.isNaN(angleDeg)) continue;

        steps.push({
          id: `step-url-${i}`,
          axis,
          angleDeg,
        });
      }

      return steps.length > 0 ? steps : null;
    } catch {
      return null;
    }
  }, [getParams]);

  const setChain = useCallback(
    (steps: RotationStep[]) => {
      const params = getParams();
      const chainStr = steps.map((s) => `${s.axis}.${s.angleDeg}`).join('_');
      params.chain = chainStr;
      updateUrl(params);
    },
    [getParams, updateUrl],
  );

  // Axis swap state
  // Format: swap=x.-y.z (where each original axis now points)
  // Example: swap=-y.z.-x means X->-Y, Y->Z, Z->-X
  const getSwap = useCallback((): AxisMapping | null => {
    const swapParam = getParams().swap;
    if (!swapParam) return null;

    try {
      const parts = swapParam.split('.');
      if (parts.length !== 3) return null;

      const [xTo, yTo, zTo] = parts;
      if (
        !isValidSignedAxis(xTo) ||
        !isValidSignedAxis(yTo) ||
        !isValidSignedAxis(zTo)
      ) {
        return null;
      }

      return { x: xTo, y: yTo, z: zTo };
    } catch {
      return null;
    }
  }, [getParams]);

  const setSwap = useCallback(
    (mapping: AxisMapping) => {
      const params = getParams();
      params.swap = `${mapping.x}.${mapping.y}.${mapping.z}`;
      updateUrl(params);
    },
    [getParams, updateUrl],
  );

  // Angle unit state (deg or rad)
  const getUnit = useCallback((): 'deg' | 'rad' => {
    const unit = getParams().unit;
    return unit === 'rad' ? 'rad' : 'deg';
  }, [getParams]);

  const setUnit = useCallback(
    (unit: 'deg' | 'rad') => {
      const params = getParams();
      params.unit = unit;
      updateUrl(params);
    },
    [getParams, updateUrl],
  );

  // Output format state (tuple, list, space)
  const getFormat = useCallback((): 'tuple' | 'list' | 'space' => {
    const format = getParams().format;
    if (format === 'list' || format === 'space') return format;
    return 'tuple';
  }, [getParams]);

  const setFormat = useCallback(
    (format: 'tuple' | 'list' | 'space') => {
      const params = getParams();
      params.format = format;
      updateUrl(params);
    },
    [getParams, updateUrl],
  );

  // Generate share URL
  const getShareUrl = useCallback(() => {
    return window.location.href;
  }, []);

  return {
    getTab,
    setTab,
    getChain,
    setChain,
    getSwap,
    setSwap,
    getUnit,
    setUnit,
    getFormat,
    setFormat,
    getShareUrl,
  };
}
