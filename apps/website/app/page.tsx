import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001").replace(
    /\/$/,
    "",
  );
  const createEventUrl = `${appBaseUrl}/create`;
  const discoverEventsUrl = `${appBaseUrl}/`;

  return (
    <main className="min-h-screen selection:bg-primary selection:text-on-primary font-body">
      {/* TopAppBar */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 bg-black/80 dark:bg-[#0e0e0e]/80 backdrop-blur-xl shadow-[0_20px_40px_-10px_rgba(160,32,240,0.15)]">
        <div className="flex justify-between items-center max-w-[1440px] mx-auto w-full">
          <div className="text-2xl font-black italic tracking-tighter text-[#de8eff] font-headline cursor-pointer transition-transform hover:scale-105 active:scale-95">
            Invyte
          </div>
          <div className="hidden md:flex items-center space-x-8 font-headline font-bold tracking-tight">
            <Link href="/" className="text-[#de8eff] font-bold border-b-2 border-[#de8eff] pb-1 transition-all duration-300">
              Home
            </Link>
            <Link href="#features" className="text-gray-400 dark:text-[#adaaaa] hover:text-white transition-colors cursor-pointer transition-transform hover:scale-105 active:scale-95">
              Features
            </Link>
            <Link href="#discover" className="text-gray-400 dark:text-[#adaaaa] hover:text-white transition-colors cursor-pointer transition-transform hover:scale-105 active:scale-95">
              Discover
            </Link>
          </div>
          <Link
            href={createEventUrl}
            className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2 rounded-full font-headline font-bold text-sm tracking-tight hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-primary/20"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full -mr-64 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 blur-[120px] rounded-full -ml-32 -mb-32"></div>
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8 z-10">
            <div className="inline-flex items-center space-x-2 bg-surface-container-highest px-4 py-2 rounded-full border border-outline-variant/20">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
              <span className="text-xs font-label font-bold uppercase tracking-widest text-on-surface-variant">
                Live in 12 Cities
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-headline font-black tracking-tighter leading-[0.9] text-on-surface">
              The <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary-fixed">Neon Pulse</span> of Social Planning.
            </h1>
            <p className="text-xl md:text-2xl text-on-surface-variant max-w-2xl leading-relaxed">
              Replace chaotic group chats with vibrant event vibes. Create, RSVP, and share memories—all in one place.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href={createEventUrl}
                className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-4 rounded-full font-headline font-bold text-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-primary/30"
              >
                Create Your First Event
              </Link>
              <Link
                href={discoverEventsUrl}
                className="bg-transparent border border-outline-variant/30 text-on-surface px-8 py-4 rounded-full font-headline font-bold text-lg hover:bg-surface-container-highest transition-all duration-300"
              >
                Discover Events Nearby
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 relative z-10">
            <div className="relative h-[600px] rounded-xl overflow-hidden shadow-2xl shadow-black">
              <Image
                alt="Vibrant rooftop party under neon lights"
                className="object-cover scale-105"
                fill
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPmIaxta-kQSRa6p324qzgn_e6c_U_0-n5AM0lRRqssa23f3Ty-lWhlp56qyHQnTYVKoSpGXQbR5-khrsY1IKW2JQPIGldR85VNqq3XimqGv8MfSBpWuwzVLPe2iW7NGHK7yE-myY1VXoi2wiUQv3gQy2kjBktguPYdPj8kJCTMcSXh_zqYqXzJvMAU4coehJXGkKOZV6WDYdgvnoxc9-22_5H7SqG-6RlxkCSteJUCLu-SV1M9oQ1Y_4qkWLeXgJ3DjRIjJJQplbk"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
              {/* Floating UI Card */}
              <div className="absolute bottom-8 left-8 right-8 glass-panel p-6 rounded-lg border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-headline font-bold text-lg">Invyte Rooftop Sessions</h3>
                    <p className="text-sm text-on-surface-variant">Starts in 2 hours • Downtown</p>
                  </div>
                  <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Social Proof */}
      <section className="py-12 bg-surface-container-low border-y border-outline-variant/10">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 opacity-70">
            <h2 className="font-headline font-extrabold text-2xl tracking-tighter whitespace-nowrap">
              Join 50,000+ vibing event-goers.
            </h2>
            <div className="flex flex-wrap justify-center gap-12 items-center grayscale invert brightness-0 contrast-200">
              <span className="font-headline text-2xl font-black">NYX_CLUB</span>
              <span className="font-headline text-2xl font-black">URBAN_VIBE</span>
              <span className="font-headline text-2xl font-black">NEON_FEST</span>
              <span className="font-headline text-2xl font-black">CITY_BEATS</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="py-24 px-6 max-w-[1440px] mx-auto">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-4xl md:text-5xl font-headline font-black tracking-tight">Everything You Need. <span className="text-tertiary">Zero Drag.</span></h2>
          <p className="text-on-surface-variant text-lg max-w-xl mx-auto">Skip the logistical nightmare and get straight to the vibe.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full md:h-[800px]">
          <div className="md:col-span-8 bg-surface-container-low rounded-lg p-10 flex flex-col justify-between overflow-hidden relative group">
            <div className="z-10 max-w-md">
              <h3 className="text-3xl font-headline font-black mb-4">No Friction RSVP</h3>
              <p className="text-on-surface-variant leading-relaxed">Guests don&apos;t need to download the app or create an account to say &apos;Yes&apos;. Send a link, get the count, start the party.</p>
            </div>
            <div className="mt-12 flex items-end gap-4 z-10">
              <div className="bg-surface-container-highest p-4 rounded-md w-full border border-outline-variant/10">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold">RSVP Status</span>
                  <span className="text-tertiary font-bold">82% Full</span>
                </div>
                <div className="w-full h-4 bg-surface-variant rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-secondary to-tertiary w-[82%]"></div>
                </div>
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary/10 blur-[80px] rounded-full group-hover:bg-primary/20 transition-all duration-500"></div>
          </div>

          <div className="md:col-span-4 bg-surface-container-highest rounded-lg p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center mb-8">
              <span className="text-on-secondary-container text-3xl">✨</span>
            </div>
            <h3 className="text-2xl font-headline font-black mb-4">Deeper Social</h3>
            <p className="text-on-surface-variant leading-relaxed mb-8">Live event feeds, instant reactions, and automatic shared photo albums for the morning after.</p>
          </div>

          <div className="md:col-span-4 bg-surface-container-highest rounded-lg p-10 flex flex-col justify-end relative overflow-hidden">
            <div className="absolute top-0 left-0 p-8">
              <span className="text-tertiary text-4xl">☑️</span>
            </div>
            <h3 className="text-2xl font-headline font-black mb-4">Pro Planning Tools</h3>
            <p className="text-on-surface-variant leading-relaxed">Collaborative &apos;what to bring&apos; lists and built-in budget trackers for serious hosts.</p>
          </div>

          <div className="md:col-span-8 bg-surface-container-low rounded-lg p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center border border-primary/5">
            <div className="space-y-4">
              <h3 className="text-3xl font-headline font-black">Casual Hangout Mode</h3>
              <p className="text-on-surface-variant leading-relaxed">The unique &apos;drop-in&apos; feature for spontaneous meetups. No plan? No problem. Just drop a pin.</p>
              <div className="pt-4">
                <Link href={discoverEventsUrl} className="text-tertiary font-bold uppercase tracking-widest text-sm hover:underline">
                  See how it works →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 overflow-hidden relative">
        <div className="max-w-4xl mx-auto text-center space-y-12 relative z-10">
          <h2 className="text-6xl md:text-8xl font-headline font-black tracking-tighter leading-none">Ready to <span className="text-primary">Pulse?</span></h2>
          <p className="text-2xl text-on-surface-variant">Join the next generation of social planners and event-goers.</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Link
              href={createEventUrl}
              className="w-full md:w-auto bg-primary text-on-primary px-12 py-6 rounded-full font-headline font-black text-2xl hover:bg-primary-container transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary/40"
            >
              Create Your First Event
            </Link>
          </div>
        </div>
      </section>

      <footer className="w-full py-12 px-8 bg-[#131313] mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-[1440px] mx-auto">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="text-lg font-black text-[#de8eff] font-headline">Invyte</div>
            <p className="text-sm uppercase tracking-widest text-[#adaaaa] text-center md:text-left">
              © 2024 Invyte. The Neon Pulse of Events.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
