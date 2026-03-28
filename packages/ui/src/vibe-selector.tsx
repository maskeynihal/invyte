"use client";

interface VibeOption {
  id: string;
  name: string;
  image: string;
}

interface VibeSelectorProps {
  vibes: VibeOption[];
  selectedVibe?: string;
  onSelect: (vibeId: string) => void;
}

export const VibeSelector = ({ vibes, selectedVibe, onSelect }: Readonly<VibeSelectorProps>) => {
  return (
    <div className="space-y-4">
      <label className="label-text">Choose the Vibe</label>
      <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar -mx-6 px-6">
        {vibes.map((vibe) => {
          const isSelected = selectedVibe === vibe.id;
          return (
            <div
              key={vibe.id}
              className="flex-shrink-0 w-32 group cursor-pointer"
              onClick={() => onSelect(vibe.id)}
              role="button"
              tabIndex={0}
            >
              <div
                className={`h-40 rounded-2xl overflow-hidden relative transition-all duration-300 ${
                  isSelected
                    ? "border-2 border-primary shadow-neon-purple"
                    : "border border-outline-variant/20 hover:border-secondary"
                }`}
              >
                <img
                  src={vibe.image}
                  alt={vibe.name}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    isSelected ? "" : "grayscale group-hover:grayscale-0"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-3 left-3 right-3 text-center">
                  <span
                    className={`text-[10px] font-black uppercase tracking-tighter ${
                      isSelected ? "text-on-surface" : "text-on-surface-variant"
                    }`}
                  >
                    {vibe.name}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary text-on-primary rounded-full p-1">
                    <span
                      className="material-symbols-outlined text-xs"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
