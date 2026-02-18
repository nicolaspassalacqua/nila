"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { getSession, setActiveTenant } from "@/lib/session";

type CourtSport = "futbol" | "padel" | "tenis" | "otro";

type CourtConfig = {
  name: string;
  sport: CourtSport;
  capacity: number;
};

type Tenant = {
  id: number;
  name: string;
  establishment_type: string;
  court_config: CourtConfig[];
};

type Service = {
  id: number;
  name: string;
  discipline: string;
  service_type: string;
  duration_min: number;
  price: string;
  capacity: number;
  service_config?: any;
  is_active: boolean;
};

type StepId = 1 | 2 | 3;

type FormErrors = {
  serviceName?: string;
  serviceDiscipline?: string;
  serviceDurationMin?: string;
  servicePrice?: string;
  serviceCapacity?: string;
  selectedCourtNames?: string;
  courtMinAdvanceHours?: string;
  courtCancellationHours?: string;
  courtPrepayPercent?: string;
  courtPeakPrice?: string;
};

export default function ProfessionalServicesPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [log, setLog] = useState("Listo");
  const [step, setStep] = useState<StepId>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

  const [serviceName, setServiceName] = useState("Alquiler cancha futbol");
  const [serviceType, setServiceType] = useState("turno");
  const [serviceDiscipline, setServiceDiscipline] = useState("General");
  const [serviceDurationMin, setServiceDurationMin] = useState("60");
  const [servicePrice, setServicePrice] = useState("12000");
  const [serviceCapacity, setServiceCapacity] = useState("1");
  const [courtMinAdvanceHours, setCourtMinAdvanceHours] = useState("2");
  const [courtCancellationHours, setCourtCancellationHours] = useState("24");
  const [courtPrepayPercent, setCourtPrepayPercent] = useState("30");
  const [courtPeakStart, setCourtPeakStart] = useState("18:00");
  const [courtPeakEnd, setCourtPeakEnd] = useState("22:00");
  const [courtPeakPrice, setCourtPeakPrice] = useState("18000");
  const [selectedCourtNames, setSelectedCourtNames] = useState<string[]>([]);

  const activeTenant = useMemo(
    () => tenants.find((item) => String(item.id) === tenantId) || null,
    [tenants, tenantId]
  );
  const tenantIsCourt = activeTenant?.establishment_type === "cancha";
  const tenantCourts = useMemo(
    () => (Array.isArray(activeTenant?.court_config) ? activeTenant.court_config : []),
    [activeTenant?.court_config]
  );
  const courtService = tenantIsCourt || serviceType === "alquiler_cancha";

  const formErrors = useMemo<FormErrors>(() => {
    const errors: FormErrors = {};
    const duration = Number(serviceDurationMin || 0);
    const price = Number(servicePrice || 0);
    const capacity = Number(serviceCapacity || 0);
    if (!serviceName.trim()) errors.serviceName = "Ingresa nombre.";
    if (!serviceDiscipline.trim()) errors.serviceDiscipline = "Ingresa disciplina.";
    if (!Number.isFinite(duration) || duration < 15) errors.serviceDurationMin = "Minimo 15 minutos.";
    if (!Number.isFinite(price) || price < 0) errors.servicePrice = "Precio invalido.";
    if (!Number.isFinite(capacity) || capacity < 1) errors.serviceCapacity = "Capacidad minima 1.";

    if (courtService) {
      const minAdvance = Number(courtMinAdvanceHours || 0);
      const cancellation = Number(courtCancellationHours || 0);
      const prepay = Number(courtPrepayPercent || 0);
      const peakPrice = Number(courtPeakPrice || 0);
      if (selectedCourtNames.length === 0) errors.selectedCourtNames = "Selecciona al menos una cancha.";
      if (!Number.isFinite(minAdvance) || minAdvance < 0) errors.courtMinAdvanceHours = "Valor invalido.";
      if (!Number.isFinite(cancellation) || cancellation < 0) errors.courtCancellationHours = "Valor invalido.";
      if (!Number.isFinite(prepay) || prepay < 0 || prepay > 100) errors.courtPrepayPercent = "Debe estar entre 0 y 100.";
      if (!Number.isFinite(peakPrice) || peakPrice < 0) errors.courtPeakPrice = "Precio invalido.";
    }
    return errors;
  }, [
    serviceName,
    serviceDiscipline,
    serviceDurationMin,
    servicePrice,
    serviceCapacity,
    courtService,
    selectedCourtNames,
    courtMinAdvanceHours,
    courtCancellationHours,
    courtPrepayPercent,
    courtPeakPrice,
  ]);

  const stepHasErrors = useMemo(() => {
    if (step === 1) {
      return Boolean(
        formErrors.serviceName ||
        formErrors.serviceDiscipline ||
        formErrors.serviceDurationMin ||
        formErrors.servicePrice ||
        formErrors.serviceCapacity
      );
    }
    if (step === 2 && courtService) {
      return Boolean(
        formErrors.selectedCourtNames ||
        formErrors.courtMinAdvanceHours ||
        formErrors.courtCancellationHours ||
        formErrors.courtPrepayPercent ||
        formErrors.courtPeakPrice
      );
    }
    return false;
  }, [step, formErrors, courtService]);

  useEffect(() => {
    const session = getSession();
    if (!session.token) {
      router.replace("/login");
      return;
    }
    setToken(session.token);
    setTenantId(session.tenantId || "");
    void refresh(session.token, session.tenantId || "");
  }, [router]);

  useEffect(() => {
    if (!tenantIsCourt) return;
    if (serviceType !== "alquiler_cancha") {
      setServiceType("alquiler_cancha");
    }
    if (!serviceDiscipline.trim() || serviceDiscipline === "General") {
      setServiceDiscipline("Canchas");
    }
  }, [tenantIsCourt, serviceType, serviceDiscipline]);

  useEffect(() => {
    const availableCourtNames = tenantCourts.map((court, index) => String(court?.name || `Cancha ${index + 1}`));
    setSelectedCourtNames((current) => {
      const next = current.filter((name) => availableCourtNames.includes(name));
      if (next.length === current.length && next.every((name, idx) => name === current[idx])) {
        return current;
      }
      return next;
    });
  }, [tenantId, tenantCourts]);

  async function refresh(activeToken = token, selectedTenantId = tenantId) {
    try {
      const loadedTenants = await apiRequest<Tenant[]>("/tenants", { token: activeToken });
      setTenants(loadedTenants);
      const effectiveTenantId = selectedTenantId || (loadedTenants[0] ? String(loadedTenants[0].id) : "");
      if (effectiveTenantId) {
        setTenantId(effectiveTenantId);
        setActiveTenant(effectiveTenantId);
        const loadedServices = await apiRequest<Service[]>("/services", {
          token: activeToken,
          tenantId: effectiveTenantId,
        });
        setServices(loadedServices);
      } else {
        setServices([]);
      }
      setLog("Servicios actualizados");
    } catch (error: any) {
      setLog(`Error: ${error.message}`);
    }
  }

  function toggleCourtSelection(courtName: string) {
    setSelectedCourtNames((current) =>
      current.includes(courtName)
        ? current.filter((name) => name !== courtName)
        : [...current, courtName]
    );
  }

  function buildPayload() {
    const payload: any = {
      name: serviceName.trim(),
      discipline: serviceDiscipline.trim(),
      service_type: serviceType,
      duration_min: Number(serviceDurationMin || 60),
      price: Number(servicePrice || 0),
      capacity: Number(serviceCapacity || 1),
      is_online: false,
      is_active: true,
    };

    if (courtService) {
      payload.service_type = "alquiler_cancha";
      payload.discipline = "Canchas";
      payload.service_config = {
        booking_mode: "per_court",
        min_advance_hours: Number(courtMinAdvanceHours || 2),
        cancellation_hours: Number(courtCancellationHours || 24),
        prepay_percent: Number(courtPrepayPercent || 0),
        peak_pricing: {
          start: courtPeakStart,
          end: courtPeakEnd,
          peak_price: Number(courtPeakPrice || 0),
        },
        included_courts: tenantCourts.filter((court, index) =>
          selectedCourtNames.includes(String(court?.name || `Cancha ${index + 1}`))
        ),
      };
    }
    return payload;
  }

  function resetForm() {
    setServiceName("Alquiler cancha futbol");
    setServiceType(tenantIsCourt ? "alquiler_cancha" : "turno");
    setServiceDiscipline(tenantIsCourt ? "Canchas" : "General");
    setServiceDurationMin("60");
    setServicePrice("12000");
    setServiceCapacity("1");
    setCourtMinAdvanceHours("2");
    setCourtCancellationHours("24");
    setCourtPrepayPercent("30");
    setCourtPeakStart("18:00");
    setCourtPeakEnd("22:00");
    setCourtPeakPrice("18000");
    setSelectedCourtNames([]);
    setStep(1);
    setEditingServiceId(null);
  }

  async function saveService() {
    if (!tenantId) {
      setLog("Selecciona una sucursal.");
      return;
    }
    if (Object.keys(formErrors).length > 0) {
      setLog("Revisa los campos con error.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingServiceId) {
        await apiRequest(`/services/${editingServiceId}`, {
          method: "PATCH",
          token,
          tenantId,
          body: buildPayload(),
        });
      } else {
        await apiRequest("/services", {
          method: "POST",
          token,
          tenantId,
          body: buildPayload(),
        });
      }
      const now = new Date().toLocaleTimeString("es-AR");
      setSavedAt(now);
      setLog(`${editingServiceId ? "Servicio actualizado" : "Servicio guardado"} a las ${now}`);
      resetForm();
      await refresh(token, tenantId);
    } catch (error: any) {
      setLog(`Error guardando servicio: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteService(id: number) {
    const target = services.find((item) => item.id === id);
    const confirmed = window.confirm(`Eliminar servicio "${target?.name || id}"?`);
    if (!confirmed) return;
    try {
      await apiRequest(`/services/${id}`, { method: "DELETE", token, tenantId });
      setLog(`Servicio eliminado: ${target?.name || id}`);
      await refresh(token, tenantId);
    } catch (error: any) {
      setLog(`Error eliminando servicio: ${error.message}`);
    }
  }

  async function toggleServiceStatus(service: Service) {
    try {
      await apiRequest(`/services/${service.id}`, {
        method: "PATCH",
        token,
        tenantId,
        body: { is_active: !service.is_active },
      });
      setLog(`Servicio ${service.is_active ? "desactivado" : "activado"}: ${service.name}`);
      await refresh(token, tenantId);
    } catch (error: any) {
      setLog(`Error actualizando servicio: ${error.message}`);
    }
  }

  function editService(service: Service) {
    const cfg = service.service_config || {};
    const peak = cfg.peak_pricing || {};
    const includedCourts = Array.isArray(cfg.included_courts) ? cfg.included_courts : [];
    setEditingServiceId(service.id);
    setServiceName(service.name || "");
    setServiceType(service.service_type || "turno");
    setServiceDiscipline(service.discipline || "General");
    setServiceDurationMin(String(service.duration_min || 60));
    setServicePrice(String(service.price || "0"));
    setServiceCapacity(String(service.capacity || 1));
    setCourtMinAdvanceHours(String(cfg.min_advance_hours ?? 2));
    setCourtCancellationHours(String(cfg.cancellation_hours ?? 24));
    setCourtPrepayPercent(String(cfg.prepay_percent ?? 0));
    setCourtPeakStart(String(peak.start || "18:00"));
    setCourtPeakEnd(String(peak.end || "22:00"));
    setCourtPeakPrice(String(peak.peak_price ?? service.price ?? 0));
    setSelectedCourtNames(
      includedCourts.map((court: any, index: number) => String(court?.name || `Cancha ${index + 1}`))
    );
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setLog(`Editando servicio: ${service.name}`);
  }

  function duplicateToForm(service: Service, variantMinutes = 0) {
    const cfg = service.service_config || {};
    const peak = cfg.peak_pricing || {};
    const includedCourts = Array.isArray(cfg.included_courts) ? cfg.included_courts : [];
    setServiceName(variantMinutes > 0 ? `${service.name} ${service.duration_min + variantMinutes} min` : `${service.name} (copia)`);
    setServiceType(service.service_type || "turno");
    setServiceDiscipline(service.discipline || "General");
    setServiceDurationMin(String((service.duration_min || 60) + variantMinutes));
    setServicePrice(String(service.price || "0"));
    setServiceCapacity(String(service.capacity || 1));
    setCourtMinAdvanceHours(String(cfg.min_advance_hours ?? 2));
    setCourtCancellationHours(String(cfg.cancellation_hours ?? 24));
    setCourtPrepayPercent(String(cfg.prepay_percent ?? 0));
    setCourtPeakStart(String(peak.start || "18:00"));
    setCourtPeakEnd(String(peak.end || "22:00"));
    setCourtPeakPrice(String(peak.peak_price ?? service.price ?? 0));
    setSelectedCourtNames(
      includedCourts.map((court: any, index: number) => String(court?.name || `Cancha ${index + 1}`))
    );
    setStep(1);
    setEditingServiceId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setLog(`Servicio cargado en formulario: ${service.name}`);
  }

  function nextStep() {
    if (stepHasErrors) {
      setLog("Completa los campos requeridos antes de continuar.");
      return;
    }
    if (step === 1) setStep(courtService ? 2 : 3);
    if (step === 2) setStep(3);
  }

  function prevStep() {
    if (step === 3) setStep(courtService ? 2 : 1);
    if (step === 2) setStep(1);
  }

  return (
    <main className="onboardingPage">
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <h1 className="sectionTitle">Configurar servicios</h1>
      <p className="small">Flujo guiado para crear servicios con reglas claras.</p>

      <section className="card onboardingStep">
        <h2>Sucursal activa</h2>
        <div className="formGrid">
          <div className="fieldStack">
            <label className="fieldLabel">Sucursal</label>
            <select
              className="input"
              value={tenantId}
              onChange={(e) => {
                const nextTenantId = e.target.value;
                setTenantId(nextTenantId);
                setActiveTenant(nextTenantId);
                void refresh(token, nextTenantId);
              }}
            >
              <option value="">Seleccionar sucursal</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </div>
          <div className="fieldStack">
            <label className="fieldLabel">Tipo y canchas</label>
            <input className="input" value={activeTenant ? `${activeTenant.establishment_type} (${tenantCourts.length} canchas)` : "-"} readOnly />
          </div>
          <div className="fieldStack">
            <label className="fieldLabel">Actualizar datos</label>
            <button className="mutedBtn" onClick={() => refresh()}>Refrescar</button>
          </div>
        </div>
      </section>

      <div className="serviceWizardLayout">
        <section className="card onboardingStep">
          <div className="serviceWizardSteps">
            <button type="button" className={`chip ${step === 1 ? "active" : ""}`} onClick={() => setStep(1)}>1. Datos base</button>
            {courtService ? <button type="button" className={`chip ${step === 2 ? "active" : ""}`} onClick={() => setStep(2)}>2. Reglas canchas</button> : null}
            <button type="button" className={`chip ${step === 3 ? "active" : ""}`} onClick={() => setStep(3)}>3. Confirmar</button>
            {editingServiceId ? <span className="badge">Editando #{editingServiceId}</span> : null}
          </div>

          {step === 1 ? (
            <>
              <h2>Datos base</h2>
              <div className="formGrid">
                <div className="fieldStack">
                  <label className="fieldLabel">Nombre del servicio</label>
                  <input className="input" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
                  {formErrors.serviceName ? <span className="fieldError">{formErrors.serviceName}</span> : null}
                </div>
                <div className="fieldStack">
                  <label className="fieldLabel">Tipo de servicio</label>
                  <select className="input" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                    <option value="turno">Turno</option>
                    <option value="clase_grupal">Clase grupal</option>
                    <option value="tratamiento">Tratamiento</option>
                    <option value="alquiler_cancha">Alquiler cancha</option>
                  </select>
                </div>
                <div className="fieldStack">
                  <label className="fieldLabel">Disciplina</label>
                  <input className="input" value={serviceDiscipline} onChange={(e) => setServiceDiscipline(e.target.value)} />
                  {formErrors.serviceDiscipline ? <span className="fieldError">{formErrors.serviceDiscipline}</span> : null}
                </div>
              </div>
              <div className="formGrid" style={{ marginTop: 8 }}>
                <div className="fieldStack">
                  <label className="fieldLabel">Duracion (minutos)</label>
                  <input className="input" type="number" min={15} value={serviceDurationMin} onChange={(e) => setServiceDurationMin(e.target.value)} />
                  {formErrors.serviceDurationMin ? <span className="fieldError">{formErrors.serviceDurationMin}</span> : null}
                </div>
                <div className="fieldStack">
                  <label className="fieldLabel">Precio base</label>
                  <input className="input" type="number" min={0} value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} />
                  {formErrors.servicePrice ? <span className="fieldError">{formErrors.servicePrice}</span> : null}
                </div>
                <div className="fieldStack">
                  <label className="fieldLabel">Capacidad</label>
                  <input className="input" type="number" min={1} value={serviceCapacity} onChange={(e) => setServiceCapacity(e.target.value)} />
                  {formErrors.serviceCapacity ? <span className="fieldError">{formErrors.serviceCapacity}</span> : null}
                </div>
              </div>
            </>
          ) : null}

          {step === 2 && courtService ? (
            <>
              <h2>Reglas de canchas</h2>
              <section className="courtBuilder">
                <div className="courtBuilderHeader">
                  <div>
                    <h3>Reserva por cancha</h3>
                    <p className="small">Configura anticipo, cancelacion, prepago y franja pico.</p>
                  </div>
                  <div className="courtSummaryChips">
                    <span className="badge">{tenantCourts.length} canchas disponibles</span>
                    <span className="badge">{selectedCourtNames.length} seleccionadas</span>
                  </div>
                </div>
                <div className="formGrid">
                  <div className="fieldStack">
                    <label className="fieldLabel">Anticipo minimo (horas)</label>
                    <input className="input" type="number" min={0} value={courtMinAdvanceHours} onChange={(e) => setCourtMinAdvanceHours(e.target.value)} />
                    {formErrors.courtMinAdvanceHours ? <span className="fieldError">{formErrors.courtMinAdvanceHours}</span> : null}
                  </div>
                  <div className="fieldStack">
                    <label className="fieldLabel">Cancelacion sin cargo (horas)</label>
                    <input className="input" type="number" min={0} value={courtCancellationHours} onChange={(e) => setCourtCancellationHours(e.target.value)} />
                    {formErrors.courtCancellationHours ? <span className="fieldError">{formErrors.courtCancellationHours}</span> : null}
                  </div>
                  <div className="fieldStack">
                    <label className="fieldLabel">Prepago (%)</label>
                    <input className="input" type="number" min={0} max={100} value={courtPrepayPercent} onChange={(e) => setCourtPrepayPercent(e.target.value)} />
                    {formErrors.courtPrepayPercent ? <span className="fieldError">{formErrors.courtPrepayPercent}</span> : null}
                  </div>
                </div>
                <div className="formGrid" style={{ marginTop: 8 }}>
                  <div className="fieldStack">
                    <label className="fieldLabel">Hora inicio franja pico</label>
                    <input className="input" type="time" value={courtPeakStart} onChange={(e) => setCourtPeakStart(e.target.value)} />
                  </div>
                  <div className="fieldStack">
                    <label className="fieldLabel">Hora fin franja pico</label>
                    <input className="input" type="time" value={courtPeakEnd} onChange={(e) => setCourtPeakEnd(e.target.value)} />
                  </div>
                  <div className="fieldStack">
                    <label className="fieldLabel">Precio franja pico</label>
                    <input className="input" type="number" min={0} value={courtPeakPrice} onChange={(e) => setCourtPeakPrice(e.target.value)} />
                    {formErrors.courtPeakPrice ? <span className="fieldError">{formErrors.courtPeakPrice}</span> : null}
                  </div>
                </div>
                <p className="small" style={{ marginTop: 8 }}>Canchas incluidas</p>
                <div className="chipRow" style={{ marginTop: 6 }}>
                  {tenantCourts.length === 0 ? (
                    <span className="small">No hay canchas cargadas en esta sucursal.</span>
                  ) : (
                    tenantCourts.map((court, index) => {
                      const courtName = String(court.name || `Cancha ${index + 1}`);
                      return (
                        <button
                          key={`${courtName}-${index}`}
                          type="button"
                          className={`chip ${selectedCourtNames.includes(courtName) ? "active" : ""}`}
                          onClick={() => toggleCourtSelection(courtName)}
                        >
                          {courtName}
                        </button>
                      );
                    })
                  )}
                </div>
                {formErrors.selectedCourtNames ? <span className="fieldError">{formErrors.selectedCourtNames}</span> : null}
              </section>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h2>Confirmacion</h2>
              <table className="summaryTable">
                <tbody>
                  <tr><th>Nombre</th><td>{serviceName || "-"}</td></tr>
                  <tr><th>Tipo</th><td>{courtService ? "alquiler_cancha" : serviceType}</td></tr>
                  <tr><th>Disciplina</th><td>{courtService ? "Canchas" : serviceDiscipline || "-"}</td></tr>
                  <tr><th>Duracion</th><td>{serviceDurationMin} min</td></tr>
                  <tr><th>Precio base</th><td>ARS {servicePrice}</td></tr>
                  <tr><th>Capacidad</th><td>{serviceCapacity}</td></tr>
                  {courtService ? <tr><th>Canchas incluidas</th><td>{selectedCourtNames.join(", ") || "-"}</td></tr> : null}
                </tbody>
              </table>
              {savedAt ? <p className="small" style={{ marginTop: 8 }}>Ultimo guardado exitoso: {savedAt}</p> : null}
            </>
          ) : null}

          <div className="linkRow">
            {step > 1 ? <button className="mutedBtn" onClick={prevStep}>Anterior</button> : null}
            {step < 3 ? <button className="mutedBtn" onClick={nextStep}>Siguiente</button> : null}
            {step === 3 ? (
              <button className="linkBtn" onClick={saveService} disabled={isSaving || Object.keys(formErrors).length > 0}>
                {isSaving ? "Guardando..." : editingServiceId ? "Actualizar servicio" : "Guardar servicio"}
              </button>
            ) : null}
            <button className="mutedBtn" onClick={resetForm}>Limpiar</button>
            {editingServiceId ? <button className="mutedBtn" onClick={resetForm}>Cancelar edicion</button> : null}
          </div>
        </section>

        <aside className="card serviceSummaryCard">
          <h2>Resumen</h2>
          <div className="serviceSummaryList">
            <div><strong>Sucursal:</strong> {activeTenant?.name || "-"}</div>
            <div><strong>Paso actual:</strong> {step}/3</div>
            <div><strong>Tipo:</strong> {courtService ? "alquiler_cancha" : serviceType}</div>
            <div><strong>Precio:</strong> ARS {servicePrice || "0"}</div>
            <div><strong>Duracion:</strong> {serviceDurationMin || "0"} min</div>
            <div><strong>Canchas:</strong> {selectedCourtNames.length}</div>
          </div>
          {Object.keys(formErrors).length > 0 ? (
            <div className="feedbackBanner error" style={{ marginTop: 10 }}>
              Hay campos pendientes o invalidos.
            </div>
          ) : (
            <div className="feedbackBanner ok" style={{ marginTop: 10 }}>
              Formulario listo para guardar.
            </div>
          )}
        </aside>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Servicios configurados</h2>
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Tipo</th>
                <th>Precio</th>
                <th>Duracion</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {services.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.service_type}</td>
                  <td>ARS {item.price}</td>
                  <td>{item.duration_min} min</td>
                  <td><span className="badge">{item.is_active ? "activo" : "inactivo"}</span></td>
                  <td>
                    <div className="tableActions">
                      <button className="mutedBtn" onClick={() => editService(item)}>Editar</button>
                      <button className="mutedBtn" onClick={() => duplicateToForm(item)}>Duplicar</button>
                      <button className="mutedBtn" onClick={() => duplicateToForm(item, 30)}>+30 min</button>
                      <button className="mutedBtn" onClick={() => void toggleServiceStatus(item)}>{item.is_active ? "Desactivar" : "Activar"}</button>
                      <button className="mutedBtn" onClick={() => void deleteService(item.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="linkRow">
        <Link className="mutedBtn" href="/professional/tenants">Volver onboarding</Link>
        <Link className="mutedBtn" href="/professional/dashboard">Volver dashboard</Link>
      </div>

      <pre className="pre">{log}</pre>
    </main>
  );
}
