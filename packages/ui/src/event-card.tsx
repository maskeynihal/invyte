"use client";

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  coverImage: string;
  vibe: string;
  attendeeCount: number;
  attendeeAvatars: string[];
  category: string;
  onClick?: (id: string) => void;
}

export const EventCard = ({
  id,
  title,
  date,
  time,
  location,
  coverImage,
  vibe,
  attendeeCount,
  attendeeAvatars,
  category,
  onClick,
}: Readonly<EventCardProps>) => {
  return (
    <div
      className="glass-card rounded-2xl border border-outline-variant/15 overflow-hidden cursor-pointer group hover:border-primary/30 transition-all duration-300 active:scale-[0.98]"
      onClick={() => onClick?.(id)}
      role="button"
      tabIndex={0}
    >
      {/* Cover Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={coverImage}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
        {/* Vibe Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider backdrop-blur-sm border border-primary/20">
            {vibe}
          </span>
        </div>
        {/* Category */}
        <div className="absolute top-3 right-3">
          <span className="text-xs">{category}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-headline text-lg font-bold text-on-surface leading-tight">{title}</h3>

        <div className="flex items-center gap-2 text-on-surface-variant text-sm">
          <span className="material-symbols-outlined text-secondary text-sm">calendar_today</span>
          <span className="font-medium">{date}</span>
          <span className="text-outline">•</span>
          <span>{time}</span>
        </div>

        <div className="flex items-center gap-2 text-on-surface-variant text-sm">
          <span className="material-symbols-outlined text-tertiary text-sm">location_on</span>
          <span className="truncate">{location}</span>
        </div>

        {/* Attendees */}
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
          <div className="flex items-center -space-x-2">
            {attendeeAvatars.slice(0, 3).map((avatar, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full overflow-hidden border-2 border-background"
              >
                <img src={avatar} alt="Attendee" className="w-full h-full object-cover" />
              </div>
            ))}
            {attendeeCount > 3 && (
              <div className="w-7 h-7 rounded-full bg-surface-container-high border-2 border-background flex items-center justify-center">
                <span className="text-[9px] font-bold text-on-surface-variant">
                  +{attendeeCount - 3}
                </span>
              </div>
            )}
          </div>
          <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">
            {attendeeCount} Going
          </span>
        </div>
      </div>
    </div>
  );
};
