"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { clearSession, getSession, UserProfile } from "@/lib/session";

type Appointment = { id: number; service: number; client: number; start_dt: string; status: string };
type Service = { id: number; name: string; discipline: string; price: string };
type Waitlist = { id: number; service: number; desired_date: string; status: string };

export default function ClientDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitlists, setWaitlists] = useState<Waitlist[]>([]);
  const [log, setLog] = useState("Listo");

  const nextAppointment = useMemo(() => {
    return [...appointments]
      .filter((a) => a.status !== "cancelled")
      .sort((a, b) => new Date(a.start_dt).getTime() - new Date(b.start_dt).getTime())[0];
  }, [appointments]);

  const servicesById = useMemo(() => {
    const map: Record<number, Service> = {};
    for (const service of services) {
      map[service.id] = service;
    }
    return map;
  }, [services]);

  const nextAppointmentDate = useMemo(() => {
    if (!nextAppointment) return "";
    return new Date(nextAppointment.start_dt).toLocaleDateString("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [nextAppointment]);

  const nextAppointmentTime = useMemo(() => {
    if (!nextAppointment) return "";
    return new Date(nextAppointment.start_dt).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [nextAppointment]);

  useEffect(() => {
    const session = getSession();
    if (!session.token || !session.tenantId) {
      router.replace("/login");
      return;
    }
    setUser(session.user || null);
    setToken(session.token);
    setTenantId(session.tenantId);
    void refresh(session.token, session.tenantId);
  }, [router]);

  const displayName = useMemo(() => {
    if (!user) return "Cliente";
    return user.full_name?.trim() || user.username || "Cliente";
  }, [user]);

  const initials = useMemo(() => {
    const source = displayName.trim();
    if (!source) return "CL";
    const parts = source.split(/\s+/).filter(Boolean);
    const joined = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
    return joined.toUpperCase() || source.slice(0, 2).toUpperCase();
  }, [displayName]);

  async function refresh(activeToken = token, activeTenant = tenantId) {
    try {
      const [s, a, w] = await Promise.all([
        apiRequest<Service[]>("/services", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Appointment[]>("/appointments", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Waitlist[]>("/waitlists", { token: activeToken, tenantId: activeTenant }),
      ]);
      setServices(s);
      setAppointments(a);
      setWaitlists(w);
      setLog("Datos actualizados");
    } catch (error: any) {
      setLog(`Error: ${error.message}`);
    }
  }

  async function cancelNextAppointment() {
    if (!nextAppointment) {
      setLog("No hay turnos para cancelar.");
      return;
    }

    try {
      await apiRequest(`/appointments/${nextAppointment.id}/cancel`, {
        method: "POST",
        token,
        tenantId,
      });
      setLog(`Turno ${nextAppointment.id} cancelado`);
      await refresh();
    } catch (error: any) {
      setLog(`Error cancelando: ${error.message}`);
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
      <div className="profileHeader">
        {user?.avatar_url ? (
          <img className="profileAvatar" src={user.avatar_url} alt={displayName} referrerPolicy="no-referrer" />
        ) : (
          <div className="profileAvatarFallback" aria-hidden="true">{initials}</div>
        )}
        <div>
          <p className="small" style={{ margin: 0 }}>Hola</p>
          <strong>{displayName}</strong>
        </div>
      </div>
      <h1 className="sectionTitle">Dashboard Cliente</h1>

      <div className="grid">
        <section className="card upcomingCard">
          <h2>Proximo turno</h2>
          {nextAppointment ? (
            <>
              <p className="small">Servicio asignado</p>
              <p className="kpiValue" style={{ marginBottom: 10 }}>
                {servicesById[nextAppointment.service]?.name || `Turno #${nextAppointment.id}`}
              </p>
              <div className="upcomingMeta">
                <div className="upcomingMetaItem">
                  <span className="small">Fecha</span>
                  <strong>{nextAppointmentDate}</strong>
                </div>
                <div className="upcomingMetaItem">
                  <span className="small">Hora</span>
                  <strong>{nextAppointmentTime}</strong>
                </div>
                <div className="upcomingMetaItem">
                  <span className="small">Estado</span>
                  <span className="badge">{nextAppointment.status}</span>
                </div>
              </div>
              <div className="cardActions">
                <Link className="mutedBtn" href="/client/appointments">Ver detalle</Link>
                <button className="mutedBtn" onClick={cancelNextAppointment}>Cancelar</button>
              </div>
            </>
          ) : (
            <p>Sin turnos activos.</p>
          )}
        </section>
        <Link className="card cardInteractive" href="/client/services">
          <h2>Servicios disponibles</h2>
          <p>{services.length} servicios activos para tu cuenta.</p>
          <div className="cardActions">
            <span className="linkBtn">Ver servicios</span>
          </div>
        </Link>
        <Link className="card cardInteractive" href="/client/appointments">
          <h2>Mis turnos</h2>
          <p>Total: {appointments.length}</p>
          <div className="cardActions">
            <span className="linkBtn">Ver turnos</span>
          </div>
        </Link>
        <Link className="card cardInteractive" href="/client/waitlist">
          <h2>Lista de espera</h2>
          <p>Registros activos: {waitlists.filter((w) => w.status === "active").length}</p>
          <div className="cardActions">
            <span className="linkBtn">Gestionar</span>
          </div>
        </Link>
      </div>

      <div className="linkRow">
        <button className="linkBtn" onClick={() => refresh()}>Refrescar</button>
        <Link className="linkBtn" href="/client/marketplace">Ir a marketplace</Link>
        <button className="mutedBtn" onClick={logout}>Cerrar sesion</button>
      </div>

      <pre className="pre">{log}</pre>
    </main>
  );
}

