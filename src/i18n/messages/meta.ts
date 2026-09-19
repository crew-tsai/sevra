import { defineMessages } from "@/i18n";

type Meta = { title: string; description: string };

/** Browser tab titles and descriptions, by route pattern. */
export const metaMessages = defineMessages<{ routes: Record<string, Meta>; fallback: Meta }>({
  en: {
    routes: {
      "/": { title: "Sevra — AI-powered crisis management for modern brands", description: "Sevra helps enterprises detect, decide, and respond to reputation crises in real time with AI-driven social monitoring and playbooks." },
      "/product": { title: "Product — Sevra Crisis Navigator", description: "Explore Sevra's crisis intelligence modules: social monitoring, strategy, asset generation, approvals, and reporting." },
      "/privacy": { title: "Privacy Policy — Sevra", description: "How Sevra, a service of The Stellar Crew LLC, handles information." },
      "/terms": { title: "Terms of Service — Sevra", description: "The terms that govern the use of Sevra." },
      "/data-deletion": { title: "Data Deletion — Sevra", description: "How to have data held by Sevra deleted." },
      "/about": { title: "About Sevra — The team behind crisis-ready brands", description: "Meet the team building Sevra, the AI crisis navigator trusted by communications and risk leaders." },
      "/login": { title: "Log in — Sevra", description: "Sign in to your Sevra crisis management workspace." },
      "/signin": { title: "Sign in — Sevra", description: "Find your company's Sevra workspace." },
      "/reset-password": { title: "Set a new password — Sevra", description: "Choose a new password for your Sevra account." },
      "/unsubscribe": { title: "Unsubscribe — Sevra", description: "Manage your Sevra email notification preferences." },
      "/welcome": { title: "Hub — Sevra", description: "Your crisis command hub: top critical issues, live signals, and quick actions." },
      "/sevra": { title: "Social Intel — Sevra", description: "Real-time social monitoring across X, LinkedIn, Reddit, TikTok, Facebook, and more." },
      "/dashboard": { title: "Dashboard — Sevra", description: "Crisis dashboard: critical issues, status, social mentions, and sentiment analysis." },
      "/incidents/new": { title: "New Incident — Sevra", description: "Manually log a new crisis incident for triage and response." },
      "/incidents/:id": { title: "Incident Detail — Sevra", description: "Full incident timeline, signals, assets, and response actions." },
      "/assets": { title: "Assets — Sevra", description: "AI-generated communications assets ready for review and approval." },
      "/approvals": { title: "Approvals — Sevra", description: "Review and approve crisis communications before publishing." },
      "/workflows": { title: "Workflows — Sevra", description: "Response workflows for your crisis program." },
      "/reports": { title: "Reports — Sevra", description: "Performance and incident reports across your crisis program." },
      "/admin": { title: "Admin — Sevra", description: "Manage your Sevra workspace, members, and configuration." },
      "/audit-log": { title: "Audit Log — Sevra", description: "Complete audit trail of actions across your Sevra workspace." },
    },
    fallback: { title: "Sevra — AI crisis management", description: "Sevra helps brands detect and respond to reputation crises in real time." },
  },
  es: {
    routes: {
      "/": { title: "Sevra — Gestión de crisis con IA para marcas modernas", description: "Sevra ayuda a las empresas a detectar, decidir y responder a crisis de reputación en tiempo real con monitorización social y protocolos impulsados por IA." },
      "/product": { title: "Producto — Sevra Crisis Navigator", description: "Descubre los módulos de inteligencia de crisis de Sevra: monitorización social, estrategia, generación de contenidos, aprobaciones e informes." },
      "/privacy": { title: "Política de privacidad — Sevra", description: "Cómo trata la información Sevra, un servicio de The Stellar Crew LLC." },
      "/terms": { title: "Términos del servicio — Sevra", description: "Los términos que regulan el uso de Sevra." },
      "/data-deletion": { title: "Eliminación de datos — Sevra", description: "Cómo pedir que se eliminen los datos que guarda Sevra." },
      "/about": { title: "Sobre Sevra — El equipo detrás de las marcas preparadas para la crisis", description: "Conoce al equipo que construye Sevra, el navegador de crisis con IA en el que confían los responsables de comunicación y riesgos." },
      "/login": { title: "Iniciar sesión — Sevra", description: "Inicia sesión en tu espacio de trabajo de gestión de crisis de Sevra." },
      "/signin": { title: "Iniciar sesión — Sevra", description: "Encuentra el espacio de trabajo de Sevra de tu empresa." },
      "/reset-password": { title: "Nueva contraseña — Sevra", description: "Elige una nueva contraseña para tu cuenta de Sevra." },
      "/unsubscribe": { title: "Darse de baja — Sevra", description: "Gestiona tus preferencias de notificaciones por correo de Sevra." },
      "/welcome": { title: "Inicio — Sevra", description: "Tu centro de mando de crisis: asuntos críticos, señales en vivo y acciones rápidas." },
      "/sevra": { title: "Inteligencia social — Sevra", description: "Monitorización social en tiempo real en X, LinkedIn, Reddit, TikTok, Facebook y más." },
      "/dashboard": { title: "Panel — Sevra", description: "Panel de crisis: asuntos críticos, estado, menciones sociales y análisis de sentimiento." },
      "/incidents/new": { title: "Nuevo incidente — Sevra", description: "Registra manualmente un nuevo incidente para su clasificación y respuesta." },
      "/incidents/:id": { title: "Detalle del incidente — Sevra", description: "Cronología completa del incidente, señales, contenidos y acciones de respuesta." },
      "/assets": { title: "Contenidos — Sevra", description: "Contenidos de comunicación generados por IA, listos para revisión y aprobación." },
      "/approvals": { title: "Aprobaciones — Sevra", description: "Revisa y aprueba las comunicaciones de crisis antes de publicarlas." },
      "/workflows": { title: "Flujos — Sevra", description: "Flujos de respuesta de tu programa de crisis." },
      "/reports": { title: "Informes — Sevra", description: "Informes de rendimiento e incidentes de tu programa de crisis." },
      "/admin": { title: "Administración — Sevra", description: "Gestiona tu espacio de trabajo, miembros y configuración de Sevra." },
      "/audit-log": { title: "Registro de auditoría — Sevra", description: "Registro completo de las acciones realizadas en tu espacio de trabajo de Sevra." },
    },
    fallback: { title: "Sevra — Gestión de crisis con IA", description: "Sevra ayuda a las marcas a detectar y responder a crisis de reputación en tiempo real." },
  },
});
