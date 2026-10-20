import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MARQUEE_BRANDS } from "@/data/shop";
import { BRAND_LOGOS } from "@/data/brand-logos";
import "./CarBrandMarquee.css";

export default function CarBrandMarquee() {
  const groupRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const node = groupRef.current;
    if (!node) return;

    const updateDistance = () => {
      setDistance(node.getBoundingClientRect().width);
    };

    updateDistance();

    const observer = new ResizeObserver(updateDistance);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const renderBrands = (duplicate: boolean) => (
    <div className="ffc-brand-group" ref={duplicate ? undefined : groupRef} aria-hidden={duplicate}>
      {MARQUEE_BRANDS.map((brand) => (
        <span className="ffc-brand-name" key={`${duplicate ? "duplicate-" : "primary-"}${brand}`}>
          {BRAND_LOGOS[brand] ? (
            <img
              className="ffc-brand-logo"
              src={BRAND_LOGOS[brand]}
              alt=""
              width={48}
              height={32}
              decoding="async"
            />
          ) : null}
          {brand}
        </span>
      ))}
    </div>
  );

  const safeDistance = distance || 1200;

  const trackStyle: CSSProperties = {
    ["--scroll-distance" as string]: `${safeDistance}px`,
    ["--scroll-duration" as string]: `${Math.max(30, safeDistance / 70)}s`,
  };

  return (
    <section className="ffc-brand-marquee" aria-label="Vehicle manufacturers">
      <div className="ffc-brand-viewport">
        <div className="ffc-brand-track" style={trackStyle}>
          {renderBrands(false)}
          {renderBrands(true)}
        </div>
      </div>
    </section>
  );
}
