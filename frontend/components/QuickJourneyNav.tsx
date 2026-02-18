"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

function getNavItems(pathname: string): NavItem[] {
  if (pathname.startsWith("/client")) {
    return [
      { href: "/client/dashboard", label: "Dashboard", icon: "CL" },
      { href: "/client/marketplace", label: "Marketplace", icon: "MP" },
      { href: "/client/appointments", label: "Turnos", icon: "TU" },
      { href: "/client/waitlist", label: "Espera", icon: "ES" },
    ];
  }
  if (pathname.startsWith("/professional")) {
    return [
      { href: "/professional", label: "Inicio", icon: "IN" },
      { href: "/professional/dashboard", label: "Panel", icon: "PR" },
      { href: "/professional/tenants", label: "Sucursales", icon: "SU" },
      { href: "/professional/services", label: "Servicios", icon: "SE" },
      { href: "/professional/workspace", label: "Espacio", icon: "WS" },
    ];
  }
  if (pathname.startsWith("/internal")) {
    return [
      { href: "/internal/backoffice-z7k9", label: "Admin interna", icon: "IN" },
      { href: "/internal/admin", label: "Seguridad", icon: "SG" },
    ];
  }
  return [];
}

function getRouteLabel(pathname: string): string {
  if (pathname.startsWith("/client")) return "Portal Cliente";
  if (pathname.startsWith("/professional")) return "Portal Profesional";
  if (pathname.startsWith("/internal")) return "Administracion Interna";
  return "";
}

export default function QuickJourneyNav() {
  const pathname = usePathname();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const viewport = document.documentElement.clientHeight;
      const full = document.documentElement.scrollHeight;
      const max = Math.max(full - viewport, 1);
      setScrollProgress(Math.min(100, Math.max(0, (window.scrollY / max) * 100)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const items = useMemo(() => getNavItems(pathname || ""), [pathname]);

  if (!pathname) return null;
  if (pathname === "/" || pathname.startsWith("/login")) return null;
  if (items.length === 0) return null;

  return (
    <>
      <div className="routeProgress" aria-hidden="true">
        <span style={{ width: `${scrollProgress}%` }} />
      </div>
      <nav className="quickJourneyNav" aria-label="Navegacion rapida">
        <p className="quickJourneyTitle">{getRouteLabel(pathname)}</p>
        <div className="quickJourneyItems">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? "quickJourneyItem active" : "quickJourneyItem"}>
                <span className="quickJourneyIcon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          className="quickJourneyTop"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Volver arriba"
        >
          Arriba
        </button>
      </nav>
    </>
  );
}
