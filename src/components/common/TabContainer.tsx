import { type ReactNode, useEffect, useRef, useState } from 'react';
import { type AngleUnit, useSettings } from '../../contexts/SettingsContext';
import { useUrlState } from '../../hooks/useUrlState';

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabContainerProps {
  tabs: Tab[];
  defaultTabId?: string;
}

export function TabContainer({ tabs, defaultTabId }: TabContainerProps) {
  const { getTab, setTab } = useUrlState();
  const { angleUnit, setAngleUnit } = useSettings();
  const initializedRef = useRef(false);

  const [activeTabId, setActiveTabId] = useState(() => {
    const urlTab = getTab();
    if (urlTab && tabs.some((t) => t.id === urlTab)) {
      return urlTab;
    }
    return defaultTabId ?? tabs[0]?.id;
  });

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
    setTab(tabId);
  };

  // Set initial tab to URL (only once on mount)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (!getTab()) {
        setTab(activeTabId);
      }
    }
  }, [getTab, setTab, activeTabId]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex justify-center border-b border-gray-200 bg-white py-3">
        <div className="inline-flex rounded-lg bg-gray-200 p-1">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-5 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTabId === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Bar */}
      <div className="flex justify-center items-center gap-3 border-b border-gray-200 bg-gray-50 py-2">
        <span className="text-xs text-gray-500">Angle:</span>
        <div className="inline-flex rounded-md bg-gray-200 p-0.5">
          {(['deg', 'rad'] as AngleUnit[]).map((unit) => (
            <button
              type="button"
              key={unit}
              onClick={() => setAngleUnit(unit)}
              className={`px-2.5 py-0.5 text-xs font-medium rounded transition-all ${
                angleUnit === unit
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">{activeTab?.content}</div>
    </div>
  );
}
