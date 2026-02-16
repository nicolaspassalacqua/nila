"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getSession } from "@/lib/session";

export default function ProfessionalPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session.token) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  function logout() {
    clearSession();
    router.push("/login");
  }

  if (!ready) return null;

  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <h1 className="sectionTitle">Centro Profesional</h1>

      <div className="grid">
        <Link className="card cardInteractive" href="/professional/dashboard">
          <h2>Dashboard</h2>
          <p>Metricas operativas de agenda, clientes y cobranzas.</p>
          <div className="cardActions"><span className="linkBtn">Abrir</span></div>
        </Link>

        <Link className="card cardInteractive" href="/professional/tenants">
          <h2>Multi-tenant</h2>
          <p>Gestionar empresas, memberships y tenant activo.</p>
          <div className="cardActions"><span className="linkBtn">Abrir</span></div>
        </Link>

      </div>

      <div className="linkRow">
        <Link className="mutedBtn" href="/">Inicio</Link>
        <button className="mutedBtn" onClick={logout}>Cerrar sesion</button>
      </div>
    </main>
  );
}

