"use client";

type RsvpStatus = "going" | "maybe" | "not-going" | null;

interface RsvpButtonProps {
  status: RsvpStatus;
  onSelect: (status: RsvpStatus) => void;
  disabled?: boolean;
}

const options: {
  value: RsvpStatus;
  label: string;
  emoji: string;
  icon: string;
  activeClass: string;
}[] = [
  {
    value: "going",
    label: "Going",
    emoji: "🎉",
    icon: "check_circle",
    activeClass: "bg-primary/20 text-primary border-primary/40 shadow-neon-purple",
  },
  {
    value: "maybe",
    label: "Maybe",
    emoji: "🤔",
    icon: "help",
    activeClass: "bg-secondary/20 text-secondary border-secondary/40 shadow-neon-cyan",
  },
  {
    value: "not-going",
    label: "Can't Go",
    emoji: "😢",
    icon: "cancel",
    activeClass: "bg-error/20 text-error border-error/40",
  },
];

export const RsvpButton = ({
  status,
  onSelect,
  disabled = false,
}: Readonly<RsvpButtonProps>) => {
  return (
    <div className="flex gap-3">
      {options.map((option) => {
        const isActive = status === option.value;
        return (
          <button
            key={option.value}
            disabled={disabled}
            onClick={() => onSelect(isActive ? null : option.value)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-2xl border font-label font-bold text-xs uppercase tracking-wider transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive
                ? option.activeClass
                : "border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/40"
            }`}
          >
            <span
              className="material-symbols-outlined text-base"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {option.icon}
            </span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
