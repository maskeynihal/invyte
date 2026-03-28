"use client";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

interface BottomNavBarProps {
  activeTab: string;
  onNavigate: (href: string) => void;
}

const navItems: NavItem[] = [
  { id: "discover", label: "Discover", icon: "explore", href: "/" },
  { id: "feed", label: "Feed", icon: "dynamic_feed", href: "/feed" },
  { id: "create", label: "Plan", icon: "add_circle", href: "/create" },
  { id: "profile", label: "Profile", icon: "person", href: "/profile" },
];

export const BottomNavBar = ({
  activeTab,
  onNavigate,
}: Readonly<BottomNavBarProps>) => {
  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 glass-nav rounded-t-[24px] z-50 shadow-nav">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <a
            key={item.id}
            onClick={() => onNavigate(item.href)}
            href={item.href}
            className={`flex flex-col items-center justify-center px-4 py-2 transition-all active:scale-90 duration-300 ease-out rounded-2xl ${
              isActive
                ? "bg-primary/20 text-primary"
                : "text-slate-500 hover:text-secondary"
            }`}
            aria-label={item.label}
          >
            <span
              className="material-symbols-outlined mb-1"
              style={
                isActive ? { fontVariationSettings: "'FILL' 1" } : undefined
              }
            >
              {item.icon}
            </span>
            <span className="font-label text-[10px] font-bold uppercase tracking-widest">
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
};
