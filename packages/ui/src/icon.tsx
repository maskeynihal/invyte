"use client";

import { ReactNode } from "react";

interface IconProps {
  name: string;
  filled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
};

export const Icon = ({ name, filled = false, className = "", size = "md" }: Readonly<IconProps>) => {
  return (
    <span
      className={`material-symbols-outlined ${sizeMap[size]} ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
};

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GlassCard = ({ children, className = "", onClick }: Readonly<GlassCardProps>) => {
  return (
    <div
      className={`glass-card rounded-2xl border border-outline-variant/15 ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};
