"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, getApiUrl } from "@/lib/api";

const INTERNAL_TOOLS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_INTERNAL_WORKSPACE === "1";

export default function ClientWorkspacePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [waitlists, setWaitlists] = useState<any[]>([]);
  const [log, setLog] = useState("Listo");

  useEffect(() => {
    if (!INTERNAL_TOOLS_ENABLED) {
      router.replace("/client/dashboard");
      return;
    }

    setToken(localStorage.getItem("nila_token") || "");
    setTenantId(localStorage.getItem("nila_tenant_id") || "");
  }, [router]);

  if (!INTERNAL_TOOLS_ENABLED) {
    return null;
  }

  async function fetchData(activeToken: string, activeTenantId: string) {
    try {
      const [s, a, w] = await Promise.all([
        apiRequest<any[]>("/services/", { token: activeToken, tenantId: activeTenantId }),
        apiRequest<any[]>("/appointments/", { token: activeToken, tenantId: activeTenantId }),
        apiRequest<any[]>("/waitlists/", { token: activeToken, tenantId: activeTenantId }),
      ]);
      setServices(s);
      setAppointments(a);
      setWaitlists(w);
      setLog("Datos cliente actualizados");
    } catch (e: any) {
      setLog(`Error cliente: ${e.message}`);
    }
  }

  async function refresh() {
    if (!token || !tenantId) return setLog("Falta token o tenant");
    await fetchData(token, tenantId);
  }

  async function loadDemoSession() {
    try {
      const auth = await apiRequest<{ access: string }>("/auth/token/", {
        method: "POST",
        body: { username: "admin", password: "admin12345" },
      });

      const t = await apiRequest<any[]>("/tenants/", { token: auth.access });
      const demoTenant = t.find((x) => x.slug === "demo-center") || t[0];
      if (!demoTenant) {
        return setLog("No hay tenants disponibles");
      }

      setToken(auth.access);
      setTenantId(String(demoTenant.id));
      localStorage.setItem("nila_token", auth.access);
      localStorage.setItem("nila_tenant_id", String(demoTenant.id));
      setLog(`Sesion demo cargada (tenant ${demoTenant.id})`);
      await fetchData(auth.access, String(demoTenant.id));
    } catch (e: any) {
      setLog(`Error cargando demo: ${e.message}`);
    }
  }

  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <h1 className="sectionTitle">Workspace Cliente</h1>
      <p className="small">API: {getApiUrl()}</p>

      <div className="card">
        <div className="formGrid">
          <input className="input" value={token} onChange={(e) => { setToken(e.target.value); localStorage.setItem("nila_token", e.target.value); }} placeholder="JWT token" />
          <input className="input" value={tenantId} onChange={(e) => { setTenantId(e.target.value); localStorage.setItem("nila_tenant_id", e.target.value); }} placeholder="Tenant ID" />
          <button className="linkBtn" onClick={refresh}>Refrescar</button>
        </div>
        <div className="linkRow">
          <button className="mutedBtn" onClick={loadDemoSession}>Cargar sesion demo</button>
        </div>
      </div>

      <div className="grid">
        <section className="card">
          <h2>Marketplace servicios</h2>
          <ul className="list">{services.map((s) => <li key={s.id}>{s.name} - {s.discipline} - ${s.price}</li>)}</ul>
        </section>
        <section className="card">
          <h2>Mis turnos</h2>
          <ul className="list">{appointments.map((a) => <li key={a.id}>#{a.id} - {a.status} - {a.start_dt}</li>)}</ul>
        </section>
        <section className="card">
          <h2>Lista de espera</h2>
          <ul className="list">{waitlists.map((w) => <li key={w.id}>#{w.id} - servicio {w.service} - {w.desired_date}</li>)}</ul>
        </section>
      </div>

      <div className="linkRow">
        <Link className="mutedBtn" href="/client/dashboard">Volver</Link>
      </div>
      <pre className="pre">{log}</pre>
    </main>
  );
}


