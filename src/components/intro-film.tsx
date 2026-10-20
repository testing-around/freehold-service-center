import { useEffect, useRef, useState } from "react";
import { SHOP } from "@/data/shop";

export function IntroFilm({ onEnter }: { onEnter: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const enterRef = useRef(onEnter);
  const [failed, setFailed] = useState(false);
  enterRef.current = onEnter;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || failed) return;
    video.muted = true;
    const play = video.play();
    if (play) play.catch(() => setFailed(true));
  }, [failed]);

  useEffect(() => {
    const timer = window.setTimeout(() => enterRef.current(), failed ? 4000 : 20000);
    return () => window.clearTimeout(timer);
  }, [failed]);

  return (
    <div className="fixed inset-0 z-50 bg-bg" role="dialog" aria-label="Shop intro">
      {failed ? (
        <img
          src="/media/hero.jpg"
          alt="Silver coupe on a lift with the hood and door open in a night bay"
          className="photo-lift absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <video
          ref={videoRef}
          className="photo-lift absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          playsInline
          poster="/media/hero.jpg"
          aria-label="Cars in the bay. Panels pop out and go back in. A mechanic slides under. The engine lifts out and drops back."
          onEnded={onEnter}
          onError={() => setFailed(true)}
        >
          <source src="/media/intro.mp4" type="video/mp4" />
        </video>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/15 via-transparent to-bg/50" />
      <div className="relative flex h-full flex-col justify-between p-4 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <p className="display rounded-md bg-bg px-3 py-2 text-3xl text-fg sm:text-4xl">
            {SHOP.name}
            <span className="mt-1 block text-lg text-primary sm:text-xl">East Main</span>
          </p>
          <button
            type="button"
            onClick={onEnter}
            className="min-h-11 shrink-0 rounded-full border border-line bg-bg px-4 text-sm font-semibold text-fg"
          >
            Skip
          </button>
        </div>
        <div className="w-full max-w-xl rounded-lg bg-bg px-5 py-5 sm:px-6">
          <p className="display text-5xl text-fg sm:text-7xl">
            Support local.
            <span className="block text-primary">Drive local.</span>
          </p>
          <p className="mt-3 text-lg font-semibold text-fg">
            Your Car Breaks. We Fix It. Simple as That.
          </p>
          <p className="mt-2 max-w-md text-base text-muted">
            Proudly serving Freehold, NJ, and our surrounding communities.
          </p>
        </div>
      </div>
    </div>
  );
}