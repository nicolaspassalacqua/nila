"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/session";

type Service = {
  id: number;
  name: string;
  discipline: string;
};

type Client = {
  id: number;
  full_name: string;
};

type Waitlist = {
  id: number;
  service: number;
  desired_date: string;
  status: string;
};

type WaitlistEntry = {
  id: number;
  waitlist: number;
  client: number;
  priority: number;
};

type WaitlistOffer = {
  id: number;
  appointment: number;
  entry: number;
  expires_at: string;
  status: string;
};

export default function ClientWaitlistPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState("");
  const [tenantId, setTenantId] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [waitlists, setWaitlists] = useState<Waitlist[]>([]);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [offers, setOffers] = useState<WaitlistOffer[]>([]);

  const [serviceId, setServiceId] = useState(searchParams.get("serviceId") || "");
  const [clientId, setClientId] = useState("");
  const [desiredDate, setDesiredDate] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState("100");
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState("Cargando lista de espera...");

  const servicesById = useMemo(() => {
    const map: Record<number, string> = {};
    for (const service of services) {
      map[service.id] = service.name;
    }
    return map;
  }, [services]);

  const entriesById = useMemo(() => {
    const map: Record<number, WaitlistEntry> = {};
    for (const entry of entries) {
      map[entry.id] = entry;
    }
    return map;
  }, [entries]);

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
      const [servicesResponse, clientsResponse, waitlistsResponse, entriesResponse, offersResponse] = await Promise.all([
        apiRequest<Service[]>("/services", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Client[]>("/clients", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Waitlist[]>("/waitlists", { token: activeToken, tenantId: activeTenant }),
        apiRequest<WaitlistEntry[]>("/waitlist-entries", { token: activeToken, tenantId: activeTenant }),
        apiRequest<WaitlistOffer[]>("/waitlist-offers", { token: activeToken, tenantId: activeTenant }),
      ]);

      setServices(servicesResponse);
      setClients(clientsResponse);
      setWaitlists(waitlistsResponse);
      setEntries(entriesResponse);
      setOffers(offersResponse);

      if (!clientId && clientsResponse.length > 0) {
        setClientId(String(clientsResponse[0].id));
      }

      setLog("Lista de espera actualizada");
    } catch (error: any) {
      setLog(`Error cargando lista de espera: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function joinWaitlist() {
    if (!serviceId || !clientId || !desiredDate) {
      setLog("Completa servicio, cliente y fecha.");
      return;
    }

    try {
      let waitlist = waitlists.find(
        (item) =>
          item.status === "active" &&
          item.service === Number(serviceId) &&
          item.desired_date === desiredDate,
      );

      if (!waitlist) {
        waitlist = await apiRequest<Waitlist>("/waitlists", {
          method: "POST",
          token,
          tenantId,
          body: {
            service: Number(serviceId),
            desired_date: desiredDate,
            status: "active",
          },
        });
      }

      await apiRequest("/waitlist-entries", {
        method: "POST",
        token,
        tenantId,
        body: {
          waitlist: waitlist.id,
          client: Number(clientId),
          priority: Number(priority || "100"),
        },
      });

      setLog(`Te sumaste a la lista de espera del servicio ${waitlist.service}.`);
      await refresh();
    } catch (error: any) {
      setLog(`No se pudo crear la entrada: ${error.message}`);
    }
  }

  async function removeEntry(entryId: number) {
    try {
      await apiRequest(`/waitlist-entries/${entryId}`, {
        method: "DELETE",
        token,
        tenantId,
      });
      setLog(`Entrada ${entryId} eliminada`);
      await refresh();
    } catch (error: any) {
      setLog(`No se pudo eliminar la entrada: ${error.message}`);
    }
  }

  async function respondOffer(offerId: number, action: "accept" | "reject") {
    try {
      await apiRequest(`/waitlist-offers/${offerId}/${action}`, {
        method: "POST",
        token,
        tenantId,
      });
      setLog(`Oferta ${offerId} ${action === "accept" ? "aceptada" : "rechazada"}`);
      await refresh();
    } catch (error: any) {
      setLog(`No se pudo procesar oferta: ${error.message}`);
    }
  }

  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <h1 className="sectionTitle">Lista de espera</h1>

      <section className="card">
        <h2>Unirme a lista de espera</h2>
        <div className="formGrid" style={{ marginTop: 8 }}>
          <select className="select" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Servicio</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.discipline})
              </option>
            ))}
          </select>
          <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.full_name}
              </option>
            ))}
          </select>
          <input className="input" type="date" value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)} />
        </div>
        <div className="formGrid" style={{ marginTop: 8 }}>
          <input
            className="input"
            type="number"
            min={1}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            placeholder="Prioridad"
          />
          <button className="linkBtn" onClick={joinWaitlist}>Sumarme</button>
          <button className="mutedBtn" onClick={() => refresh()} disabled={loading}>
            {loading ? "Actualizando..." : "Refrescar"}
          </button>
        </div>
      </section>

      <div className="grid">
        <section className="card">
          <h2>Registros activos</h2>
          <ul className="list">
            {waitlists
              .filter((item) => item.status === "active")
              .map((item) => (
                <li key={item.id}>
                  #{item.id} | {servicesById[item.service] || `Servicio ${item.service}`} | {item.desired_date}
                </li>
              ))}
          </ul>
        </section>

        <section className="card">
          <h2>Mis entradas</h2>
          <ul className="list">
            {entries
              .filter((entry) => (clientId ? entry.client === Number(clientId) : true))
              .map((entry) => (
                <li key={entry.id}>
                  Entrada #{entry.id} | Waitlist #{entry.waitlist} | prioridad {entry.priority}{" "}
                  <button
                    className="mutedBtn"
                    onClick={() => removeEntry(entry.id)}
                    style={{ marginLeft: 8, padding: "4px 10px" }}
                  >
                    Salir
                  </button>
                </li>
              ))}
          </ul>
        </section>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Ofertas de reemplazo</h2>
        <ul className="list">
          {offers
            .filter((offer) => {
              const entry = entriesById[offer.entry];
              if (!entry) return false;
              return clientId ? entry.client === Number(clientId) : true;
            })
            .map((offer) => (
              <li key={offer.id}>
                Oferta #{offer.id} | Turno #{offer.appointment} | vence {new Date(offer.expires_at).toLocaleString()} |{" "}
                <span className="badge">{offer.status}</span>
                {offer.status === "offered" ? (
                  <>
                    <button
                      className="linkBtn"
                      onClick={() => respondOffer(offer.id, "accept")}
                      style={{ marginLeft: 8, padding: "4px 10px" }}
                    >
                      Aceptar
                    </button>
                    <button
                      className="mutedBtn"
                      onClick={() => respondOffer(offer.id, "reject")}
                      style={{ marginLeft: 8, padding: "4px 10px" }}
                    >
                      Rechazar
                    </button>
                  </>
                ) : null}
              </li>
            ))}
        </ul>
      </section>

      <div className="linkRow">
        <Link className="mutedBtn" href="/client/services">Ver servicios</Link>
        <Link className="mutedBtn" href="/client/dashboard">Volver dashboard</Link>
      </div>

      <pre className="pre">{log}</pre>
    </main>
  );
}

