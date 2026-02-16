"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/session";

type Service = {
  id: number;
  name: string;
  discipline: string;
  description: string;
  duration_min: number;
  price: string;
  is_online: boolean;
  is_active: boolean;
};

export default function ClientServicesPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [query, setQuery] = useState("");
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState("Cargando servicios...");

  const visibleServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services
      .filter((service) => service.is_active)
      .filter((service) => (onlyOnline ? service.is_online : true))
      .filter((service) => {
        if (!q) return true;
        return [service.name, service.discipline, service.description].join(" ").toLowerCase().includes(q);
      });
  }, [services, query, onlyOnline]);

  useEffect(() => {
    const session = getSession();
    if (!session.token || !session.tenantId) {
      router.replace("/login");
      return;
    }
    setToken(session.token);
    setTenantId(session.tenantId);
    void refresh(session.token, session.tenantId);
  }, [router]);

  async function refresh(activeToken = token, activeTenant = tenantId) {
    setLoading(true);
    try {
      const data = await apiRequest<Service[]>("/services", { token: activeToken, tenantId: activeTenant });
      setServices(data);
      setLog(`Servicios cargados: ${data.length}`);
    } catch (error: any) {
      setLog(`Error cargando servicios: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <h1 className="sectionTitle">Servicios disponibles</h1>

      <section className="card">
        <div className="formGrid">
          <input
            className="input"
            placeholder="Buscar por servicio o disciplina"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="rememberCheck" style={{ alignSelf: "center", justifySelf: "start" }}>
            <input type="checkbox" checked={onlyOnline} onChange={(e) => setOnlyOnline(e.target.checked)} />
            Solo online
          </label>
          <button className="linkBtn" onClick={() => refresh()} disabled={loading}>
            {loading ? "Actualizando..." : "Refrescar"}
          </button>
        </div>
      </section>

      <div className="grid">
        {visibleServices.map((service) => (
          <section className="card" key={service.id}>
            <h2>{service.name}</h2>
            <p className="small">{service.discipline}</p>
            <p>{service.description || "Sin descripcion."}</p>
            <p>
              Duracion: {service.duration_min} min | Precio: ARS {Number(service.price).toLocaleString("es-AR")}
            </p>
            <div className="cardActions">
              <Link className="linkBtn" href="/client/marketplace">Reservar</Link>
              <Link className="mutedBtn" href={`/client/waitlist?serviceId=${service.id}`}>Lista de espera</Link>
            </div>
          </section>
        ))}
      </div>

      {!loading && visibleServices.length === 0 ? (
        <section className="card" style={{ marginTop: 12 }}>
          <p>No hay servicios para el filtro actual.</p>
        </section>
      ) : null}

      <div className="linkRow">
        <Link className="mutedBtn" href="/client/dashboard">Volver dashboard</Link>
      </div>

      <pre className="pre">{log}</pre>
    </main>
  );
}

