import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Volume2, Music } from 'lucide-react';
import { bookContent } from '../data/bookContent';

const InteractiveBook = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isNarrationEnabled, setIsNarrationEnabled] = useState(true);
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const narrationRef = useRef(new Audio());
  const musicRef = useRef(new Audio('/snowy-tale/assets/audios/jungle-ambient.mp3'));
  const pageTurnRef = useRef(new Audio('/snowy-tale/assets/audios/page-turn.mp3'));

  const navigatePage = async (direction) => {
    if (isTransitioning) return;
    
    const newPage = direction === 'next' 
      ? Math.min(currentPage + 1, bookContent[currentLanguage].length - 1)
      : Math.max(currentPage - 1, 0);
    
    if (newPage !== currentPage) {
      setIsTransitioning(true);
      
      // Play page turn sound first
      pageTurnRef.current.currentTime = 0;
      try {
        await pageTurnRef.current.play();
        
        // Wait for page turn sound to finish (approximately 0.5s)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setCurrentPage(newPage);
        setIsTransitioning(false);
        
        // Play narration only after page turn completes
        if (isNarrationEnabled) {
          playNarration(newPage);
        }
      } catch (error) {
        console.error('Error during page transition:', error);
      }
    }
  };

  const playNarration = (pageIndex) => {
    if (pageIndex === 0) {
      narrationRef.current.pause();
      return;
    }
    const audioIndex = pageIndex - 1;
    const audioPath = `/snowy-tale/assets/audios/${currentLanguage}/page-${audioIndex + 1}.mp3`;
    console.log('Playing audio:', audioPath);
    
    try {
      narrationRef.current.src = audioPath;
      narrationRef.current.load(); // Force reload of audio
      
      const playPromise = narrationRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio started playing successfully');
          })
          .catch(error => {
            console.error('Audio playback error:', error);
          });
      }
    } catch (error) {
      console.error('Audio setup error:', error);
    }
  };

  const PageSpread = ({ image, text }) => (
    <div className="flex h-full">
      {/* Center binding effect */}
      <div className="absolute left-1/2 top-0 h-full w-8 -ml-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 transform -skew-x-12" />
      
      {/* Left page - Image */}
      <div className="w-1/2 p-8 h-full flex items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-white via-gray-50 to-gray-100" />
        <div className="absolute right-0 h-full w-12 bg-gradient-to-l from-gray-200 to-transparent" />
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <img 
            src={image}
            alt="Story illustration"
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          />
        </div>
      </div>
      
      {/* Right page - Text */}
      <div className="w-1/2 p-8 h-full flex items-center relative">
        <div className="absolute inset-0 bg-gradient-to-l from-white via-gray-50 to-gray-100" />
        <div className="absolute left-0 h-full w-12 bg-gradient-to-r from-gray-200 to-transparent" />
        <div className="relative bg-white/90 backdrop-blur-sm rounded-lg p-8 shadow-lg w-full">
          <p className="text-2xl md:text-3xl leading-relaxed text-gray-800 font-updock">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
  
  const toggleNarration = () => {
    setIsNarrationEnabled(prev => !prev);
    if (narrationRef.current) {
      if (isNarrationEnabled) {
        narrationRef.current.pause();
      } else {
        playNarration(currentPage);
      }
    }
  };

  const toggleMusic = () => {
    setIsMusicEnabled(prev => !prev);
    if (musicRef.current) {
      if (musicRef.current.paused) {
        musicRef.current.play();
        musicRef.current.loop = true;
      } else {
        musicRef.current.pause();
      }
    }
  };

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 3000);
    
    return () => {
      narrationRef.current.pause();
      musicRef.current.pause();
    };
  }, []);

  return (
    <div 
      className="relative h-screen overflow-hidden"
      style={{
        backgroundImage: `url('/snowy-tale/assets/images/background.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Sparkle overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {isTransitioning && (
          <div className="absolute inset-0 animate-sparkle opacity-50">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white rounded-full animate-twinkle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Loading screen */}
      {isLoading ? (
        <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 animate-heartbeat">
            <img 
              src="/snowy-tale/assets/images/heart.png" 
              alt="Loading..."
              className="w-full h-full object-contain filter drop-shadow-lg"
            />
          </div>
          <p className="text-4xl text-gray-600 mt-6 animate-pulse font-updock">
            Loading your magical story...
          </p>
        </div>
      ) : (
        <>
          {/* Book container */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className={`transition-all duration-700 ease-in-out transform-gpu
              perspective-1000 ${isTransitioning ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}
              ${isTransitioning ? 'rotate-y-90' : 'rotate-y-0'}
              ${currentPage === 0 || currentPage === bookContent[currentLanguage].length - 1 ? 'w-[80vh] h-[80vh]' : 'w-[160vh] h-[80vh]'}`}
            >
              {/* Book frame */}
              <div className="bg-white rounded-lg shadow-2xl h-full relative overflow-hidden">
                {/* Book spine */}
                <div className="absolute left-0 top-0 w-8 h-full bg-gradient-to-r from-gray-300 via-gray-200 to-gray-100 rounded-l-lg" />
                
                {/* Page content */}
                <div className="relative ml-8 h-full">
                  {currentPage === 0 ? (
                    // Front Cover - square format
                    <div className="h-full relative overflow-hidden rounded-r-lg">
                      <div className="absolute right-0 h-full w-16 bg-gradient-to-l from-gray-200 to-transparent" />
                      <img 
                        src={bookContent[currentLanguage][currentPage].image}
                        alt="Cover illustration"
                        className="h-full w-full object-cover rounded-lg"
                      />
                    </div>
                  ) : currentPage === bookContent[currentLanguage].length - 1 ? (
                    // Back Cover - square format
                    <div className="h-full relative overflow-hidden rounded-lg">
                      <div className="absolute left-0 h-full w-16 bg-gradient-to-r from-gray-200 to-transparent" />
                      <img 
                        src={bookContent[currentLanguage][currentPage].image}
                        alt="Back Cover"
                        className="h-full w-full object-cover rounded-lg -scale-x-100"
                      />
                    </div>
                  ) : (
                    // Story pages spread
                    <PageSpread
                      image={bookContent[currentLanguage][currentPage].image}
                      text={bookContent[currentLanguage][currentPage].text}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="fixed top-4 w-full flex justify-between items-center px-6 z-20">
            <button 
              onClick={() => setCurrentLanguage(prev => prev === 'en' ? 'de' : 'en')}
              className="bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-lg hover:shadow-xl 
                       transition-all duration-300 transform hover:-translate-y-1"
            >
              <span className="text-xl">
                {currentLanguage === 'en' ? '🇺🇸 English' : '🇩🇪 Deutsch'}
              </span>
            </button>

            <div className="flex gap-4">
              <button 
                onClick={toggleNarration}
                className={`px-6 py-3 rounded-full shadow-lg transition-all duration-300 
                         transform hover:-translate-y-1 flex items-center gap-2
                         ${isNarrationEnabled ? 'bg-pink-400 text-white' : 'bg-white/90 backdrop-blur'}`}
              >
                <Volume2 size={24} />
                <span>Narration</span>
              </button>
              
              <button 
                onClick={toggleMusic}
                className={`px-6 py-3 rounded-full shadow-lg transition-all duration-300 
                         transform hover:-translate-y-1 flex items-center gap-2
                         ${isMusicEnabled ? 'bg-pink-400 text-white' : 'bg-white/90 backdrop-blur'}`}
              >
                <Music size={24} />
                <span>Music</span>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6 
                        bg-white/90 backdrop-blur rounded-full shadow-lg p-4 z-20">
            <button
              onClick={() => navigatePage('prev')}
              disabled={currentPage === 0 || isTransitioning}
              className="p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed 
                       hover:bg-pink-50 transition-all duration-300 transform hover:scale-110"
            >
              <ChevronLeft size={30} />
            </button>
            
            <span className="text-xl px-4">
              Page {currentPage + 1} of {bookContent[currentLanguage].length}
            </span>
            
            <button
              onClick={() => navigatePage('next')}
              disabled={currentPage === bookContent[currentLanguage].length - 1 || isTransitioning}
              className="p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed 
                       hover:bg-pink-50 transition-all duration-300 transform hover:scale-110"
            >
              <ChevronRight size={30} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="fixed bottom-0 left-0 w-full h-2 bg-gray-100">
            <div 
              className="h-full bg-gradient-to-r from-pink-400 to-purple-400 
                       transition-all duration-300 rounded-r shadow-lg"
              style={{ width: `${(currentPage / (bookContent[currentLanguage].length - 1)) * 100}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default InteractiveBook;