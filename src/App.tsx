import { AxisSwapCalculator } from './components/axis-swap/AxisSwapCalculator';
import { type Tab, TabContainer } from './components/common/TabContainer';
import { RotationConverter } from './components/converter/RotationConverter';
import { RotationChainCalculator } from './components/rotation/RotationChainCalculator';
import { SettingsProvider } from './contexts/SettingsContext';

const tabs: Tab[] = [
  {
    id: 'rotation-chain',
    label: 'Rotation Chain',
    content: <RotationChainCalculator />,
  },
  {
    id: 'axis-swap',
    label: 'Axis Swap',
    content: <AxisSwapCalculator />,
  },
  {
    id: 'conversion',
    label: 'Conversion',
    content: <RotationConverter />,
  },
];

function App() {
  return (
    <SettingsProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b border-gray-200 px-4 py-3 bg-white">
          <h1 className="text-lg font-bold">Mastering Rotation</h1>
        </header>
        <main className="h-[calc(100vh-56px)]">
          <TabContainer tabs={tabs} defaultTabId="rotation-chain" />
        </main>
      </div>
    </SettingsProvider>
  );
}

export default App;
