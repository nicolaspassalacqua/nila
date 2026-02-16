"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { saveSession, UserProfile } from "@/lib/session";

type Tenant = { id: number; name: string; slug: string };

type GoogleAuthResponse = {
  access: string;
  refresh: string;
  tenant_id: number | null;
  user: UserProfile;
};

type GoogleAuthConfigResponse = {
  enabled: boolean;
  client_id: string;
  facebook_enabled: boolean;
  facebook_app_id: string;
};

type FieldErrors = {
  username?: string;
  password?: string;
  email?: string;
  fullName?: string;
  phone?: string;
};

declare global {
  interface Window {
    google?: any;
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [roleTarget, setRoleTarget] = useState<"client" | "professional">("client");

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin12345");
  const [email, setEmail] = useState("admin@nila.local");
  const [fullName, setFullName] = useState("Admin NILA");
  const [phone, setPhone] = useState("+5491100000000");
  const [rememberMe, setRememberMe] = useState(true);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [message, setMessage] = useState("Ingresa para usar la plataforma completa.");
  const [googleClientId, setGoogleClientId] = useState(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "");
  const [facebookAppId, setFacebookAppId] = useState(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "");
  const googleEnabled = googleClientId.trim().length > 0;
  const facebookEnabled = facebookAppId.trim().length > 0;
  const actionLabel = useMemo(() => (mode === "login" ? "Acceder a mi espacio" : "Crear cuenta"), [mode]);
  const heroRole = roleTarget;
  const [heroImageSrc, setHeroImageSrc] = useState("/images/login-client.png");
  const roleTargetRef = useRef<"client" | "professional">("client");

  useEffect(() => {
    roleTargetRef.current = roleTarget;
  }, [roleTarget]);

  useEffect(() => {
    setHeroImageSrc(heroRole === "client" ? "/images/login-client.png" : "/images/login-professional.png");
  }, [heroRole]);

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strengthLabel = useMemo(() => {
    if (passwordStrength <= 1) return "Baja";
    if (passwordStrength <= 3) return "Media";
    return "Alta";
  }, [passwordStrength]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const config = await apiRequest<GoogleAuthConfigResponse>("/auth/google/config");
        if (!isMounted) return;
        if (config.enabled && config.client_id.trim().length > 0) {
          setGoogleClientId(config.client_id.trim());
        }
        if (config.facebook_enabled && config.facebook_app_id.trim().length > 0) {
          setFacebookAppId(config.facebook_app_id.trim());
        }
      } catch {
        // si falla, se mantiene la configuracion via env
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!googleEnabled) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: { credential: string }) => {
          await handleGoogleAuth(response.credential);
        },
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 320,
      });
    };

    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [googleClientId, googleEnabled]);

  useEffect(() => {
    if (!facebookEnabled) return;

    window.fbAsyncInit = () => {
      if (!window.FB) return;
      window.FB.init({
        appId: facebookAppId,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
    };

    const existingScript = document.getElementById("facebook-jssdk");
    if (existingScript) {
      if (window.fbAsyncInit) window.fbAsyncInit();
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    document.body.appendChild(script);

    return () => {
      delete window.fbAsyncInit;
    };
  }, [facebookAppId, facebookEnabled]);

  function routeByRole(
    targetRole: "client" | "professional" = roleTargetRef.current,
    hasTenant = true
  ) {
    if (targetRole === "professional") {
      router.push(hasTenant ? "/professional/dashboard" : "/professional/tenants");
      return;
    }
    router.push("/client/dashboard");
  }

  function switchMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setErrors({});
  }

  function validateFields(): FieldErrors {
    const next: FieldErrors = {};

    if (!username.trim()) {
      next.username = "Ingresa tu usuario.";
    }
    if (!password || password.length < 8) {
      next.password = "La clave debe tener al menos 8 caracteres.";
    }

    if (mode === "register") {
      if (!email.trim() || !email.includes("@")) {
        next.email = "Ingresa un email valido.";
      }
      if (!fullName.trim()) {
        next.fullName = "Ingresa tu nombre completo.";
      }
      if (!phone.trim()) {
        next.phone = "Ingresa tu telefono.";
      }
    }

    return next;
  }

  async function completeSessionFromClassic(accessToken: string) {
    const targetRole = roleTargetRef.current;
    const [user, tenants] = await Promise.all([
      apiRequest<UserProfile>("/auth/me", { token: accessToken }),
      apiRequest<Tenant[]>("/tenants", { token: accessToken }),
    ]);

    const defaultTenant = tenants.find((t) => t.slug === "demo-center") || tenants[0];
    if (!defaultTenant) {
      if (targetRole === "professional") {
        saveSession(
          {
            token: accessToken,
            tenantId: "",
            user,
          },
          rememberMe
        );
        setAuthSuccess(true);
        setMessage("Sesion iniciada. Completa el Paso 1 creando tu empresa.");
        setTimeout(() => routeByRole(targetRole, false), 250);
        return;
      }
      throw new Error("No hay establecimientos activos para esta cuenta.");
    }

    saveSession(
      {
        token: accessToken,
        tenantId: String(defaultTenant.id),
        user,
      },
      rememberMe
    );

    setAuthSuccess(true);
    setMessage(`Sesion iniciada. Tenant activo: ${defaultTenant.name}`);
    setTimeout(() => routeByRole(targetRole, true), 250);
  }

  async function handleGoogleAuth(idToken: string) {
    const targetRole = roleTargetRef.current;
    setLoading(true);
    setMessage("Autenticando con Google...");

    try {
      const data = await apiRequest<GoogleAuthResponse>("/auth/google", {
        method: "POST",
        body: { id_token: idToken },
      });

      saveSession(
        {
          token: data.access,
          tenantId: data.tenant_id ? String(data.tenant_id) : "",
          user: data.user,
        },
        rememberMe
      );

      setAuthSuccess(true);
      const hasTenant = Boolean(data.tenant_id);
      setMessage(
        hasTenant
          ? `Sesion Google iniciada para ${data.user.email}`
          : "Sesion Google iniciada. Completa el Paso 1 creando tu empresa."
      );
      setTimeout(() => routeByRole(targetRole, hasTenant), 250);
    } catch (error: any) {
      setMessage(`Google error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleFacebookAuth(accessToken: string) {
    const targetRole = roleTargetRef.current;
    setLoading(true);
    setMessage("Autenticando con Facebook...");

    try {
      const data = await apiRequest<GoogleAuthResponse>("/auth/facebook", {
        method: "POST",
        body: { access_token: accessToken },
      });

      saveSession(
        {
          token: data.access,
          tenantId: data.tenant_id ? String(data.tenant_id) : "",
          user: data.user,
        },
        rememberMe
      );

      setAuthSuccess(true);
      const hasTenant = Boolean(data.tenant_id);
      setMessage(
        hasTenant
          ? `Sesion Facebook iniciada para ${data.user.email}`
          : "Sesion Facebook iniciada. Completa el Paso 1 creando tu empresa."
      );
      setTimeout(() => routeByRole(targetRole, hasTenant), 250);
    } catch (error: any) {
      setMessage(`Facebook error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function startFacebookLogin() {
    if (!facebookEnabled) {
      setMessage("Facebook no configurado.");
      return;
    }
    if (!window.FB) {
      setMessage("SDK de Facebook aun no cargado.");
      return;
    }

    window.FB.login(
      async (response: any) => {
        const accessToken = response?.authResponse?.accessToken;
        if (!accessToken) {
          setMessage("Login Facebook cancelado o sin permisos.");
          return;
        }
        await handleFacebookAuth(accessToken);
      },
      { scope: "public_profile,email" }
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const validation = validateFields();
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setMessage("Revisa los campos marcados.");
      return;
    }

    setLoading(true);
    setMessage("Procesando...");

    try {
      if (mode === "register") {
        await apiRequest("/auth/register", {
          method: "POST",
          body: { username, password, email, full_name: fullName, phone },
        });
      }

      const auth = await apiRequest<{ access: string }>("/auth/token", {
        method: "POST",
        body: { username, password },
      });

      await completeSessionFromClassic(auth.access);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    setMessage("Recuperacion: por ahora contactar soporte en soporte@nila.local.");
  }

  return (
    <main className="loginShell">
      <section className="loginHero">
        <div className={`loginHeroImageWrap ${heroRole === "client" ? "clientMode" : "professionalMode"}`} aria-hidden="true">
          <img
            src={heroImageSrc}
            alt=""
            className={`loginHeroImage ${heroRole === "client" ? "clientMode" : "professionalMode"}`}
            onError={() => setHeroImageSrc(heroRole === "client" ? "/images/login-client.png" : "/images/login-professional.png")}
          />
        </div>
      </section>

      <section className={`loginPanel card ${authSuccess ? "authSuccess" : ""}`}>
        <div className="loginHeader">
          <h2>Acceso seguro</h2>
          <span className="badge">NILA Platform</span>
        </div>
        <p className="small">
          {mode === "login"
            ? "Inicia sesion para entrar a tu espacio de trabajo."
            : "Crea tu cuenta para comenzar a operar en la plataforma."}
        </p>

        <div className="portalSwitch" role="tablist" aria-label="Seleccionar portal">
          <button
            className={`portalCard ${roleTarget === "client" ? "active" : ""}`}
            type="button"
            onClick={() => setRoleTarget("client")}
            aria-selected={roleTarget === "client"}
          >
            <span className="portalTitleRow">
              <span className="portalIcon" aria-hidden="true">C</span>
              <span className="portalTitle">Portal Cliente</span>
            </span>
            <span className="portalDesc">Reservas, agenda y seguimiento.</span>
          </button>
          <button
            className={`portalCard ${roleTarget === "professional" ? "active" : ""}`}
            type="button"
            onClick={() => setRoleTarget("professional")}
            aria-selected={roleTarget === "professional"}
          >
            <span className="portalTitleRow">
              <span className="portalIcon" aria-hidden="true">P</span>
              <span className="portalTitle">Portal Profesional</span>
            </span>
            <span className="portalDesc">Agenda, CRM, POS y operaciones.</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="loginForm">
          <div className="formGrid formGridTwo">
            <div className="field">
              <input className="input" placeholder=" " value={username} onChange={(e) => setUsername(e.target.value)} />
              <label>Email o usuario</label>
              {errors.username && <span className="fieldError">{errors.username}</span>}
            </div>

            <div className="field">
              <input className="input" placeholder=" " type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <label>Contrasena</label>
              {errors.password && <span className="fieldError">{errors.password}</span>}
            </div>
          </div>

          <div className="passwordMeter">
            <div className={`passwordBar strength-${passwordStrength}`} />
            <span className="small">Seguridad: {strengthLabel}</span>
          </div>

          <div className={`registerFields ${mode === "register" ? "open" : "closed"}`}>
            {mode === "register" && (
              <div className="formGrid" style={{ marginTop: 10 }}>
                <div className="field">
                  <input className="input" placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} />
                  <label>Email</label>
                  {errors.email && <span className="fieldError">{errors.email}</span>}
                </div>

                <div className="field">
                  <input className="input" placeholder=" " value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <label>Nombre completo</label>
                  {errors.fullName && <span className="fieldError">{errors.fullName}</span>}
                </div>

                <div className="field">
                  <input className="input" placeholder=" " value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <label>Telefono</label>
                  {errors.phone && <span className="fieldError">{errors.phone}</span>}
                </div>
              </div>
            )}
          </div>

          <div className="authOptions">
            <label className="rememberCheck">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <span>Recordarme</span>
            </label>
            <button className="textBtn" type="button" onClick={handleForgotPassword}>Olvide mi clave</button>
          </div>

          <div className="linkRow">
            <button className="linkBtn actionBtn" type="submit" disabled={loading}>{loading ? "Procesando..." : actionLabel}</button>
          </div>

          <div className="authInlineSwitch">
            {mode === "login" ? (
              <>
                <span className="small">No tienes cuenta?</span>
                <button className="textBtn" type="button" onClick={() => switchMode("register")}>Crear una cuenta</button>
              </>
            ) : (
              <>
                <span className="small">Ya tienes cuenta?</span>
                <button className="textBtn" type="button" onClick={() => switchMode("login")}>Iniciar sesion</button>
              </>
            )}
          </div>
        </form>

        <div className="loginDivider"><span>O ingresa de forma rapida con</span></div>

        <div className="googleWrap">
          {googleEnabled ? (
            <div ref={googleButtonRef} />
          ) : (
            <button className="mutedBtn" type="button" disabled>Google no configurado</button>
          )}

          {facebookEnabled ? (
            <button className="facebookBtn" type="button" onClick={startFacebookLogin} disabled={loading}>
              Continuar con Facebook
            </button>
          ) : (
            <button className="mutedBtn" type="button" disabled>Facebook no configurado</button>
          )}

          <p className="small">
            {googleEnabled || facebookEnabled
              ? "Accede de forma rapida con tu cuenta social."
              : "Pronto sumaremos mas metodos de acceso."}
          </p>
        </div>

        <pre className="pre">{message}</pre>
      </section>
    </main>
  );
}

