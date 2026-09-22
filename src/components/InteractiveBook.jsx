import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Music, 
  Music2, 
  Maximize2, 
  Minimize2, 
  RotateCcw,
  Sparkles,
  Type
} from 'lucide-react';
import { bookContent } from '../data/bookContent';

// Helper to resolve asset paths reliably across dev and production base paths
const resolveAsset = (path) => {
  if (!path) return '';
  const base = import.meta.env.BASE_URL || '/';
  const cleanPath = path.replace(/^\/?(snowy-tale\/)?/, '');
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}${cleanPath}`;
};

const InteractiveBook = () => {
  // State management
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isNarrationEnabled, setIsNarrationEnabled] = useState(true);
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showNextHint, setShowNextHint] = useState(false);
  const [isLargeText, setIsLargeText] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeFlash, setActiveFlash] = useState(null); // 'left' | 'right' | null
  const [preloadedImages, setPreloadedImages] = useState(new Set());

  // Refs for audio and gesture tracking
  const narrationRef = useRef(null);
  const musicRef = useRef(null);
  const pageTurnRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  // Initialize audio elements once
  useEffect(() => {
    narrationRef.current = new Audio();
    musicRef.current = new Audio(resolveAsset('assets/audios/jungle-ambient.mp3'));
    pageTurnRef.current = new Audio(resolveAsset('assets/audios/page-turn.mp3'));

    if (musicRef.current) {
      musicRef.current.loop = true;
      musicRef.current.volume = 0.22;
    }

    const narrationAudio = narrationRef.current;
    const handleNarrationEnded = () => {
      setShowNextHint(true);
    };

    if (narrationAudio) {
      narrationAudio.addEventListener('ended', handleNarrationEnded);
    }

    // Quick image preloader for initial cover
    const coverImage = new Image();
    coverImage.src = resolveAsset(bookContent.en[0].image);
    coverImage.onload = () => setIsLoading(false);
    coverImage.onerror = () => setIsLoading(false);

    // Safety fallback: don't block user for more than 1 second
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (narrationAudio) {
        narrationAudio.removeEventListener('ended', handleNarrationEnded);
        narrationAudio.pause();
      }
      if (musicRef.current) {
        musicRef.current.pause();
      }
    };
  }, []);

  // Preload neighboring images
  const preloadPages = useCallback((currentIndex, language = currentLanguage) => {
    const content = bookContent[language];
    if (!content) return;

    [-1, 0, 1].forEach(offset => {
      const pageIndex = currentIndex + offset;
      if (pageIndex >= 0 && pageIndex < content.length) {
        const imageSrc = resolveAsset(content[pageIndex].image);
        if (!preloadedImages.has(imageSrc)) {
          const img = new Image();
          img.src = imageSrc;
          img.onload = () => {
            setPreloadedImages(prev => new Set(prev).add(imageSrc));
          };
        }
      }
    });
  }, [currentLanguage, preloadedImages]);

  useEffect(() => {
    if (!isLoading) {
      preloadPages(currentPage, currentLanguage);
    }
  }, [currentPage, currentLanguage, isLoading, preloadPages]);

  // Audio narration player
  const playNarration = useCallback((pageIndex, language = currentLanguage) => {
    if (!narrationRef.current) return;

    // Cover or back cover doesn't have narration
    if (pageIndex === 0 || pageIndex === bookContent[language].length - 1) {
      narrationRef.current.pause();
      return;
    }

    const audioIndex = pageIndex - 1;
    const audioPath = resolveAsset(`assets/audios/${language}/page-${audioIndex + 1}.mp3`);

    try {
      narrationRef.current.pause();
      narrationRef.current.currentTime = 0;
      narrationRef.current.src = audioPath;
      narrationRef.current.load();

      const playPromise = narrationRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          if (error.name !== 'AbortError') {
            console.log('Audio playback info:', error.message);
          }
        });
      }
    } catch (error) {
      console.error('Audio playback setup failed:', error);
    }
  }, [currentLanguage]);

  // Page navigation logic
  const navigatePage = useCallback((direction) => {
    if (isTransitioning) return;

    setShowNextHint(false);
    const totalPages = bookContent[currentLanguage].length;
    const newPage = direction === 'next'
      ? Math.min(currentPage + 1, totalPages - 1)
      : Math.max(currentPage - 1, 0);

    if (newPage !== currentPage) {
      setIsTransitioning(true);
      setActiveFlash(direction === 'next' ? 'right' : 'left');
      setTimeout(() => setActiveFlash(null), 350);

      // Play page turn SFX
      if (pageTurnRef.current) {
        pageTurnRef.current.currentTime = 0;
        pageTurnRef.current.volume = 0.5;
        pageTurnRef.current.play().catch(() => {});
      }

      setCurrentPage(newPage);

      if (isNarrationEnabled) {
        playNarration(newPage);
      } else if (narrationRef.current) {
        narrationRef.current.pause();
      }

      setTimeout(() => {
        setIsTransitioning(false);
      }, 400);
    }
  }, [currentPage, currentLanguage, isNarrationEnabled, isTransitioning, playNarration]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (isTransitioning) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        navigatePage('next');
      } else if (e.key === 'ArrowLeft') {
        navigatePage('prev');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigatePage, isTransitioning]);

  // Enhanced touch swipe handler (slope filtering to avoid intercepting vertical scrolls)
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    }
  };

  const handleTouchEnd = (e) => {
    if (e.changedTouches.length === 1) {
      const diffX = touchStartRef.current.x - e.changedTouches[0].clientX;
      const diffY = touchStartRef.current.y - e.changedTouches[0].clientY;
      const timeDiff = Date.now() - touchStartRef.current.time;

      // Must be a clear horizontal swipe (diffX > 45px, more horizontal than vertical, within 600ms)
      if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.3 && timeDiff < 600) {
        if (diffX > 0) {
          navigatePage('next');
        } else {
          navigatePage('prev');
        }
      }
    }
  };

  // Book opening handler
  const handleBookOpen = () => {
    if (pageTurnRef.current) {
      pageTurnRef.current.currentTime = 0;
      pageTurnRef.current.volume = 0.5;
      pageTurnRef.current.play().catch(() => {});
    }
    setTimeout(() => {
      navigatePage('next');
    }, 350);
  };

  // Read again from back cover
  const handleReadAgain = () => {
    setCurrentPage(0);
    setShowNextHint(false);
    if (narrationRef.current) {
      narrationRef.current.pause();
    }
  };

  // Audio toggles
  const toggleNarration = () => {
    const nextState = !isNarrationEnabled;
    setIsNarrationEnabled(nextState);

    if (narrationRef.current) {
      if (nextState) {
        playNarration(currentPage);
      } else {
        narrationRef.current.pause();
      }
    }
  };

  const toggleMusic = () => {
    const nextState = !isMusicEnabled;
    setIsMusicEnabled(nextState);

    if (musicRef.current) {
      if (nextState) {
        musicRef.current.volume = 0.22;
        musicRef.current.play().catch(() => {});
      } else {
        musicRef.current.pause();
      }
    }
  };

  const toggleLanguage = () => {
    const nextLang = currentLanguage === 'en' ? 'de' : 'en';
    setCurrentLanguage(nextLang);
    if (isNarrationEnabled && currentPage > 0 && currentPage < bookContent[nextLang].length - 1) {
      playNarration(currentPage, nextLang);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const currentBookPages = bookContent[currentLanguage];
  const currentPageData = currentBookPages[currentPage] || currentBookPages[0];
  const totalPageCount = currentBookPages.length - 1;
  const isCover = currentPage === 0;
  const isBackCover = currentPage === totalPageCount;

  return (
    <div 
      className="relative min-h-screen w-full overflow-hidden select-none bg-slate-900"
      style={{
        backgroundImage: `url('${resolveAsset('assets/images/background.jpg')}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Dim / Ambient Tint Overlay */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Edge Flash Cue */}
      {activeFlash === 'left' && (
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-white/40 pointer-events-none z-40 edge-flash-left" />
      )}
      {activeFlash === 'right' && (
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-white/40 pointer-events-none z-40 edge-flash-right" />
      )}

      {/* Sparkle overlay during transition */}
      {isTransitioning && (
        <div className="absolute inset-0 pointer-events-none z-30">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full animate-twinkle shadow-[0_0_8px_white]"
              style={{
                left: `${(i * 19) % 100}%`,
                top: `${(i * 29) % 100}%`,
                animationDelay: `${(i * 0.1)}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Loading screen */}
      {isLoading ? (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 animate-heartbeat">
            <img 
              src={resolveAsset('assets/images/heart.png')} 
              alt="Loading..."
              className="w-full h-full object-contain filter drop-shadow-lg"
            />
          </div>
          <p className="text-3xl sm:text-4xl text-gray-700 mt-6 animate-pulse font-updock">
            Loading your magical story...
          </p>
        </div>
      ) : (
        <>
          {/* Top Control Bar */}
          <header className="fixed top-0 left-0 right-0 z-30 safe-top px-3 sm:px-6 py-2 sm:py-3 flex justify-between items-center bg-gradient-to-b from-black/40 via-black/20 to-transparent">
            {/* Language Selector */}
            <button 
              onClick={toggleLanguage}
              aria-label="Toggle story language"
              className="group flex items-center gap-1.5 sm:gap-2 bg-white/85 hover:bg-white active:scale-95 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-md hover:shadow-xl transition-all duration-200 border border-white/40"
            >
              <span className="text-base sm:text-lg">
                {currentLanguage === 'en' ? '🇺🇸' : '🇩🇪'}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-gray-800 tracking-wide">
                {currentLanguage === 'en' ? 'English' : 'Deutsch'}
              </span>
            </button>

            {/* Quick Actions (Audio, Text Size, Fullscreen) */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Text Size Toggle */}
              <button 
                onClick={() => setIsLargeText(prev => !prev)}
                aria-label="Toggle text size"
                className={`p-2 sm:px-3 sm:py-2 rounded-full shadow-md transition-all duration-200 flex items-center gap-1 active:scale-95 border ${
                  isLargeText 
                    ? 'bg-amber-400 text-slate-900 border-amber-300 font-bold' 
                    : 'bg-white/85 hover:bg-white text-gray-700 border-white/40'
                }`}
                title="Toggle larger reading font"
              >
                <Type size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline text-xs font-semibold">
                  {isLargeText ? 'Text: L' : 'Text: M'}
                </span>
              </button>

              {/* Narration Toggle */}
              <button 
                onClick={toggleNarration}
                aria-label="Toggle voice narration"
                className={`p-2 sm:px-3.5 sm:py-2 rounded-full shadow-md transition-all duration-200 flex items-center gap-1.5 active:scale-95 border ${
                  isNarrationEnabled 
                    ? 'bg-pink-500 text-white border-pink-400 font-medium' 
                    : 'bg-white/85 hover:bg-white text-gray-700 border-white/40'
                }`}
                title="Toggle voice narration"
              >
                {isNarrationEnabled ? <Volume2 size={18} className="sm:w-5 sm:h-5" /> : <VolumeX size={18} className="sm:w-5 sm:h-5" />}
                <span className="hidden sm:inline text-xs">
                  Voice
                </span>
              </button>
              
              {/* Ambient Music Toggle */}
              <button 
                onClick={toggleMusic}
                aria-label="Toggle background jungle music"
                className={`p-2 sm:px-3.5 sm:py-2 rounded-full shadow-md transition-all duration-200 flex items-center gap-1.5 active:scale-95 border ${
                  isMusicEnabled 
                    ? 'bg-teal-500 text-white border-teal-400 font-medium' 
                    : 'bg-white/85 hover:bg-white text-gray-700 border-white/40'
                }`}
                title="Toggle ambient music"
              >
                {isMusicEnabled ? <Music size={18} className="sm:w-5 sm:h-5" /> : <Music2 size={18} className="sm:w-5 sm:h-5 text-gray-400" />}
                <span className="hidden sm:inline text-xs">
                  Music
                </span>
              </button>

              {/* Fullscreen Button */}
              <button 
                onClick={toggleFullscreen}
                aria-label="Toggle fullscreen mode"
                className="hidden sm:flex p-2 sm:p-2.5 rounded-full bg-white/85 hover:bg-white text-gray-700 shadow-md transition-all duration-200 active:scale-95 border border-white/40"
                title="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
          </header>

          {/* Main Book Stage */}
          <main className="book-container absolute inset-0 flex items-center justify-center p-2 sm:p-6 md:p-8 pt-16 sm:pt-20 pb-20 sm:pb-24">
            
            {/* ============================================================== */}
            {/* 1. MOBILE PORTRAIT / SMALL SCREEN VIEW (< 768px)               */}
            {/* ============================================================== */}
            <div className="w-full h-full max-w-md flex flex-col md:hidden justify-center items-center">
              {isCover ? (
                // Mobile Front Cover
                <div className="w-full h-full max-h-[82vh] bg-white rounded-3xl shadow-2xl p-4 flex flex-col items-center justify-between border-4 border-pink-200/80 animate-book-open">
                  <div className="text-center pt-2">
                    <h1 className="text-4xl sm:text-5xl font-updock text-teal-800 tracking-wide leading-tight">
                      {currentPageData.text}
                    </h1>
                  </div>

                  <div className="w-full flex-1 my-3 overflow-hidden rounded-2xl shadow-inner relative flex items-center justify-center bg-teal-50/50">
                    <img 
                      src={resolveAsset(currentPageData.image)} 
                      alt="Snowy the Tiny Dinosaur Cover"
                      className="w-full h-full object-contain rounded-2xl"
                    />
                  </div>

                  <button
                    onClick={handleBookOpen}
                    className="w-full py-3.5 px-6 rounded-full text-xl font-bold text-white shadow-lg bg-gradient-to-r from-teal-400 via-pink-400 to-amber-300 animate-gradient-slow active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    <Sparkles size={22} className="animate-spin" style={{ animationDuration: '4s' }} />
                    <span>{currentLanguage === 'en' ? 'Open Story' : 'Buch öffnen'}</span>
                  </button>
                </div>
              ) : isBackCover ? (
                // Mobile Back Cover
                <div className="w-full h-full max-h-[82vh] bg-white rounded-3xl shadow-2xl p-6 flex flex-col items-center justify-between border-4 border-teal-200/80 animate-book-open">
                  <div className="text-center pt-2">
                    <h2 className="text-4xl sm:text-5xl font-updock text-pink-600">
                      {currentLanguage === 'en' ? 'The End' : 'Ende'}
                    </h2>
                  </div>

                  <div className="w-full flex-1 my-4 overflow-hidden rounded-2xl shadow-md flex items-center justify-center bg-pink-50">
                    <img 
                      src={resolveAsset(currentPageData.image)} 
                      alt="Story Ending"
                      className="w-full h-full object-contain rounded-2xl"
                    />
                  </div>

                  <button
                    onClick={handleReadAgain}
                    className="w-full py-3.5 px-6 rounded-full text-xl font-bold text-white shadow-lg bg-gradient-to-r from-pink-400 via-teal-400 to-amber-300 animate-gradient-slow active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={20} />
                    <span>{currentLanguage === 'en' ? 'Read Again' : 'Nochmal lesen'}</span>
                  </button>
                </div>
              ) : (
                // Mobile Story Page (Stacked Card View)
                <div className="w-full h-full max-h-[84vh] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-pink-200/60 animate-book-open">
                  {/* Top: Illustration */}
                  <div className="h-[46%] w-full relative bg-gradient-to-b from-teal-50 to-pink-50 p-2 flex items-center justify-center overflow-hidden border-b border-pink-100">
                    <img 
                      src={resolveAsset(currentPageData.image)} 
                      alt={`Illustration page ${currentPage}`}
                      className="w-full h-full object-contain rounded-xl shadow-sm"
                    />
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-gray-600 shadow">
                      {currentPage} / {totalPageCount - 1}
                    </div>
                  </div>

                  {/* Bottom: Readable Story Text Card */}
                  <div className="flex-1 p-4 sm:p-5 overflow-y-auto story-scroll flex flex-col justify-between bg-white">
                    <p className={`font-patrick-hand text-gray-800 leading-relaxed ${
                      isLargeText ? 'text-2xl sm:text-3xl leading-snug' : 'text-xl sm:text-2xl leading-relaxed'
                    }`}>
                      {currentPageData.text}
                    </p>

                    {/* Small In-page replay narration hint */}
                    {isNarrationEnabled && (
                      <div className="pt-3 flex items-center justify-between border-t border-gray-100 mt-2 text-xs text-gray-500">
                        <button
                          onClick={() => playNarration(currentPage)}
                          className="flex items-center gap-1.5 text-pink-600 hover:text-pink-700 font-medium active:scale-95"
                        >
                          <Volume2 size={16} />
                          <span>{currentLanguage === 'en' ? 'Replay Voice' : 'Nochmal anhören'}</span>
                        </button>
                        <span className="italic text-gray-400">
                          {currentLanguage === 'en' ? 'Swipe left/right to turn' : 'Wischen zum Blättern'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ============================================================== */}
            {/* 2. TABLET & DESKTOP TWO-PAGE SPREAD VIEW (>= 768px)            */}
            {/* ============================================================== */}
            <div 
              className={`hidden md:flex transition-all duration-700 ease-in-out transform-gpu perspective-1000 ${
                isTransitioning ? 'scale-[0.98] opacity-85' : 'scale-100 opacity-100'
              } ${
                isCover || isBackCover 
                  ? 'w-[520px] lg:w-[580px] h-[78vh] max-h-[720px]' 
                  : 'w-[96vw] max-w-[1180px] h-[82vh] max-h-[720px]'
              }`}
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full h-full relative overflow-hidden border border-amber-200/50 flex">
                {isCover ? (
                  // Desktop Front Cover
                  <div className="w-full h-full relative p-8 flex flex-col items-center justify-between bg-gradient-to-br from-teal-50 via-white to-pink-50">
                    {/* Spine Effect */}
                    <div className="absolute left-0 top-0 w-8 h-full bg-gradient-to-r from-gray-400/40 via-gray-200/20 to-transparent" />
                    
                    <div className="text-center pt-4 z-10">
                      <h1 className="text-5xl lg:text-6xl font-updock text-teal-900 tracking-wide drop-shadow-sm">
                        {currentPageData.text}
                      </h1>
                    </div>

                    <div className="relative w-full max-w-[400px] flex-1 my-4 flex items-center justify-center">
                      <img 
                        src={resolveAsset(currentPageData.image)} 
                        alt="Snowy the Tiny Dinosaur Cover"
                        className="max-w-full max-h-full object-contain rounded-2xl shadow-lg ring-4 ring-pink-100"
                      />
                    </div>

                    <button
                      onClick={handleBookOpen}
                      className="group relative rounded-full px-12 py-4 text-2xl font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 bg-gradient-to-r from-teal-400 via-pink-400 to-amber-300 animate-gradient-slow"
                    >
                      <span>{currentLanguage === 'en' ? 'Begin the Story' : 'Geschichte beginnen'}</span>
                    </button>
                  </div>
                ) : isBackCover ? (
                  // Desktop Back Cover
                  <div className="w-full h-full relative p-8 flex flex-col items-center justify-between bg-gradient-to-br from-pink-50 via-white to-teal-50">
                    {/* Spine Effect */}
                    <div className="absolute right-0 top-0 w-8 h-full bg-gradient-to-l from-gray-400/40 via-gray-200/20 to-transparent" />
                    
                    <div className="text-center pt-4 z-10">
                      <h2 className="text-5xl lg:text-6xl font-updock text-pink-600">
                        {currentLanguage === 'en' ? 'The End' : 'Das Ende'}
                      </h2>
                    </div>

                    <div className="relative w-full max-w-[400px] flex-1 my-4 flex items-center justify-center">
                      <img 
                        src={resolveAsset(currentPageData.image)} 
                        alt="Back Cover"
                        className="max-w-full max-h-full object-contain rounded-2xl shadow-lg ring-4 ring-teal-100"
                      />
                    </div>

                    <button
                      onClick={handleReadAgain}
                      className="group relative rounded-full px-10 py-3.5 text-xl font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 bg-gradient-to-r from-pink-400 via-teal-400 to-amber-300 animate-gradient-slow flex items-center gap-2"
                    >
                      <RotateCcw size={22} />
                      <span>{currentLanguage === 'en' ? 'Read Again' : 'Nochmal von vorn'}</span>
                    </button>
                  </div>
                ) : (
                  // Desktop Two-Page Spread
                  <div className="w-full h-full flex relative">
                    {/* Left Page: Illustration */}
                    <div className="w-1/2 h-full p-6 lg:p-8 flex items-center justify-center relative bg-gradient-to-r from-teal-50/70 via-pink-50/50 to-white">
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img 
                          src={resolveAsset(currentPageData.image)} 
                          alt={`Illustration page ${currentPage}`}
                          className="max-w-full max-h-full object-contain rounded-xl shadow-lg ring-1 ring-black/5"
                        />
                      </div>
                      {/* Left Page Edge Shadow */}
                      <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-black/10 to-transparent pointer-events-none" />
                    </div>

                    {/* Book Center Binding / Spine Crease */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-8 -ml-4 bg-gradient-to-r from-black/15 via-black/5 to-black/15 pointer-events-none z-10 shadow-inner" />

                    {/* Right Page: Text */}
                    <div className="w-1/2 h-full p-6 lg:p-10 flex flex-col justify-between relative bg-gradient-to-l from-amber-50/60 via-pink-50/40 to-white">
                      {/* Right Page Center Shadow */}
                      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />

                      {/* Header with Page Number */}
                      <div className="flex justify-between items-center text-gray-400 text-sm font-semibold tracking-wider">
                        <span className="font-updock text-2xl text-teal-700">Snowy</span>
                        <span>{currentPage} / {totalPageCount - 1}</span>
                      </div>

                      {/* Main Paragraph */}
                      <div className="my-auto overflow-y-auto story-scroll pr-2 py-4">
                        <p className={`font-patrick-hand text-gray-800 leading-relaxed ${
                          isLargeText ? 'text-2xl lg:text-3xl' : 'text-xl lg:text-2xl'
                        }`}>
                          {currentPageData.text}
                        </p>
                      </div>

                      {/* Footer Actions on Right Page */}
                      <div className="pt-3 border-t border-amber-200/50 flex justify-between items-center text-xs text-gray-500">
                        {isNarrationEnabled ? (
                          <button
                            onClick={() => playNarration(currentPage)}
                            className="flex items-center gap-1.5 text-pink-600 hover:text-pink-700 font-medium active:scale-95 transition-transform"
                          >
                            <Volume2 size={16} />
                            <span>{currentLanguage === 'en' ? 'Replay Narration' : 'Nochmal anhören'}</span>
                          </button>
                        ) : (
                          <span />
                        )}
                        <span className="italic text-gray-400">
                          {currentLanguage === 'en' ? 'Use arrow keys or click arrows' : 'Pfeiltasten oder Klick'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Bottom Floating Navigation (Visible when not on cover) */}
          {currentPage > 0 && (
            <nav className="fixed bottom-3 sm:bottom-5 left-1/2 transform -translate-x-1/2 z-30 safe-bottom flex items-center gap-2 sm:gap-4 bg-white/90 hover:bg-white backdrop-blur-md px-3 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-2xl border border-white/60 transition-all duration-300">
              <button
                onClick={() => navigatePage('prev')}
                disabled={currentPage === 0 || isTransitioning}
                aria-label="Previous page"
                className="p-2 sm:p-2.5 rounded-full hover:bg-pink-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-700 hover:text-pink-600 transition-all active:scale-90"
              >
                <ChevronLeft size={22} className="sm:w-6 sm:h-6" />
              </button>
              
              <span className="text-sm sm:text-base font-semibold text-gray-700 px-1 sm:px-2 tracking-wide font-sans">
                {currentPage} / {totalPageCount}
              </span>
              
              <button
                onClick={() => navigatePage('next')}
                disabled={currentPage === totalPageCount || isTransitioning}
                aria-label="Next page"
                className={`p-2 sm:p-2.5 rounded-full transition-all active:scale-90 ${
                  showNextHint 
                    ? 'bg-pink-500 text-white animate-next-glow ring-4 ring-pink-300/60' 
                    : 'hover:bg-pink-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-700 hover:text-pink-600'
                }`}
              >
                <ChevronRight size={22} className="sm:w-6 sm:h-6" />
              </button>
            </nav>
          )}

          {/* Reading Progress Bar along bottom edge */}
          <div className="fixed bottom-0 left-0 right-0 h-1 sm:h-1.5 bg-black/15 z-20">
            <div 
              className="h-full bg-gradient-to-r from-teal-400 via-pink-400 to-amber-400 transition-all duration-300 rounded-r shadow-sm"
              style={{ width: `${(currentPage / totalPageCount) * 100}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default InteractiveBook;