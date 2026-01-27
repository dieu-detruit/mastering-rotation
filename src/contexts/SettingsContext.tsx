import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import { useUrlState } from '../hooks/useUrlState';

export type AngleUnit = 'deg' | 'rad';
export type OutputFormat = 'tuple' | 'list' | 'space';

interface SettingsContextType {
  angleUnit: AngleUnit;
  setAngleUnit: (unit: AngleUnit) => void;
  outputFormat: OutputFormat;
  setOutputFormat: (format: OutputFormat) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { getUnit, setUnit, getFormat, setFormat } = useUrlState();

  const [angleUnit, setAngleUnitState] = useState<AngleUnit>(() => getUnit());
  const [outputFormat, setOutputFormatState] = useState<OutputFormat>(() =>
    getFormat(),
  );

  const setAngleUnit = useCallback(
    (unit: AngleUnit) => {
      setAngleUnitState(unit);
      setUnit(unit);
    },
    [setUnit],
  );

  const setOutputFormat = useCallback(
    (format: OutputFormat) => {
      setOutputFormatState(format);
      setFormat(format);
    },
    [setFormat],
  );

  return (
    <SettingsContext.Provider
      value={{ angleUnit, setAngleUnit, outputFormat, setOutputFormat }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
