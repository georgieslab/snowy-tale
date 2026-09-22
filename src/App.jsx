import { useState } from 'react';
import InteractiveBook from './components/InteractiveBook';
import SnowyGame from './components/SnowyGame';

function App() {
  const [currentMode, setCurrentMode] = useState('book'); // 'book' | 'game'
  const [language, setLanguage] = useState('en');

  return (
    <div className="app w-full min-h-screen">
      {currentMode === 'book' ? (
        <InteractiveBook 
          onOpenGame={() => setCurrentMode('game')} 
          language={language}
          onLanguageChange={setLanguage}
        />
      ) : (
        <SnowyGame 
          onBackToBook={() => setCurrentMode('book')} 
          language={language}
          onLanguageChange={setLanguage}
        />
      )}
    </div>
  );
}

export default App;