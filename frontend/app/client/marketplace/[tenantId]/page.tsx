"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/session";

type ServiceSlot = {
  start_iso: string;
  label: string;
};

type ServiceUnavailableSlot = {
  start_iso: string;
  label: string;
  availability: "requested" | "confirmed" | "blocked";
  legend: string;
};

type DiscoveredService = {
  id: number;
  name: string;
  discipline: string;
  description: string;
  service_type: string;
  service_config?: any;
  price: string;
  duration_min: number;
  is_online: boolean;
  available_slots: ServiceSlot[];
  unavailable_slots?: ServiceUnavailableSlot[];
};

type EstablishmentResult = {
  tenant_id: number;
  tenant_name: string;
  tenant_photo_url: string;
  tenant_address: string;
  tenant_description: string;
  tenant_opening_hours: string;
  services: DiscoveredService[];
};

type DiscoveryResponse = {
  establishments: EstablishmentResult[];
};

export default function ClientMarketplaceTenantPage() {
  const router = useRouter();
  const params = useParams<{ tenantId: string }>();
  const tenantIdParam = String(params?.tenantId || "");
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState("");
  const [establishment, setEstablishment] = useState<EstablishmentResult | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedSlotIso, setSelectedSlotIso] = useState("");
  const [preferredCourtName, setPreferredCourtName] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [log, setLog] = useState("Cargando...");

  const selectedService = useMemo(() => {
    if (!selectedServiceId || !establishment) return null;
    return establishment.services.find((item) => item.id === selectedServiceId) || null;
  }, [selectedServiceId, establishment]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const session = getSession();
    if (!session.token) {
      router.replace("/login");
      return;
    }
    setToken(session.token);
    void loadEstablishment(session.token);
  }, [router, tenantIdParam]);

  useEffect(() => {
    if (!selectedService) {
      setPreferredCourtName("");
      return;
    }
    const includedCourts = Array.isArray(selectedService.service_config?.included_courts)
      ? selectedService.service_config.included_courts
      : [];
    const firstName = includedCourts[0]?.name ? String(includedCourts[0].name) : "";
    setPreferredCourtName(firstName);
  }, [selectedServiceId, selectedService]);

  async function loadEstablishment(activeToken = token) {
    try {
      const data = await apiRequest<DiscoveryResponse>("/marketplace/discovery", { token: activeToken });
      const target = data.establishments.find((item) => String(item.tenant_id) === tenantIdParam) || null;
      if (!target) {
        setLog("No se encontro el establecimiento.");
        setEstablishment(null);
        return;
      }
      setEstablishment(target);
      const firstService = target.services[0] || null;
      setSelectedServiceId(firstService ? firstService.id : null);
      setSelectedSlotIso(firstService?.available_slots?.[0]?.start_iso || "");
      setLog("Servicios cargados");
    } catch (error: any) {
      setLog(`Error cargando establecimiento: ${error.message}`);
    }
  }

  async function reserveSelectedSlot() {
    if (!selectedService || !selectedSlotIso) {
      setLog("Selecciona servicio y horario.");
      return;
    }

    setIsBooking(true);
    try {
      await apiRequest("/appointments/reserve-self", {
        method: "POST",
        token,
        tenantId: tenantIdParam,
        body: {
          service_id: selectedService.id,
          start_iso: selectedSlotIso,
          court_name: preferredCourtName || "",
        },
      });
      setLog("Reserva enviada. Pendiente de confirmacion del establecimiento.");
      await loadEstablishment(token);
    } catch (error: any) {
      setLog(`No se pudo reservar: ${error.message}`);
    } finally {
      setIsBooking(false);
    }
  }

  if (!hydrated) {
    return (
      <main>
        <div className="brand">NILA</div>
        <div className="brandTag">Strategy | Technology | Execution</div>
        <h1 className="sectionTitle">Servicios del establecimiento</h1>
        <section className="card" style={{ marginTop: 12 }}>
          <div className="skeletonLine skeletonTitle" />
          <div className="skeletonLine" />
          <div className="skeletonLine skeletonShort" />
        </section>
        <section className="card" style={{ marginTop: 12 }}>
          <div className="serviceGrid">
            <article className="card serviceCard">
              <div className="skeletonLine skeletonTitle" />
              <div className="skeletonLine" />
              <div className="skeletonLine skeletonShort" />
              <div className="chipRow">
                <span className="skeletonChip" />
                <span className="skeletonChip" />
                <span className="skeletonChip" />
              </div>
            </article>
            <article className="card serviceCard">
              <div className="skeletonLine skeletonTitle" />
              <div className="skeletonLine" />
              <div className="skeletonLine skeletonShort" />
              <div className="chipRow">
                <span className="skeletonChip" />
                <span className="skeletonChip" />
                <span className="skeletonChip" />
              </div>
            </article>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <h1 className="sectionTitle">Servicios del establecimiento</h1>

      {establishment ? (
        <section className="card">
          <h2>{establishment.tenant_name}</h2>
          {establishment.tenant_photo_url ? (
            <img
              src={establishment.tenant_photo_url}
              alt={establishment.tenant_name}
              style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12, marginTop: 8 }}
            />
          ) : null}
          <p className="small" style={{ marginTop: 8 }}>{establishment.tenant_address || "Direccion no informada"}</p>
          <p className="small">{establishment.tenant_description || "Sin descripcion."}</p>
          <p className="small">Horario: {establishment.tenant_opening_hours || "No informado"}</p>
        </section>
      ) : null}

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Servicios disponibles</h2>
        <div className="slotLegend" aria-label="Leyenda de estados de turnos">
          <span className="slotLegendItem available">Disponible</span>
          <span className="slotLegendItem requested">Pendiente</span>
          <span className="slotLegendItem confirmed">Reservado</span>
          <span className="slotLegendItem blocked">Bloqueado</span>
        </div>
        <div className="serviceGrid">
          {(establishment?.services || []).map((service) => {
            const selected = service.id === selectedServiceId;
            return (
              <article key={service.id} className={selected ? "card serviceCard selected" : "card serviceCard"}>
                <div className="serviceTitleRow">
                  <h2>{service.name}</h2>
                  <span className="badge">{service.discipline}</span>
                </div>
                <p className="small">{service.description || "Servicio profesional."}</p>
                <div className="serviceMeta">
                  <span>ARS {Number(service.price).toLocaleString("es-AR")}</span>
                  <span>{service.duration_min} min</span>
                  <span>{service.service_type === "alquiler_cancha" ? "Cancha" : "Turno"}</span>
                </div>

                <div className="chipRow">
                  {service.available_slots.map((slot) => {
                    const activeSlot = selected && selectedSlotIso === slot.start_iso;
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
                {Array.isArray(service.unavailable_slots) && service.unavailable_slots.length > 0 ? (
                  <div style={{ marginTop: 8 }}>
                    <p className="small" style={{ marginBottom: 6 }}><strong>No disponibles</strong></p>
                    <div className="chipRow">
                      {service.unavailable_slots.slice(0, 12).map((slot) => (
                        <button
                          key={`na-${slot.start_iso}`}
                          className={`chip chipUnavailable ${
                            slot.availability === "confirmed"
                              ? "confirmed"
                              : slot.availability === "blocked"
                                ? "blocked"
                                : "requested"
                          }`}
                          disabled
                          title={slot.legend}
                        >
                          {slot.label} - {slot.availability === "confirmed" ? "Reservado" : slot.availability === "blocked" ? "Bloqueado" : "Pendiente"}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selected && service.service_type === "alquiler_cancha" ? (
                  <div className="fieldStack" style={{ marginTop: 8 }}>
                    <label className="fieldLabel">Cancha preferida (opcional)</label>
                    <select className="input" value={preferredCourtName} onChange={(event) => setPreferredCourtName(event.target.value)}>
                      <option value="">Asignar automatica</option>
                      {(Array.isArray(service.service_config?.included_courts) ? service.service_config.included_courts : []).map((court: any, idx: number) => {
                        const name = String(court?.name || `Cancha ${idx + 1}`);
                        return <option key={`${name}-${idx}`} value={name}>{name}</option>;
                      })}
                    </select>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <div className="linkRow">
        <button className="linkBtn" onClick={reserveSelectedSlot} disabled={isBooking || !selectedService || !selectedSlotIso}>
          {isBooking ? "Reservando..." : "Reservar"}
        </button>
        <button className="mutedBtn" onClick={() => loadEstablishment()}>Refrescar disponibilidad</button>
        <Link className="mutedBtn" href="/client/marketplace">Volver establecimientos</Link>
        <Link className="mutedBtn" href="/client/appointments">Mis turnos</Link>
      </div>

      <pre className="pre">{log}</pre>
    </main>
  );
}
