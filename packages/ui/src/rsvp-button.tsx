"use client";

type RsvpStatus = "going" | "maybe" | "not-going" | null;

interface RsvpButtonProps {
  status: RsvpStatus;
  onSelect: (status: RsvpStatus) => void;
}

const options: { value: RsvpStatus; label: string; icon: string; activeClass: string }[] = [
  {
    value: "going",
    label: "Going",
    icon: "check_circle",
    activeClass: "bg-primary/20 text-primary border-primary/40 shadow-neon-purple",
  },
  {
    value: "maybe",
    label: "Maybe",
    icon: "help",
    activeClass: "bg-secondary/20 text-secondary border-secondary/40 shadow-neon-cyan",
  },
  {
    value: "not-going",
    label: "Can't Go",
    icon: "cancel",
    activeClass: "bg-error/20 text-error border-error/40",
  },
];

export const RsvpButton = ({ status, onSelect }: Readonly<RsvpButtonProps>) => {
  return (
    <div className="flex gap-3">
      {options.map((option) => {
        const isActive = status === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onSelect(isActive ? null : option.value)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border font-label font-bold text-sm uppercase tracking-wider transition-all duration-300 active:scale-95 ${
              isActive
                ? option.activeClass
                : "border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/40"
            }`}
          >
            <span
              className="material-symbols-outlined text-sm"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {option.icon}
            </span>
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
