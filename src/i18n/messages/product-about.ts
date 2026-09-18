import { defineMessages } from "@/i18n";

export const productMessages = defineMessages({
  en: {
    eyebrow: "Our Product",
    title: "One platform. Every phase of the crisis.",
    intro:
      "Sevra brings together monitoring, decisioning, drafting, approvals and distribution — so your team moves as one when it matters most.",
    dashboardAlt: "Sevra crisis dashboard",
    dashboardCaption: "Live Dashboard — desktop & mobile, same source of truth.",
    modulesHeading: "Platform modules",
    modules: [
      { title: "Signal Monitor", body: "Continuous monitoring across social, news and internal feeds with smart triage and noise reduction.", bullets: ["Multi-source ingestion", "Topic clustering", "Severity scoring"] },
      { title: "Crisis Levels (L0–L4)", body: "Structured framework to classify incidents and trigger the right playbook automatically.", bullets: ["Configurable thresholds", "Risk score 0–100", "Playbook routing"] },
      { title: "Sevra AI Assistant", body: "AI co-pilot that drafts statements, FAQs and internal memos aligned to your brand voice.", bullets: ["Press releases", "Holding statements", "Social posts & FAQs"] },
      { title: "Approvals & Workflow", body: "Multi-stakeholder approval flows with full traceability — from legal to comms to leadership.", bullets: ["Role-based reviewers", "Versioning", "Real-time comments"] },
      { title: "Distribution", body: "Publish approved messages to email, social and internal channels in one click.", bullets: ["Multi-channel delivery", "Audience segmentation", "Performance tracking"] },
      { title: "Live Dashboard", body: "A real-time command center showing active incidents, crisis levels and team status.", bullets: ["Priority queue", "KPIs", "Geographic view"] },
      { title: "Audit Log", body: "Immutable record of every change, approval and publication for compliance and post-mortems.", bullets: ["Field-level history", "Actor & timestamp", "Exportable reports"] },
      { title: "Reports & Insights", body: "Post-incident reports and trend analytics to continuously improve your crisis readiness.", bullets: ["Incident timelines", "Response benchmarks", "Improvement actions"] },
    ],
    aiEyebrow: "Sevra AI",
    aiTitle: "Social signals, instantly classified.",
    aiBody: "SEVRA monitors social channels 24/7, analyzes severity and auto-creates incidents — so nothing slips through.",
    aiAlt: "Sevra AI social intel",
    ctaTitle: "See Sevra in action.",
    ctaBody: "Get a guided tour of the product, mapped to your team's playbooks and industry.",
    requestDemo: "Request a demo",
  },
  es: {
    eyebrow: "Nuestro producto",
    title: "Una plataforma. Cada fase de la crisis.",
    intro:
      "Sevra reúne monitorización, toma de decisiones, redacción, aprobaciones y distribución — para que tu equipo actúe como uno solo cuando más importa.",
    dashboardAlt: "Panel de crisis de Sevra",
    dashboardCaption: "Panel en vivo — escritorio y móvil, la misma fuente de verdad.",
    modulesHeading: "Módulos de la plataforma",
    modules: [
      { title: "Monitor de señales", body: "Monitorización continua de redes sociales, noticias y fuentes internas, con priorización inteligente y reducción de ruido.", bullets: ["Múltiples fuentes", "Agrupación por temas", "Puntuación de gravedad"] },
      { title: "Niveles de crisis (L0–L4)", body: "Un marco estructurado para clasificar incidentes y activar automáticamente el protocolo adecuado.", bullets: ["Umbrales configurables", "Riesgo de 0 a 100", "Asignación de protocolos"] },
      { title: "Asistente Sevra IA", body: "Un copiloto de IA que redacta comunicados, preguntas frecuentes y notas internas con la voz de tu marca.", bullets: ["Notas de prensa", "Comunicados de espera", "Publicaciones y FAQ"] },
      { title: "Aprobaciones y flujos", body: "Flujos de aprobación con varias partes y trazabilidad completa — de legal a comunicación y dirección.", bullets: ["Revisores por rol", "Control de versiones", "Comentarios en tiempo real"] },
      { title: "Distribución", body: "Publica mensajes aprobados por correo, redes sociales y canales internos con un clic.", bullets: ["Envío multicanal", "Segmentación de audiencias", "Seguimiento de resultados"] },
      { title: "Panel en vivo", body: "Un centro de mando en tiempo real con los incidentes activos, los niveles de crisis y el estado del equipo.", bullets: ["Cola de prioridades", "Indicadores clave", "Vista geográfica"] },
      { title: "Registro de auditoría", body: "Un registro inalterable de cada cambio, aprobación y publicación, para cumplimiento normativo y análisis posteriores.", bullets: ["Historial por campo", "Autor y fecha", "Informes exportables"] },
      { title: "Informes y análisis", body: "Informes posteriores al incidente y análisis de tendencias para mejorar continuamente tu preparación.", bullets: ["Cronologías de incidentes", "Referencias de respuesta", "Acciones de mejora"] },
    ],
    aiEyebrow: "Sevra IA",
    aiTitle: "Señales sociales, clasificadas al instante.",
    aiBody: "SEVRA monitoriza las redes sociales 24/7, analiza la gravedad y crea incidentes automáticamente — para que nada se escape.",
    aiAlt: "Inteligencia social de Sevra IA",
    ctaTitle: "Mira Sevra en acción.",
    ctaBody: "Haz un recorrido guiado por el producto, adaptado a los protocolos y al sector de tu equipo.",
    requestDemo: "Solicita una demo",
  },
});

export const aboutMessages = defineMessages({
  en: {
    eyebrow: "About Us",
    title: "Built by people who've lived the crisis.",
    introBefore: "Sevra was built by",
    introAfter:
      "to give crisis teams the clarity, speed and confidence they need when the world is watching. We bring decades of experience across communications, technology, law and growth.",
    teamHeading: "Leadership team",
    team: [
      { role: "Chief Executive Officer", bio: "Drives Sevra's vision and strategy, partnering with crisis leaders across industries." },
      { role: "Chief Marketing Officer", bio: "Leads brand, growth and go-to-market — connecting Sevra with the teams who need it most." },
      { role: "Chief Legal Officer", bio: "Oversees legal, compliance and governance — ensuring trust, privacy and regulatory rigor." },
      { role: "Chief Technology Officer", bio: "Heads engineering, architecture and AI — building the platform that powers every response." },
    ],
    valuesHeading: "Our values",
    values: [
      { title: "Clarity", body: "We turn noise into structured, actionable intelligence." },
      { title: "Speed", body: "Every minute matters — our tools collapse hours into moments." },
      { title: "Trust", body: "Auditability, privacy and security are non-negotiable." },
    ],
    ctaTitle: "Let's talk.",
    ctaBody: "Whether you're evaluating crisis tools or rethinking your playbooks — we'd love to hear from you.",
    getInTouch: "Get in touch",
  },
  es: {
    eyebrow: "Quiénes somos",
    title: "Creado por personas que han vivido la crisis.",
    introBefore: "Sevra fue creado por",
    introAfter:
      "para dar a los equipos de crisis la claridad, la rapidez y la confianza que necesitan cuando el mundo está mirando. Aportamos décadas de experiencia en comunicación, tecnología, derecho y crecimiento.",
    teamHeading: "Equipo directivo",
    team: [
      { role: "Director general (CEO)", bio: "Impulsa la visión y la estrategia de Sevra, junto a responsables de crisis de todos los sectores." },
      { role: "Director de marketing (CMO)", bio: "Dirige la marca, el crecimiento y la salida al mercado — conectando Sevra con los equipos que más lo necesitan." },
      { role: "Directora jurídica (CLO)", bio: "Supervisa lo legal, el cumplimiento y la gobernanza — garantizando confianza, privacidad y rigor normativo." },
      { role: "Director de tecnología (CTO)", bio: "Dirige la ingeniería, la arquitectura y la IA — construyendo la plataforma que impulsa cada respuesta." },
    ],
    valuesHeading: "Nuestros valores",
    values: [
      { title: "Claridad", body: "Convertimos el ruido en información estructurada y útil." },
      { title: "Rapidez", body: "Cada minuto cuenta — nuestras herramientas convierten horas en momentos." },
      { title: "Confianza", body: "La trazabilidad, la privacidad y la seguridad no son negociables." },
    ],
    ctaTitle: "Hablemos.",
    ctaBody: "Tanto si estás evaluando herramientas de crisis como si quieres replantear tus protocolos — nos encantará escucharte.",
    getInTouch: "Contáctanos",
  },
});
