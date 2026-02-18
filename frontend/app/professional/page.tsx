"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getSession, UserProfile } from "@/lib/session";

type ModuleItem = {
  href: string;
  title: string;
  subtitle: string;
  tag: string;
  icon: string;
};

const MODULES: ModuleItem[] = [
  { href: "/professional/dashboard", title: "Agenda y reservas", subtitle: "Confirmar, cancelar y bloquear horarios.", tag: "Core", icon: "AG" },
  { href: "/professional/services", title: "Servicios", subtitle: "Configurar servicios, precios y reglas.", tag: "Core", icon: "SV" },
  { href: "/professional/tenants", title: "Sucursales", subtitle: "Gestion de sucursales y estructura operativa.", tag: "Core", icon: "SC" },
  { href: "/professional/workspace", title: "Workspace", subtitle: "Herramientas internas y pruebas operativas.", tag: "Labs", icon: "WS" },
];

export default function ProfessionalPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session.token) {
      router.replace("/login");
      return;
    }
    setUser(session.user || null);
    setReady(true);
  }, [router]);

  const displayName = useMemo(() => {
    if (!user) return "Profesional";
    return user.full_name?.trim() || user.username || "Profesional";
  }, [user]);

  function logout() {
    clearSession();
    router.push("/login");
  }

  if (!ready) return null;

  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>

      <section className="moduleHero card">
        <p className="small" style={{ margin: 0 }}>Portal Profesional</p>
        <h1 className="sectionTitle" style={{ marginTop: 8 }}>Hola {displayName}</h1>
        <p className="small" style={{ maxWidth: 720 }}>
          Elegi un modulo para comenzar. Esta vista centraliza toda la navegacion operativa, como un launcher de aplicaciones.
        </p>
      </section>

      <section className="moduleGrid" aria-label="Modulos del profesional">
        {MODULES.map((item) => (
          <Link key={item.href} className="moduleCard" href={item.href}>
            <span className="moduleIcon" aria-hidden="true">{item.icon}</span>
            <h2>{item.title}</h2>
            <p>{item.subtitle}</p>
            <span className="badge">{item.tag}</span>
          </Link>
        ))}
      </section>

      <div className="linkRow">
        <Link className="mutedBtn" href="/">Inicio general</Link>
        <button className="mutedBtn" onClick={logout}>Cerrar sesion</button>
      </div>
    </main>
  );
}
