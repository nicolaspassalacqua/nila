"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/session";

type Appointment = {
  id: number;
  service: number;
  start_dt: string;
  end_dt: string;
  status: string;
};

type Service = {
  id: number;
  name: string;
};

const CANCELLABLE_STATUSES = new Set(["requested", "confirmed"]);

export default function ClientAppointmentsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [servicesById, setServicesById] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState("Cargando turnos...");

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort(
      (a, b) => new Date(a.start_dt).getTime() - new Date(b.start_dt).getTime(),
    );
  }, [appointments]);

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
      const [appointmentsResponse, servicesResponse] = await Promise.all([
        apiRequest<Appointment[]>("/appointments", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Service[]>("/services", { token: activeToken, tenantId: activeTenant }),
      ]);

      const servicesMap: Record<number, string> = {};
      for (const service of servicesResponse) {
        servicesMap[service.id] = service.name;
      }

      setAppointments(appointmentsResponse);
      setServicesById(servicesMap);
      setLog(`Turnos cargados: ${appointmentsResponse.length}`);
    } catch (error: any) {
      setLog(`Error cargando turnos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function cancelAppointment(id: number) {
    try {
      await apiRequest(`/appointments/${id}/cancel`, {
        method: "POST",
        token,
        tenantId,
      });
      setLog(`Turno ${id} cancelado`);
      await refresh();
    } catch (error: any) {
      setLog(`No se pudo cancelar el turno ${id}: ${error.message}`);
    }
  }

  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <h1 className="sectionTitle">Mis turnos</h1>

      <div className="linkRow">
        <button className="linkBtn" onClick={() => refresh()} disabled={loading}>
          {loading ? "Actualizando..." : "Refrescar"}
        </button>
        <Link className="mutedBtn" href="/client/marketplace">Reservar nuevo turno</Link>
        <Link className="mutedBtn" href="/client/dashboard">Volver dashboard</Link>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        {sortedAppointments.length === 0 ? (
          <p>No hay turnos registrados.</p>
        ) : (
          <ul className="list">
            {sortedAppointments.map((appointment) => {
              const canCancel = CANCELLABLE_STATUSES.has(appointment.status);
              return (
                <li key={appointment.id}>
                  <strong>#{appointment.id}</strong>{" "}
                  {servicesById[appointment.service] || `Servicio ${appointment.service}`} |{" "}
                  {new Date(appointment.start_dt).toLocaleString()} |{" "}
                  <span className="badge">{appointment.status}</span>{" "}
                  <button
                    className="mutedBtn"
                    onClick={() => cancelAppointment(appointment.id)}
                    disabled={!canCancel}
                    style={{ marginLeft: 8, padding: "4px 10px" }}
                  >
                    {canCancel ? "Cancelar" : "No disponible"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <pre className="pre">{log}</pre>
    </main>
  );
}

