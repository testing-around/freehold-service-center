import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Phone, MapPin } from "lucide-react";
import { AUTO_REPAIR_SERVICE_AREA, CLIPS, SERVICES, SHOP } from "@/data/shop";
import CarBrandMarquee from "@/components/CarBrandMarquee";
import { Booking } from "@/components/booking";
import { IntroFilm } from "@/components/intro-film";
import {
  customerMessage,
  hydrateGarage,
  useGarage,
  whenLabel,
} from "@/lib/garage-store";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  name: "Freehold Service Center",
  alternateName: "Freehold Repair Shop",
  telephone: "+1-732-333-0886",
  email: "Freeholdservicecenter@gmail.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "63 E Main St",
    addressLocality: "Freehold",
    addressRegion: "NJ",
    postalCode: "07728",
    addressCountry: "US",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "08:00",
      closes: "18:00",
    },
  ],
  areaServed: [
    {
      "@type": "City",
      name: "Freehold, NJ",
    },
    ...AUTO_REPAIR_SERVICE_AREA.towns.map((town) => ({
      "@type": "City",
      name: `${town}, NJ`,
    })),
  ],
  url: "https://freeholdrepairshop.com",
  sameAs: [
    "https://www.instagram.com/freeholdservicecenter/",
    "https://www.facebook.com/freehold.service.center",
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Freehold Service Center" },
      {
        name: "description",
        content:
          "Freehold Service Center serves Freehold, NJ and nearby towns within a 15-mile radius, including Marlboro, Manalapan, Colts Neck, Howell, Jackson, and surrounding Monmouth County communities. Call (732) 333-0886.",
      },
    ],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
  }),
  component: Home,
});

function Home() {
  const [intro, setIntro] = useState<"on" | "out" | "off">("on");
  const [onBay, setOnBay] = useState(true);
  const [inBook, setInBook] = useState(false);
  const [inServices, setInServices] = useState(false);
  const requests = useGarage((state) => state.requests);
  const activeId = useGarage((state) => state.activeId);
  const setActive = useGarage((state) => state.setActive);
  const active = requests.find((request) => request.id === activeId) ?? null;

  useEffect(() => {
    hydrateGarage();
    const bay = document.getElementById("bay");
    const book = document.getElementById("book");
    const services = document.querySelector(".service-stack");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target.id === "bay") setOnBay(entry.isIntersecting && entry.intersectionRatio > 0.35);
          if (entry.target.id === "book") setInBook(entry.isIntersecting && entry.intersectionRatio > 0.12);
          if (entry.target === services) setInServices(entry.isIntersecting && entry.intersectionRatio > 0.08);
        }
      },
      { threshold: [0.08, 0.12, 0.35] },
    );
    if (bay) observer.observe(bay);
    if (book) observer.observe(book);
    if (services) observer.observe(services);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const seen = sessionStorage.getItem("frs-intro-local") === "1";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) setIntro("off");
  }, []);

  useEffect(() => {
    if (!active || active.status === "pending") return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const key = `${active.id}:${active.status}:${active.arrivalTime ?? ""}:${active.decidedAt ?? ""}`;
    const previous = sessionStorage.getItem("frs-notified");
    if (previous === key) return;
    sessionStorage.setItem("frs-notified", key);
    const message = customerMessage(active);
    try {
      new Notification(message.title, { body: message.body });
    } catch {
      /* this browser won't raise a system notification */
    }
  }, [active]);

  function enterShop() {
    sessionStorage.setItem("frs-intro-local", "1");
    setIntro("out");
    window.setTimeout(() => setIntro("off"), 900);
  }

  const stageRef = useRef<HTMLElement>(null);
  useStageMotion(stageRef);

  return (
    <div id="top" className="min-h-screen bg-bg text-fg">
      {intro !== "off" ? (
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-1000 ${intro === "out" ? "pointer-events-none opacity-0" : "opacity-100"}`}
        >
          <IntroFilm onEnter={enterShop} />
        </div>
      ) : null}
      <CarBrandMarquee />

      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md">
        <div className="flag-bar" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="#top" className="leading-none">
            <span className="display block text-2xl text-fg">Freehold</span>
            <span className="display block text-base text-primary">Service Center</span>
          </a>
          <a
            href={`tel:${SHOP.phoneTel}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-bg"
          >
            <Phone className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{SHOP.phoneDisplay}</span>
            <span className="sm:hidden">Call</span>
          </a>
        </div>
      </header>

      {active ? <TicketBanner requestId={active.id} /> : null}

      <main ref={stageRef} className="overflow-x-clip pb-28 md:pb-0">
        <section id="bay" className="relative isolate overflow-hidden">

          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -inset-y-[8%] inset-x-0" data-parallax="0.14">
              <BayFilm play={intro !== "on" && onBay} />
            </div>
            <div className="photo-wash absolute inset-0" />
          </div>
          <div className="relative mx-auto flex max-w-6xl items-end px-4 pt-6 pb-24 md:min-h-[78svh] md:py-16 md:pb-32">
            <div className="glass -mt-2 max-w-xl rounded-lg border border-line p-5 sm:p-6">
              <p className="text-sm font-semibold tracking-wide text-primary uppercase">{SHOP.name}</p>
              <h1 className="display mt-2 text-5xl text-fg sm:text-7xl">
                Let’s get your vehicle taken care of.
              </h1>
              <p className="mt-4 text-lg text-fg">
                Tell us about your car, and we’ll help you with the next steps.
              </p>
              <div className="mt-6">
                <a
                  href="#book"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-bg sm:w-auto"
                >
                  Get started
                </a>
              </div>
              <p className="mt-6 text-sm text-muted">
                {SHOP.street} · {SHOP.city}
                <span className="mt-1 block">
                  {SHOP.hours} · {SHOP.closed}
                </span>
                <a href={`tel:${SHOP.phoneTel}`} className="mt-1 inline-block font-semibold whitespace-nowrap text-fg">
                  {SHOP.phoneDisplay}
                </a>
              </p>
            </div>
          </div>
        </section>

        <section id="book" className="relative z-10 -mt-16 scroll-mt-20 bg-gradient-to-b from-transparent via-bg to-surface">
          <div className="mx-auto max-w-xl px-4 pt-2 pb-14">
            <Booking />
          </div>
        </section>

        <section className="relative -mt-6" aria-label="In the bay">
          <div className="mx-auto grid max-w-6xl md:grid-cols-2">
            <BayStill
              src="/media/creeper.jpg"
              alt="Mechanic on his back on a creeper, looking up at the underside of a silver car"
              kicker="Under it"
              title="A quick pass on the creeper."
              speed="0.1"
            />
            <BayStill
              src="/media/engine.jpg"
              alt="Engine hanging right-side up on a hoist, lined up to drop back into the open bay"
              kicker="Engine in and out"
              title="If it has to come out, it comes out."
              speed="0.08"
            />
          </div>
        </section>

        <section className="relative overflow-hidden" aria-label="Shop instruments">
          <div className="pointer-events-none absolute inset-x-0 -top-6 h-64 overflow-hidden" aria-hidden="true">
            <img src="/media/engine.jpg" alt="" className="photo-lift h-full w-full object-cover object-top opacity-45" />
            <div className="absolute inset-0 bg-gradient-to-b from-bg/20 via-bg/75 to-bg" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 py-16">
            <div className="flex items-end justify-between gap-4">
              <div className="reveal max-w-xl" data-reveal>
                <p className="text-sm font-semibold tracking-wide text-primary uppercase">The instruments</p>
                <h2 className="display mt-2 text-5xl sm:text-6xl">Scan tool, impact, lift.</h2>
              </div>
              <a
                href={SHOP.instagram}
                className="hidden min-h-11 shrink-0 items-center text-sm font-semibold text-primary sm:inline-flex"
              >
                @freeholdservicecenter
              </a>
            </div>
            <div className="reveal mt-6 flex snap-x gap-3 overflow-x-auto pb-2" data-reveal>
              {CLIPS.map((clip) => (
                <BayClip key={clip.src} src={clip.src} title={clip.title} copy={clip.copy} />
              ))}
            </div>
            <a href={SHOP.instagram} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary sm:hidden">
              More on @freeholdservicecenter
            </a>
          </div>
        </section>

        <section className="service-stack relative z-10 -mt-16" aria-label="What comes in">
          {SERVICES.map((service, index) => (
            <ServiceBand key={service.title} service={service} index={index} />
          ))}
        </section>

        <section id="visit" className="relative z-20 -mt-20 overflow-hidden">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <img
              src="/media/freehold-service-center.webp"
              alt=""
              data-parallax="0.06"
              data-desktop-only=""
              className="photo-lift photo-zoom absolute inset-0 h-full w-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/70 to-bg" />
          </div>
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
            <div className="reveal" data-reveal>
              <p className="text-sm font-semibold tracking-wide text-primary uppercase">The shop</p>
              <h2 className="display mt-2 text-5xl sm:text-6xl">63 East Main.</h2>
              <p className="mt-3 text-base text-muted">
                Downtown Freehold. {SHOP.legal}. Open {SHOP.hours}. {SHOP.closed}.
              </p>
              <address className="mt-6 text-lg not-italic">
                {SHOP.street}
                <span className="block">{SHOP.city}</span>
              </address>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href={SHOP.maps}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-bg"
                >
                  <MapPin className="size-4" aria-hidden="true" />
                  Open in Maps
                </a>
                <a
                  href={`tel:${SHOP.phoneTel}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line px-5 text-sm font-semibold"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {SHOP.phoneDisplay}
                </a>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
                <a href={SHOP.instagram} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
                  Instagram
                </a>
                <a href={SHOP.facebook} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
                  Facebook
                </a>
                <a href={`mailto:${SHOP.email}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
                  Email
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="bg-gradient-to-b from-transparent to-surface-2/40 pb-24 md:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            <span className="text-fg">{SHOP.name}</span>
            <span className="mt-1 block">
              {SHOP.street}, {SHOP.city} · {SHOP.email}
            </span>
          </p>
        </div>
      </footer>

      <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 p-3 md:hidden ${onBay || inBook || inServices ? "hidden" : ""}`}>
        <div className="mx-auto flex max-w-lg gap-2">
          <a
            href="#book"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-bg"
          >
            Request a callback
          </a>
          <a
            href={`tel:${SHOP.phoneTel}`}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold"
          >
            Call
          </a>
        </div>
      </div>
    </div>
  );
}

function ServiceBand({ service, index }: { service: (typeof SERVICES)[number]; index: number }) {
  const speed = ["0.12", "0.18", "0.1", "0.2", "0.14", "0.16", "0.11", "0.19"][index] ?? "0.14";
  return (
    <article className="service-band relative min-h-[78svh]" style={{ zIndex: index + 1 }}>
      <div className="service-veil pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -inset-y-[16%] inset-x-0" data-parallax={speed}>
          <ServiceFilm film={service.film} still={service.still} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-bg/40 via-transparent to-transparent" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-[78svh] max-w-6xl items-start px-4 pt-[12vh] pb-[18vh]">
        <div className="reveal glass max-w-xl rounded-lg border border-line border-l-4 border-l-primary p-5 sm:p-6" data-reveal>
          {index === 0 ? (
            <>
              <p className="text-sm font-semibold tracking-wide text-accent uppercase">What comes in</p>
              <h2 className="display mt-2 text-5xl text-fg sm:text-6xl">Domestic, import, truck, sports car.</h2>
              <p className="mt-3 text-base text-muted">
                One stop on East Main. Tell the truth about the car and the counter will tell you if they can
                take it.
              </p>
            </>
          ) : null}
          <p className={`display text-4xl text-primary tabular-nums ${index === 0 ? "mt-6" : ""}`}>0{index + 1}</p>
          <h3 className="display mt-1 text-5xl text-fg">{service.title}</h3>
          <p className="mt-2 max-w-md text-base text-fg">{service.copy}</p>
        </div>
      </div>
    </article>
  );
}

function ServiceFilm({ film, still }: { film: string; still: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video || reduce) return;
    let loaded = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          if (!loaded) {
            loaded = true;
            video.src = film;
            video.load();
          }
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { rootMargin: "160px 0px", threshold: 0.2 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [film, reduce]);

  if (reduce) {
    return <img src={still} alt="" className="bay-photo absolute inset-0 h-full w-full object-cover" />;
  }

  return (
    <video
      ref={ref}
      className="bay-photo absolute inset-0 h-full w-full object-cover"
      poster={still}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
    />
  );
}

function BayFilm({ play }: { play: boolean }) {
  const reduce = usePrefersReducedMotion();
  if (!play || reduce) {
    return <img src="/media/hero.jpg" alt="" className="photo-lift absolute inset-0 h-full w-full object-cover" />;
  }
  return (
    <video
      className="bay-drift photo-lift absolute inset-0 h-full w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      poster="/media/hero.jpg"
      aria-hidden="true"
    >
      <source src="/media/intro.mp4" type="video/mp4" />
    </video>
  );
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return reduce;
}

function useStageMotion(rootRef: { current: HTMLElement | null }) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealNodes = root.querySelectorAll<HTMLElement>("[data-reveal]");
    if (reduce) {
      revealNodes.forEach((node) => node.classList.add("is-in"));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.16 },
    );
    revealNodes.forEach((node) => revealObserver.observe(node));

    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const layers = [...root.querySelectorAll<HTMLElement>("[data-parallax]")];
    let raf = 0;
    let ticking = false;

    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      const mobile = mobileQuery.matches;
      const damp = mobile ? 0.4 : 1;
      const limit = mobile ? 18 : 32;
      for (const node of layers) {
        if (mobile && node.hasAttribute("data-desktop-only")) {
          node.style.transform = "";
          continue;
        }
        const frame = node.parentElement;
        if (!frame) continue;
        const rect = frame.getBoundingClientRect();
        if (rect.bottom < -120 || rect.top > vh + 120) continue;
        const speed = Number(node.dataset.parallax) || 0.1;
        const shift = (rect.top - vh * 0.4) * speed * damp;
        const y = Math.max(-limit, Math.min(limit, shift));
        node.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(1.04)`;
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      revealObserver.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [rootRef]);
}

function BayClip({ src, title, copy }: { src: string; title: string; copy: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      video.pause();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { rootMargin: "120px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <figure className="w-56 shrink-0 snap-start">
      <video
        ref={videoRef}
        className="photo-lift aspect-reel w-full rounded-lg object-cover shadow-sm"
        src={src}
        muted
        loop
        playsInline
        autoPlay
        aria-label={title}
        onClick={() => {
          const video = videoRef.current;
          if (!video) return;
          if (video.paused) void video.play();
          else video.pause();
        }}
      />
      <figcaption className="px-1 pt-3">
        <span className="block text-base font-semibold">{title}</span>
        <span className="mt-1 block text-sm text-muted">{copy}</span>
      </figcaption>
    </figure>
  );
}

function BayStill({
  src,
  alt,
  kicker,
  title,
  speed,
}: {
  src: string;
  alt: string;
  kicker: string;
  title: string;
  speed: string;
}) {
  return (
    <figure className="relative min-h-80 overflow-hidden sm:min-h-[26rem]">
      <img
        src={src}
        alt={alt}
        data-parallax={speed}
        className="photo-lift absolute -inset-y-[8%] inset-x-0 h-[116%] w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/35 to-bg/5 md:via-bg/25" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-bg md:hidden" />
      <figcaption className="reveal absolute inset-x-0 bottom-0 p-5" data-reveal>
        <span className="text-xs font-semibold tracking-wide text-primary uppercase">{kicker}</span>
        <span className="mt-1 block max-w-sm text-base font-medium">{title}</span>
      </figcaption>
    </figure>
  );
}

function TicketBanner({ requestId }: { requestId: string }) {
  const request = useGarage((state) => state.requests.find((item) => item.id === requestId));
  if (!request) return null;
  const approved = request.status === "approved" && request.arrivalDate && request.arrivalTime;
  const detail = approved
    ? `Come in ${whenLabel(request.arrivalDate, request.arrivalTime)}.`
    : request.status === "declined"
      ? request.declineNote || "The shop can’t take that slot. They’ll reach you."
      : `${request.year} ${request.make} ${request.model} is waiting on the counter.`;
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="text-sm font-semibold text-fg">
          <span className="text-primary">{request.id}</span>
          {request.status === "pending" ? " · Waiting" : null}
          {request.status === "approved" ? " · Approved" : null}
          {request.status === "declined" ? " · Not booked" : null}
        </p>
        <p className="text-sm text-muted">{detail}</p>
      </div>
    </div>
  );
}
