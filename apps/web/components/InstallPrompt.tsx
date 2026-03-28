"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallPrompt() {
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIsMobile(
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ),
    );
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as { MSStream?: unknown }).MSStream,
    );
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!isMobile || isStandalone) {
    return null;
  }

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="glass-card rounded-2xl p-4 border border-outline-variant/20 mb-6">
      <h3 className="font-headline text-base font-bold text-on-surface">
        Install App
      </h3>
      <p className="text-xs text-on-surface-variant mt-1">
        Add Invyte to your home screen for a faster, app-like experience.
      </p>

      <button
        className="mt-3 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-label font-bold uppercase tracking-wider active:scale-95 transition-all"
        onClick={handleInstall}
        type="button"
      >
        Add to Home Screen
      </button>

      {!deferredPrompt && (
        <p className="text-xs text-on-surface-variant mt-3">
          Open your browser menu and choose "Install app" or "Add to Home
          Screen".
        </p>
      )}

      {isIOS && (
        <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
          To install on iPhone or iPad, tap the share button{" "}
          <span aria-label="share icon" role="img">
            ⎋
          </span>{" "}
          and choose "Add to Home Screen"{" "}
          <span aria-label="plus icon" role="img">
            ➕
          </span>
          .
        </p>
      )}
    </div>
  );
}
