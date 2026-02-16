"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { clearSession, getSession, UserProfile } from "@/lib/session";

type Client = {
  id: number;
  full_name: string;
  email?: string;
  phone?: string;
};

type ServiceSlot = {
  start_iso: string;
  label: string;
};

type DiscoveredService = {
  id: number;
  name: string;
  discipline: string;
  description: string;
  price: string;
  duration_min: number;
  is_online: boolean;
  available_slots: ServiceSlot[];
};

type EstablishmentResult = {
  tenant_id: number;
  tenant_name: string;
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
  const [user, setUser] = useState<UserProfile | null>(null);

  const [query, setQuery] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState("Todas");
  const [establishments, setEstablishments] = useState<EstablishmentResult[]>([]);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedSlotIso, setSelectedSlotIso] = useState("");
  const [log, setLog] = useState("Listo");

  const disciplines = useMemo(() => {
    const values = Array.from(
      new Set(establishments.flatMap((e) => e.services.map((service) => service.discipline)))
    ).sort();
    return ["Todas", ...values];
  }, [establishments]);

  const selectedEstablishment = useMemo(() => {
    if (!selectedEstablishmentId) return null;
    return establishments.find((item) => item.tenant_id === selectedEstablishmentId) || null;
  }, [selectedEstablishmentId, establishments]);

  const servicesForEstablishment = useMemo(() => {
    if (!selectedEstablishment) return [];
    if (selectedDiscipline === "Todas") return selectedEstablishment.services;
    return selectedEstablishment.services.filter((service) => service.discipline === selectedDiscipline);
  }, [selectedDiscipline, selectedEstablishment]);

  const selectedService = useMemo(() => {
    if (!selectedServiceId) return null;
    return servicesForEstablishment.find((service) => service.id === selectedServiceId) || null;
  }, [selectedServiceId, servicesForEstablishment]);

  useEffect(() => {
    const session = getSession();
    if (!session.token) {
      router.replace("/login");
      return;
    }
    setToken(session.token);
    setUser(session.user || null);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    const timeout = setTimeout(() => {
      void refreshDiscovery(token);
    }, 220);
    return () => clearTimeout(timeout);
  }, [token, query, selectedDiscipline]);

  useEffect(() => {
    if (!selectedEstablishment) return;
    const service = selectedEstablishment.services.find((item) => item.id === selectedServiceId) || selectedEstablishment.services[0] || null;
    setSelectedServiceId(service ? service.id : null);
    setSelectedSlotIso(service?.available_slots?.[0]?.start_iso || "");
  }, [selectedEstablishment]);

  function toggleEstablishment(tenantId: number) {
    if (selectedEstablishmentId === tenantId) {
      setSelectedEstablishmentId(null);
      setSelectedServiceId(null);
      setSelectedSlotIso("");
      return;
    }
    setSelectedEstablishmentId(tenantId);
  }

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
        setSelectedEstablishmentId(null);
        setSelectedServiceId(null);
        setSelectedSlotIso("");
        setLog("No encontramos establecimientos para esa busqueda.");
        return;
      }

      const establishment =
        data.establishments.find((item) => item.tenant_id === selectedEstablishmentId) || data.establishments[0];
      setSelectedEstablishmentId(establishment.tenant_id);

      const service =
        establishment.services.find((item) => item.id === selectedServiceId) || establishment.services[0] || null;
      setSelectedServiceId(service ? service.id : null);
      setSelectedSlotIso(service?.available_slots?.[0]?.start_iso || "");
      setLog("Establecimientos y servicios actualizados.");
    } catch (error: any) {
      setLog(`Error buscando servicios: ${error.message}`);
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
      <p className="small">Busca por servicio, elige establecimiento y agenda en pocos pasos.</p>

      <section className="card">
        <h2>Buscar servicio</h2>
        <div className="marketTopBar">
          <input
            className="input"
            placeholder="Ej: Pilates, depilacion laser, kinesiologia..."
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
        <h2>1. Elegi establecimiento</h2>
        <div className="serviceGrid">
          {establishments.map((item) => {
            const active = item.tenant_id === selectedEstablishmentId;
            const visibleServices =
              selectedDiscipline === "Todas"
                ? item.services
                : item.services.filter((service) => service.discipline === selectedDiscipline);
            return (
              <section key={item.tenant_id} className={active ? "card serviceCard selected" : "card serviceCard"}>
                <div className="serviceTitleRow">
                  <h2>{item.tenant_name}</h2>
                  <span className="badge">{formatStars(item.rating_avg)}</span>
                </div>
                <p className="small">
                  {item.rating_count > 0
                    ? `${item.rating_count} valoraciones de usuarios`
                    : "Aun sin valoraciones"}
                </p>
                <p className="small">{item.services.length} servicios disponibles para tu busqueda.</p>
                <div className="cardActions">
                  <button className={active ? "linkBtn" : "mutedBtn"} onClick={() => toggleEstablishment(item.tenant_id)}>
                    {active ? "Ocultar servicios" : "Ver servicios"}
                  </button>
                </div>

                {active ? (
                  <div style={{ marginTop: 10 }}>
                    {visibleServices.length === 0 ? (
                      <p className="small">No hay servicios para este filtro.</p>
                    ) : (
                      <div className="serviceGrid">
                        {visibleServices.map((service) => {
                          const isSelected = service.id === selectedServiceId;
                          return (
                            <section key={service.id} className={isSelected ? "card serviceCard selected" : "card serviceCard"}>
                              <div className="serviceTitleRow">
                                <h2>{service.name}</h2>
                                <span className="badge">{service.discipline}</span>
                              </div>
                              <p className="small">{service.description || "Servicio profesional personalizado."}</p>
                              <div className="serviceMeta">
                                <span>ARS {Number(service.price).toLocaleString("es-AR")}</span>
                                <span>{service.duration_min} min</span>
                                <span>{service.is_online ? "Online" : "Presencial"}</span>
                              </div>

                              <div className="chipRow">
                                {service.available_slots.map((slot) => {
                                  const activeSlot = isSelected && selectedSlotIso === slot.start_iso;
                                  return (
                                    <button
                                      key={slot.start_iso}
                                      className={activeSlot ? "chip active" : "chip"}
                                      onClick={() => {
                                        setSelectedServiceId(service.id);
                                        setSelectedSlotIso(slot.start_iso);
                                      }}
                                    >
                                      {slot.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </section>
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
