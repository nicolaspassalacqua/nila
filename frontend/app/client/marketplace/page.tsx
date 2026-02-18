"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { clearSession, getSession } from "@/lib/session";

type DiscoveredService = {
  id: number;
  name: string;
  discipline: string;
  description: string;
  price: string;
  duration_min: number;
};

type EstablishmentResult = {
  tenant_id: number;
  tenant_name: string;
  tenant_photo_url: string;
  tenant_address: string;
  tenant_description: string;
  tenant_opening_hours: string;
  rating_avg: number;
  rating_count: number;
  services: DiscoveredService[];
};

type DiscoveryResponse = {
  establishments: EstablishmentResult[];
};

function formatStars(avg: number): string {
  if (avg <= 0) return "Sin valoraciones";
  return `${avg.toFixed(1)} / 5`;
}

export default function ClientMarketplacePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [query, setQuery] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState("Todas");
  const [establishments, setEstablishments] = useState<EstablishmentResult[]>([]);
  const [log, setLog] = useState("Listo");

  const disciplines = useMemo(() => {
    const values = Array.from(
      new Set(establishments.flatMap((e) => e.services.map((service) => service.discipline)))
    ).sort();
    return ["Todas", ...values];
  }, [establishments]);

  useEffect(() => {
    const session = getSession();
    if (!session.token) {
      router.replace("/login");
      return;
    }
    setToken(session.token);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    const timeout = setTimeout(() => {
      void refreshDiscovery(token);
    }, 220);
    return () => clearTimeout(timeout);
  }, [token, query, selectedDiscipline]);

  async function refreshDiscovery(activeToken = token) {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (selectedDiscipline && selectedDiscipline !== "Todas") params.set("discipline", selectedDiscipline);

      const data = await apiRequest<DiscoveryResponse>(
        `/marketplace/discovery${params.toString() ? `?${params.toString()}` : ""}`,
        { token: activeToken }
      );

      setEstablishments(data.establishments);
      if (data.establishments.length === 0) {
        setLog("No encontramos establecimientos para esa busqueda.");
        return;
      }
      setLog("Establecimientos actualizados.");
    } catch (error: any) {
      setLog(`Error buscando establecimientos: ${error.message}`);
    }
  }

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <h1 className="sectionTitle">Marketplace</h1>
      <p className="small">Elige establecimiento y luego reserva en la pantalla de servicios.</p>

      <section className="card">
        <h2>Buscar establecimiento</h2>
        <div className="marketTopBar">
          <input
            className="input"
            placeholder="Ej: futbol, padel, pilates..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="linkBtn" onClick={() => refreshDiscovery()}>Buscar</button>
        </div>
        <div className="chipRow">
          {disciplines.map((discipline) => (
            <button
              key={discipline}
              className={selectedDiscipline === discipline ? "chip active" : "chip"}
              onClick={() => setSelectedDiscipline(discipline)}
            >
              {discipline}
            </button>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Establecimientos</h2>
        <div className="serviceGrid">
          {establishments.map((item) => {
            const serviceSummary = item.services.slice(0, 4).map((service) => service.name).join(", ");
            return (
              <article key={item.tenant_id} className="card serviceCard">
                <div className="featuredGrid" style={{ gridTemplateColumns: "1fr", marginTop: 0 }}>
                  <div className="featuredCard" style={{ cursor: "default", padding: 0, overflow: "hidden" }}>
                    {item.tenant_photo_url ? (
                      <img
                        src={item.tenant_photo_url}
                        alt={item.tenant_name}
                        style={{ width: "100%", height: 170, objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div style={{ height: 120, background: "linear-gradient(145deg, #eaf2ff 0%, #d9e6fb 100%)" }} />
                    )}
                  </div>
                </div>
                <div className="serviceTitleRow">
                  <h2>{item.tenant_name}</h2>
                  <span className="badge">{formatStars(item.rating_avg)}</span>
                </div>
                <p className="small">{item.tenant_address || "Direccion no informada"}</p>
                <p className="small">{item.tenant_description || "Sin descripcion del establecimiento."}</p>
                <p className="small"><strong>Servicios:</strong> {serviceSummary || "Sin servicios activos"}</p>
                <p className="small">Horario: {item.tenant_opening_hours || "No informado"}</p>
                <div className="linkRow">
                  <Link className="linkBtn" href={`/client/marketplace/${item.tenant_id}`}>
                    Ver servicios y reservar
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="linkRow">
        <button className="linkBtn" onClick={() => refreshDiscovery()}>Refrescar</button>
        <Link className="mutedBtn" href="/client/dashboard">Volver dashboard</Link>
        <Link className="mutedBtn" href="/client/appointments">Ver mis turnos</Link>
        <button className="mutedBtn" onClick={logout}>Cerrar sesion</button>
      </div>

      <pre className="pre">{log}</pre>
    </main>
  );
}
