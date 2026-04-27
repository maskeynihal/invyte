"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const LOCAL_STORAGE_KEY = "invyte-install-prompt-dismissed";

export default function InstallPrompt() {
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
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
    setIsDismissed(localStorage.getItem(LOCAL_STORAGE_KEY) === "true");

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!isMobile || isStandalone || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
      localStorage.setItem(LOCAL_STORAGE_KEY, "true");
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    setIsDismissed(true);
  };

  return (
    <div className="glass-card rounded-2xl p-4 border border-outline-variant/20 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-headline text-base font-bold text-on-surface">
            Install App
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Add Invyte to your home screen for a faster, app-like experience.
          </p>
        </div>

        <button
          className="rounded-full p-2 text-on-surface-variant hover:bg-surface-variant/40"
          onClick={handleDismiss}
          type="button"
          aria-label="Dismiss install prompt"
        >
          ✕
        </button>
      </div>

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
