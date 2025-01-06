import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Volume2, Music } from 'lucide-react';
import { bookContent } from '../data/bookContent';

const Preloader = ({ src }) => {
  useEffect(() => {
    const img = new Image();
    img.src = src;
  }, [src]);
  return null;
};

const InteractiveBook = () => {
  // Existing states
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isNarrationEnabled, setIsNarrationEnabled] = useState(true);
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // New states for enhanced features
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [showNextHint, setShowNextHint] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  
  // Existing refs
  const narrationRef = useRef(new Audio());
  const musicRef = useRef(new Audio('/snowy-tale/assets/audios/jungle-ambient.mp3'));
  const pageTurnRef = useRef(new Audio('/snowy-tale/assets/audios/page-turn.mp3'));

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (isTransitioning) return;
      
      if (e.key === 'ArrowRight') {
        navigatePage('next');
        showEdgeFlash('right');
      } else if (e.key === 'ArrowLeft') {
        navigatePage('prev');
        showEdgeFlash('left');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, isTransitioning]);

  // Handle touch events for swipe
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) { // minimum swipe distance
      if (diff > 0) {
        navigatePage('next');
      } else {
        navigatePage('prev');
      }
    }
    
    setTouchStart(null);
  };

  // Edge flash animation
  const showEdgeFlash = (direction) => {
    const flash = document.createElement('div');
    flash.className = `absolute top-0 ${direction === 'right' ? 'right-0' : 'left-0'} 
                      h-full w-16 bg-white/30 animate-flash`;
    document.querySelector('.book-container').appendChild(flash);
    setTimeout(() => flash.remove(), 300);
  };

  const [preloadedImages, setPreloadedImages] = useState(new Set());
  const [isPageReady, setIsPageReady] = useState(false);
  
  // Preload images for current, next, and previous pages
  const preloadPages = async (currentIndex) => {
    const pagesToPreload = [];
    const content = bookContent[currentLanguage];
    
    // Add current, next, and previous pages to preload list
    [-1, 0, 1].forEach(offset => {
      const pageIndex = currentIndex + offset;
      if (pageIndex >= 0 && pageIndex < content.length) {
        pagesToPreload.push(content[pageIndex].image);
      }
    });
    
    // Preload images
    const newPreloadedImages = new Set(preloadedImages);
    
    const preloadPromises = pagesToPreload.map(imageSrc => {
      if (!newPreloadedImages.has(imageSrc)) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            newPreloadedImages.add(imageSrc);
            resolve();
          };
          img.onerror = reject;
          img.src = imageSrc;
        });
      }
      return Promise.resolve();
    });

    try {
      await Promise.all(preloadPromises);
      setPreloadedImages(newPreloadedImages);
      setIsPageReady(true);
    } catch (error) {
      console.error('Error preloading images:', error);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      preloadPages(currentPage);
    }
  }, [currentPage, currentLanguage, isLoading]);

  const navigatePage = async (direction) => {
    if (isTransitioning || !isPageReady) return;
    
    const newPage = direction === 'next' 
      ? Math.min(currentPage + 1, bookContent[currentLanguage].length - 1)
      : Math.max(currentPage - 1, 0);
    
    if (newPage !== currentPage) {
      setIsTransitioning(true);
      setIsPageReady(false);
      
      try {
        // Start preloading next pages immediately
        const preloadPromise = preloadPages(newPage);
        
        // Play page turn sound
        pageTurnRef.current.currentTime = 0;
        await pageTurnRef.current.play();
        
        // Wait for both preloading and sound
        await Promise.all([
          preloadPromise,
          new Promise(resolve => setTimeout(resolve, 500))
        ]);
        
        setCurrentPage(newPage);
        setIsTransitioning(false);
        
        if (isNarrationEnabled && newPage !== 0) {
          playNarration(newPage);
        }
      } catch (error) {
        console.error('Error during page transition:', error);
        setIsTransitioning(false);
      }
    }
  };

  // Book opening handler
  const handleBookOpen = () => {
    setIsBookOpen(true);
    setTimeout(() => {
      navigatePage('next');
    }, 1000);
  };

  const PageSpread = ({ image, text }) => (
    <div className="flex h-full">
      {/* Center binding effect */}
      <div className="absolute left-1/2 top-0 h-full w-8 -ml-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 transform -skew-x-12" />
      
      {/* Left page - Image */}
      <div className="w-1/2 p-8 h-full flex items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#40E0D0] via-[#FFE4E1] to-[#FFDAB9] animate-gradient-slow" />
        <div className="absolute right-0 h-full w-12 bg-gradient-to-l from-[#958074] to-transparent" />
        <div className="relative w-full h-full flex items-center justify-center p-4">
          {preloadedImages.has(image) ? (
            <img 
              src={image}
              alt="Story illustration"
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-pulse bg-gray-200 rounded-lg w-full h-full" />
            </div>
          )}
        </div>
      </div>
      
      {/* Right page - Text */}
      <div className="w-1/2 p-8 h-full flex items-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFDAB9] via-[#FFE4E1] to-[#40E0D0] animate-gradient-slow" />
        <div className="absolute left-0 h-full w-12 bg-gradient-to-r from-[#958074] to-transparent" />
        <div className="relative bg-white/90 backdrop-blur-sm rounded-lg p-8 shadow-lg w-full">
          <p className="text-2xl md:text-3xl leading-relaxed text-gray-800 font-updock">
            {text}
          </p>
        </div>
      </div>
    </div>
  );

  const renderPreloaders = () => {
    const content = bookContent[currentLanguage];
    return (
      <>
        {currentPage > 0 && <Preloader src={content[currentPage - 1].image} />}
        {currentPage < content.length - 1 && <Preloader src={content[currentPage + 1].image} />}
      </>
    );
  };

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

  // Modified playNarration function
  const playNarration = (pageIndex) => {
    if (pageIndex === 0) {
      narrationRef.current.pause();
      return;
    }
    const audioIndex = pageIndex - 1;
    const audioPath = `/snowy-tale/assets/audios/${currentLanguage}/page-${audioIndex + 1}.mp3`;
    
    try {
      narrationRef.current.src = audioPath;
      narrationRef.current.load();
      const playPromise = narrationRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => console.log('Audio started playing successfully'))
          .catch(error => console.error('Audio playback error:', error));
      }
    } catch (error) {
      console.error('Audio setup error:', error);
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
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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

      {renderPreloaders()}

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
          {/* Controls */}
          <div className="fixed top-4 w-full flex justify-between items-center px-6 z-20">
            <button 
              onClick={() => setCurrentLanguage(prev => prev === 'en' ? 'de' : 'en')}
              className="bg-white/80 backdrop-blur px-6 py-3 rounded-full shadow-lg hover:shadow-xl 
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
                         ${isNarrationEnabled ? 'bg-pink-400 text-white' : 'bg-white/80 backdrop-blur'}`}
              >
                <Volume2 size={24} />
                <span>Narration</span>
              </button>
              
              <button 
                onClick={toggleMusic}
                className={`px-6 py-3 rounded-full shadow-lg transition-all duration-300 
                         transform hover:-translate-y-1 flex items-center gap-2
                         ${isMusicEnabled ? 'bg-pink-400 text-white' : 'bg-white/80 backdrop-blur'}`}
              >
                <Music size={24} />
                <span>Music</span>
              </button>
            </div>
          </div>

          {/* Book container */}
          <div className="book-container absolute inset-0 flex items-center justify-center p-4 animate-book-open">
            <div 
              className={`transition-all duration-1000 ease-in-out transform-gpu
                perspective-1000 ${isTransitioning ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}
                ${!isBookOpen ? 'rotate-y-90' : 'rotate-y-0'}
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

          {/* Navigation - Only show when book is open and not on cover */}
          {isBookOpen && currentPage !== 0 && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 
                          bg-white/70 backdrop-blur-sm rounded-full shadow-lg p-2 z-20">
              <button
                onClick={() => navigatePage('prev')}
                disabled={currentPage === 0 || isTransitioning}
                className={`p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed 
                         hover:bg-pink-50 transition-all duration-300 transform hover:scale-110`}
              >
                <ChevronLeft size={24} />
              </button>
              
              <span className="text-lg px-3">
                {currentPage} / {bookContent[currentLanguage].length - 1}
              </span>
              
              <button
                onClick={() => navigatePage('next')}
                disabled={currentPage === bookContent[currentLanguage].length - 1 || isTransitioning}
                className={`p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed 
                         hover:bg-pink-50 transition-all duration-300 transform hover:scale-110
                         ${showNextHint ? 'animate-pulse' : ''}`}
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}

          {/* Start button on cover */}
          {currentPage === 0 && !isBookOpen && (
            <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2
                          flex flex-col items-center gap-4">
              <button
                onClick={handleBookOpen}
                className="group relative rounded-full overflow-hidden
                         px-12 py-4 text-2xl font-bold text-white
                         hover:scale-105 transition-all duration-300
                         bg-gradient-to-r from-[#40E0D0] via-pink-300 to-[#FFDAB9]
                         animate-gradient-slow hover:shadow-lg"
              >
                Begin the Story
                {/* Sparkle effects */}
                <div className="absolute -top-1 right-2 w-3 h-3 bg-white rounded-full animate-twinkle-slow" />
                <div className="absolute bottom-1 left-2 w-2 h-2 bg-white rounded-full animate-twinkle-slow delay-150" />
              </button>
            </div>
          )}

          {/* Progress bar */}
          <div className="fixed bottom-0 left-0 w-full h-1 bg-gray-100">
            <div 
              className="h-full bg-gradient-to-r from-[#40E0D0] to-pink-400 
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