import { defineMessages } from "@/i18n";

export const welcomeMessages = defineMessages({
  en: {
    welcomeBack: "Welcome back",
    welcomeBackName: (name: string) => `Welcome back, ${name}`,
    whereToStart: "Where would you like to start?",
    urgentTop3: "Urgent · top 3",
    allClear: "Nothing urgent right now. You're all clear.",
    updated: (ago: string) => `Updated ${ago}`,
    choosePath: "Choose your path",
    paths: {
      "/sevra": { title: "SEVRA · Social Intel", description: "Monitor signals and triage mentions in real time." },
      "/dashboard": { title: "Dashboard", description: "Full picture across incidents and channels." },
      "/incidents/new": { title: "Manual Incident", description: "Log an incident detected outside automation." },
      "/reports": { title: "Reports", description: "Performance, trends and post‑mortems." },
      "/admin": { title: "Admin", description: "Team, brand and platform settings." },
    } as Record<string, { title: string; description: string }>,
    controlPlane: "Sevra control plane",
  },
  es: {
    welcomeBack: "Hola de nuevo",
    welcomeBackName: (name: string) => `Hola de nuevo, ${name}`,
    whereToStart: "¿Por dónde quieres empezar?",
    urgentTop3: "Urgente · los 3 principales",
    allClear: "No hay nada urgente ahora mismo. Todo en orden.",
    updated: (ago: string) => `Actualizado ${ago}`,
    choosePath: "Elige tu camino",
    paths: {
      "/sevra": { title: "SEVRA · Inteligencia social", description: "Monitoriza señales y clasifica menciones en tiempo real." },
      "/dashboard": { title: "Panel", description: "La visión completa de incidentes y canales." },
      "/incidents/new": { title: "Incidente manual", description: "Registra un incidente detectado fuera de la automatización." },
      "/reports": { title: "Informes", description: "Rendimiento, tendencias y análisis posteriores." },
      "/admin": { title: "Administración", description: "Equipo, marca y configuración de la plataforma." },
    } as Record<string, { title: string; description: string }>,
    controlPlane: "Panel de control de Sevra",
  },
});
