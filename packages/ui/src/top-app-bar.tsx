import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

interface TopAppBarProps {
  onNotificationClick?: () => void;
}

export const TopAppBar = ({ onNotificationClick }: Readonly<TopAppBarProps>) => {
  return (
    <header className="fixed top-0 w-full z-50 glass-header flex justify-between items-center px-6 h-16 shadow-header">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-headline font-black tracking-tighter uppercase text-2xl italic gradient-text">
          Invyte
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Show when="signed-out">
          <SignInButton>
            <button className="px-3 py-2 rounded-full border border-outline-variant/15 bg-surface-container-high text-xs font-label font-bold uppercase tracking-wider text-on-surface active:scale-95 transition-all">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton>
            <button className="px-3 py-2 rounded-full bg-primary/20 border border-primary/20 text-xs font-label font-bold uppercase tracking-wider text-primary active:scale-95 transition-all">
              Sign Up
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <button
            className="text-primary hover:opacity-80 transition-opacity active:scale-95 duration-200"
            onClick={onNotificationClick}
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox:
                  "w-8 h-8 rounded-full border border-outline-variant/15",
              },
            }}
          />
        </Show>
      </div>
    </header>
  );
};
