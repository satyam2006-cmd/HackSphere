import React from "react";

export interface PillNavItem {
  label: string;
  href: string;
}

interface PillNavProps {
  logo?: React.ReactNode;
  logoAlt?: string;
  items: PillNavItem[];
  activeHref: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  theme?: "light" | "dark";
  initialLoadAnimation?: boolean;
  onNavigate?: (href: string) => void;
}

export function PillNav({
  logo,
  logoAlt = "Company Logo",
  items,
  activeHref,
  className = "",
  ease = "ease-out",
  baseColor = "#000000",
  pillColor = "#ffffff",
  hoveredPillTextColor = "#ffffff",
  pillTextColor = "#000000",
  theme = "light",
  initialLoadAnimation = false,
  onNavigate,
}: PillNavProps) {
  const cssEase = ease.includes("power2") ? "cubic-bezier(0.25, 0.46, 0.45, 0.94)" : ease;

  return (
    <nav
      aria-label={logoAlt}
      className={`pill-nav shrink-0 ${initialLoadAnimation ? "pill-nav-enter" : ""} ${className}`}
      style={
        {
          "--pill-base": baseColor,
          "--pill-color": pillColor,
          "--pill-hover-text": hoveredPillTextColor,
          "--pill-text": pillTextColor,
          "--pill-ease": cssEase,
        } as React.CSSProperties
      }
      data-theme={theme}
    >
      {logo && <span className="pill-nav-logo">{logo}</span>}
      <div className="pill-nav-items">
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`pill-nav-item ${active ? "is-active" : ""}`}
              onClick={(event) => {
                if (onNavigate) {
                  event.preventDefault();
                  onNavigate(item.href);
                }
              }}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
