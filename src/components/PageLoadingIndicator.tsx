"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Global page loading indicator component
 * Shows a top progress bar and optional overlay when navigating between pages
 */
export function PageLoadingIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Reset loading state when route changes complete
  useEffect(() => {
    setIsLoading(false);
    setProgress(100);
    
    const timeout = setTimeout(() => {
      setProgress(0);
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  // Global click handler for links and buttons
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      const button = target.closest('button');
      
      // Check if it's an internal navigation link
      if (link) {
        const href = link.getAttribute('href');
        // Only show loading for internal links (not external, anchors, or javascript)
        if (
          href && 
          !href.startsWith('#') && 
          !href.startsWith('http') && 
          !href.startsWith('mailto:') && 
          !href.startsWith('tel:') &&
          !href.startsWith('javascript:') &&
          !link.hasAttribute('download') &&
          link.target !== '_blank'
        ) {
          startLoading();
        }
      }
      
      // For buttons with data-loading attribute or form submit buttons
      if (button) {
        const hasLoadingAttr = button.hasAttribute('data-loading');
        const isSubmit = button.type === 'submit';
        if (hasLoadingAttr || isSubmit) {
          startLoading();
        }
      }
    };

    const startLoading = () => {
      setIsLoading(true);
      setProgress(0);
      
      // Simulate progress
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress > 90) {
          currentProgress = 90;
          clearInterval(interval);
        }
        setProgress(currentProgress);
      }, 100);

      // Auto-stop after 10 seconds (fallback)
      setTimeout(() => {
        setIsLoading(false);
        setProgress(100);
        clearInterval(interval);
      }, 10000);
    };

    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  if (!isLoading && progress === 0) return null;

  return (
    <>
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent">
        <div 
          className="h-full bg-gradient-to-r from-ai-primary via-blue-400 to-ai-primary transition-all duration-300 ease-out shadow-lg shadow-ai-primary/50"
          style={{ 
            width: `${progress}%`,
            opacity: progress === 100 ? 0 : 1,
          }}
        />
        {/* Glow effect */}
        {isLoading && (
          <div 
            className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-white/50 to-transparent animate-pulse"
            style={{ transform: `translateX(${progress}%)` }}
          />
        )}
      </div>

      {/* Optional: Full page overlay for heavy loading */}
      {isLoading && (
        <div className="fixed inset-0 z-[9998] pointer-events-none">
          {/* Subtle background dim */}
          <div className="absolute inset-0 bg-ai-background-dark/10 backdrop-blur-[1px] transition-opacity duration-300" />
          
          {/* Center spinner (optional - commented out for subtlety) */}
          {/* 
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-12 h-12 border-4 border-ai-primary/30 border-t-ai-primary rounded-full animate-spin" />
          </div>
          */}
        </div>
      )}
    </>
  );
}

/**
 * Loading spinner component for inline use
 */
export function LoadingSpinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className={`${sizeClasses[size]} border-ai-primary/30 border-t-ai-primary rounded-full animate-spin ${className}`} />
  );
}

/**
 * Button with built-in loading state
 */
export function LoadingButton({ 
  children, 
  isLoading = false, 
  disabled = false,
  className = "",
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }) {
  return (
    <button 
      className={`relative inline-flex items-center justify-center gap-2 transition-all ${className}`}
      disabled={disabled || isLoading}
      data-loading={isLoading ? "true" : undefined}
      {...props}
    >
      {isLoading && (
        <LoadingSpinner size="sm" className="absolute" />
      )}
      <span className={isLoading ? "opacity-0" : "opacity-100"}>
        {children}
      </span>
    </button>
  );
}
