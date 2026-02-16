"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getSession } from "@/lib/session";

export default function ClientPage() {
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
      <h1 className="sectionTitle">Centro Cliente</h1>

      <div className="grid">
        <Link className="card cardInteractive" href="/client/dashboard">
          <h2>Dashboard</h2>
          <p>Resumen de turnos, proximas acciones y estado de lista de espera.</p>
          <div className="cardActions"><span className="linkBtn">Abrir</span></div>
        </Link>

        <Link className="card cardInteractive" href="/client/marketplace">
          <h2>Marketplace</h2>
          <p>Buscar profesionales y reservar turnos disponibles.</p>
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

