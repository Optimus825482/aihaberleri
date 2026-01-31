"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface LogoProps {
  variant?: "primary" | "secondary" | "icon";
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  href?: string;
  priority?: boolean;
}

const iconSizeMap = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
};

const textSizeMap = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
};

export function Logo({
  variant = "primary",
  size = "md",
  showText = true,
  className = "",
  href = "/",
  priority = false,
}: LogoProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Hydration mismatch'i önlemek için
  useEffect(() => {
    setMounted(true);
  }, []);

  // Icon boyutu
  const iconSize = iconSizeMap[size];
  const textSize = textSizeMap[size];

  // Logo source - Always use the main dark logo
  // We will handle dark mode visibility using CSS filters
  const logoSrc = "/logos/brand/ai-logo-dark.png";

  const logoContent = (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <Image
          src={logoSrc}
          alt="AI Haberleri Logo"
          width={iconSize}
          height={iconSize}
          className={`object-contain transition-all duration-300 dark:invert`} // Invert colors in dark mode
          priority={priority}
        />
      </div>
      {showText && (
        <span
          className={`font-bold ${textSize} bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}
        >
          AI Haberleri
        </span>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="inline-block" aria-label="AI Haberleri Ana Sayfa">
      {logoContent}
    </Link>
  ) : (
    logoContent
  );
}
