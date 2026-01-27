import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface WorkbenchLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const STORAGE_KEY = 'codex-workbench-panel-width';
const DEFAULT_RATIO = 0.4;
const MIN_RATIO = 0.2;
const MAX_RATIO = 0.8;

export function WorkbenchLayout({ children, className }: WorkbenchLayoutProps) {
  const childrenArray = React.Children.toArray(children);
  const leftPanel = childrenArray[0];
  const rightPanel = childrenArray[1];
  const statusBar = childrenArray[2];

  const [leftRatio, setLeftRatio] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.leftRatio === 'number') {
            return Math.max(MIN_RATIO, Math.min(MAX_RATIO, parsed.leftRatio));
          }
        }
      }
    } catch (e) {
      console.error('Failed to load workbench layout settings', e);
    }
    return DEFAULT_RATIO;
  });

  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'left' | 'right'>('left');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ leftRatio }));
    } catch (e) {
      console.error('Failed to save workbench layout settings', e);
    }
  }, [leftRatio]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const relativeX = moveEvent.clientX - containerRect.left;
      
      const newRatio = relativeX / containerWidth;
      const clampedRatio = Math.max(MIN_RATIO, Math.min(MAX_RATIO, newRatio));
      
      setLeftRatio(clampedRatio);
    };

    const onMouseUp = () => {
      resizingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <div className={cn("flex h-screen w-full flex-col bg-[#1a1a1a] text-white overflow-hidden", className)}>
      <div 
        ref={containerRef}
        className="flex-1 flex overflow-hidden relative w-full"
      >
        {isMobile ? (
          <div className="flex flex-col w-full h-full">
            <div className="flex border-b border-zinc-800 bg-zinc-900">
              <button
                onClick={() => setActiveMobileTab('left')}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors",
                  activeMobileTab === 'left' 
                    ? "text-white border-b-2 border-blue-500 bg-zinc-800/50" 
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
                )}
              >
                Left Panel
              </button>
              <button
                onClick={() => setActiveMobileTab('right')}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors",
                  activeMobileTab === 'right' 
                    ? "text-white border-b-2 border-blue-500 bg-zinc-800/50" 
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
                )}
              >
                Right Panel
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden relative">
              <div className={cn("absolute inset-0", activeMobileTab === 'left' ? 'block' : 'hidden')}>
                {leftPanel}
              </div>
              <div className={cn("absolute inset-0", activeMobileTab === 'right' ? 'block' : 'hidden')}>
                {rightPanel}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div 
              style={{ width: `${leftRatio * 100}%` }} 
              className="h-full overflow-hidden relative"
            >
              {leftPanel}
            </div>

            <div
              className={cn(
                "w-1 h-full cursor-col-resize z-50 flex-shrink-0 transition-colors",
                "bg-zinc-800 hover:bg-zinc-500 active:bg-blue-500",
                isResizing && "bg-blue-500"
              )}
              onMouseDown={startResizing}
            />

            <div className="flex-1 h-full overflow-hidden relative">
              {rightPanel}
            </div>
          </>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-900">
        {statusBar}
      </div>
    </div>
  );
}
