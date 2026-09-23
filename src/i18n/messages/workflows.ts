import { defineMessages } from "@/i18n";

// The rule vocabulary is stored as the product's own values (incident types,
// column names, action names); these are how each one reads on screen.
export const workflowsMessages = defineMessages({
  en: {
    title: "Workflows",
    intro:
      "What Sevra does by itself when it detects a crisis. Rules run on the server the moment an incident is opened — nobody has to be signed in.",
    adminOnly: "Only an administrator can change these rules. You are seeing them as they are configured.",

    // The baseline, which lives in Admin › Company and is shown here because
    // this is where someone looks for it.
    baselineTitle: "Sevra's baseline",
    baselineOn: (level: string) =>
      `Every incident at ${level} or above gets its communication package drafted automatically.`,
    baselineOff:
      "Sevra drafts nothing until someone asks for it. Rules below can still draft for specific cases.",
    baselineHint: "Rules can draft earlier for the cases you care about. None of them can switch this off.",
    baselineOffOption: "Only when someone asks",
    baselineLevelOption: (level: string) => `${level} and above`,
    slaTitle: "Unapproved communications",
    slaOff: "Nobody is told when a communication sits unapproved.",
    slaOn: (minutes: number, level: string) =>
      `After ${minutes} minutes unapproved, on an incident of ${level} or above, the people responsible for that communication are emailed.`,
    slaHint:
      "Sevra drafts without being asked because a crisis does not wait for office hours. Everything after that waits for a person — this is what happens when that person is asleep.",
    slaOffOption: "Never chase anyone",
    slaMinutesOption: (minutes: number) => (minutes >= 60 ? `After ${minutes / 60} h` : `After ${minutes} min`),
    slaLevelOption: (level: string) => `${level} or above`,
    saved: "Saved",

    newWorkflow: "New rule",
    editWorkflow: "Edit rule",
    empty: "No rules yet. Sevra still drafts at the baseline level above.",
    firedCount: (n: number) => (n === 1 ? "fired once" : `fired ${n} times`),
    neverFired: "not fired yet",

    legend: { classification: "Applies to", criteria: "Only when", actions: "Then", nextStatus: "Status" },
    anyType: "Any type",
    anySubType: "Any sub-type",
    atLevel: (level: string) => `${level} and above`,

    active: "Active",
    disabled: "Disabled",
    disable: "Disable",
    enable: "Enable",
    deleted: "Rule deleted",
    updated: "Rule updated",
    created: "Rule created",
    nameRequired: "Give the rule a name",
    actionRequired: "Choose at least one action",
    notifyNeedsList: "Choose the list to notify",
    statusNeedsChoice: "Choose the status to move the incident to",
    noLists: "No address lists yet — create one in Admin › Email lists.",

    name: "Name",
    namePlaceholder: "e.g. Draft early for safety incidents",
    type: "Incident type",
    subType: "Sub-type",
    minLevel: "From crisis level",
    add: "Add",
    valuePlaceholder: "value",
    moveTo: "Move the incident to",
    list: "Address list",
    saveChanges: "Save changes",
    createWorkflow: "Create rule",
    cancel: "Cancel",
    deleteConfirm: "Delete this rule?",

    fields: {
      risk_score: "Risk score",
      estimated_passengers_impacted: "People impacted",
      influencer_media_involved: "Influencer or media involved",
      regulator_involved: "Regulator involved",
      injury_fatality: "Injury or fatality",
      country: "Country",
      source: "Source",
    } as Record<string, string>,
    ops: { ">=": "≥", ">": ">", "=": "=", "<": "<", "<=": "≤", contains: "contains" } as Record<string, string>,
    actionTypes: {
      draft_package: "Draft the communication package",
      notify: "Notify an address list",
      set_status: "Move the incident's status",
      lock_public: "Lock public publishing",
      log_only: "Record it only",
    } as Record<string, string>,
    actionHelp: {
      draft_package: "The twelve communications are written and wait in Approvals, pending as always.",
      notify: "Emails the list, through the same send log and suppression rules as any other email.",
      set_status: "Recorded in the audit log as Sevra's change; anyone can move it back.",
      lock_public: "Marks the incident not public, so nothing can be pushed out until someone clears it.",
      log_only: "Records that the rule matched and does nothing else.",
    } as Record<string, string>,
    // Stated in the builder, so nobody goes looking for a publish action.
    noPublishNote:
      "There is no publish action, by design: nothing leaves this workspace without the two approvals.",
    sources: {
      title: "Watched sources and topics",
      intro:
        "Monitoring already looks for your own name. This is everyone else worth hearing from — a newsroom that covers you, your regulator, a campaigner, the hashtag from an incident that is still running.",
      sourcesTitle: "Sources",
      sourcesIntro: "People and organisations. One entry per actor, with their accounts on whichever networks they use.",
      topicsTitle: "Topics",
      topicsIntro:
        "Hashtags and phrases, which belong to nobody. Always collected in full — a crisis hashtag is worth watching precisely because you are not named in it yet.",
      emptySources: "Nobody is being watched beyond your own name.",
      emptyTopics: "No hashtags or phrases are being watched.",
      addSource: "Add a source",
      editSource: "Edit source",
      namePlaceholder: "who they are",
      notePlaceholder: "why you are watching them (optional)",
      handlesTitle: "Their accounts",
      handlesHint: "All optional. Add only the networks they actually use.",
      handlePlaceholder: "handle, no @",
      roleLabel: "What they are",
      roles: {
        press: "Press",
        regulator: "Regulator",
        activist: "Activist",
        competitor: "Competitor",
        partner: "Partner",
        community: "Community",
      } as Record<string, string>,
      roleHint:
        "The role sets how they are watched and tells Sevra who is speaking when they raise an incident. You can change either setting afterwards.",
      scopeEverything: "Everything they post",
      scopeMentions: "Only about you",
      scopeHint:
        "A newsroom publishes all day and almost none of it concerns you, so by default Sevra collects only their posts that name you. Watch the whole feed for a regulator, or a campaigner working your sector where you may not be named until the day you are.",
      amplifies: "Raises the level",
      amplifiesOff: "No extra weight",
      amplifiesHint:
        "A complaint from someone with an audience is a bigger event than the same words from nobody in particular. When this is on, an incident opened from their post starts one crisis level higher.",
      // What this source actually does, per network, said out loud. The whole
      // point of the rebuild: the client declares who to watch, and Sevra
      // declares what it can do about it.
      coverageSearched: (networks: string) => `Searching ${networks} for their posts.`,
      coverageOwn: (networks: string) =>
        `On ${networks}, marks them when they turn up in what your own accounts receive — those networks cannot be searched by anyone.`,
      coverageNeedsConnection: (networks: string) =>
        `Nothing on ${networks} until you connect that account in Admin — it is the only way anything arrives from there.`,
      coverageUnreachable: (networks: string) => `Nothing on ${networks}: it cannot be monitored at all.`,
      watchingNothing: "Not watching anything yet",
      watchingNothingHint:
        "This source has no account on a network Sevra can currently reach, so nothing will ever match it. Add a handle on X, or connect the network in Admin.",
      kindHashtag: "Hashtag",
      kindPhrase: "Phrase",
      topicPlaceholder: "a hashtag or a phrase",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      active: "Collecting",
      platformNote:
        "X is the only network that can be searched, and Sevra searches it with its own application token — you do not need to connect anything. Facebook and Instagram only ever show what your own accounts receive, and TikTok offers no way to find mentions at all.",
      nameRequired: "Give the source a name.",
    },
  },
  es: {
    title: "Flujos",
    intro:
      "Lo que Sevra hace por su cuenta cuando detecta una crisis. Las reglas se ejecutan en el servidor en cuanto se abre un incidente: no hace falta que nadie haya iniciado sesión.",
    adminOnly: "Solo un administrador puede cambiar estas reglas. Las ves tal como están configuradas.",

    baselineTitle: "Base de Sevra",
    baselineOn: (level: string) =>
      `Todo incidente de ${level} o superior recibe su paquete de comunicación redactado automáticamente.`,
    baselineOff:
      "Sevra no redacta nada hasta que alguien lo pida. Las reglas de abajo sí pueden redactar en casos concretos.",
    baselineHint: "Las reglas pueden redactar antes en los casos que te importen. Ninguna puede desactivar esto.",
    baselineOffOption: "Solo cuando alguien lo pida",
    baselineLevelOption: (level: string) => `${level} o superior`,
    slaTitle: "Comunicaciones sin aprobar",
    slaOff: "No se avisa a nadie cuando una comunicación se queda sin aprobar.",
    slaOn: (minutes: number, level: string) =>
      `Tras ${minutes} minutos sin aprobar, en un incidente de ${level} o superior, se avisa por correo a los responsables de esa comunicación.`,
    slaHint:
      "Sevra redacta sin que nadie lo pida porque una crisis no espera al horario de oficina. Todo lo que viene después espera a una persona — esto es lo que ocurre cuando esa persona está dormida.",
    slaOffOption: "No avisar a nadie",
    slaMinutesOption: (minutes: number) => (minutes >= 60 ? `Tras ${minutes / 60} h` : `Tras ${minutes} min`),
    slaLevelOption: (level: string) => `${level} o superior`,
    saved: "Guardado",

    newWorkflow: "Nueva regla",
    editWorkflow: "Editar regla",
    empty: "Aún no hay reglas. Sevra sigue redactando en el nivel base de arriba.",
    firedCount: (n: number) => (n === 1 ? "se ejecutó una vez" : `se ejecutó ${n} veces`),
    neverFired: "aún no se ha ejecutado",

    legend: { classification: "Se aplica a", criteria: "Solo cuando", actions: "Entonces", nextStatus: "Estado" },
    anyType: "Cualquier tipo",
    anySubType: "Cualquier subtipo",
    atLevel: (level: string) => `${level} o superior`,

    active: "Activa",
    disabled: "Desactivada",
    disable: "Desactivar",
    enable: "Activar",
    deleted: "Regla eliminada",
    updated: "Regla actualizada",
    created: "Regla creada",
    nameRequired: "Ponle un nombre a la regla",
    actionRequired: "Elige al menos una acción",
    notifyNeedsList: "Elige la lista a la que avisar",
    statusNeedsChoice: "Elige el estado al que mover el incidente",
    noLists: "Aún no hay listas de correo — crea una en Administración › Listas de correo.",

    name: "Nombre",
    namePlaceholder: "p. ej. Redactar antes en incidentes de seguridad",
    type: "Tipo de incidente",
    subType: "Subtipo",
    minLevel: "Desde el nivel de crisis",
    add: "Añadir",
    valuePlaceholder: "valor",
    moveTo: "Mover el incidente a",
    list: "Lista de correo",
    saveChanges: "Guardar cambios",
    createWorkflow: "Crear regla",
    cancel: "Cancelar",
    deleteConfirm: "¿Eliminar esta regla?",

    fields: {
      risk_score: "Puntuación de riesgo",
      estimated_passengers_impacted: "Personas afectadas",
      influencer_media_involved: "Influencer o medios involucrados",
      regulator_involved: "Regulador involucrado",
      injury_fatality: "Lesiones o fallecimientos",
      country: "País",
      source: "Origen",
    } as Record<string, string>,
    ops: { ">=": "≥", ">": ">", "=": "=", "<": "<", "<=": "≤", contains: "contiene" } as Record<string, string>,
    actionTypes: {
      draft_package: "Redactar el paquete de comunicación",
      notify: "Avisar a una lista de correo",
      set_status: "Cambiar el estado del incidente",
      lock_public: "Bloquear la publicación pública",
      log_only: "Solo registrarlo",
    } as Record<string, string>,
    actionHelp: {
      draft_package: "Se redactan las doce comunicaciones y quedan en Aprobaciones, pendientes como siempre.",
      notify: "Envía correo a la lista, con el mismo registro de envíos y las mismas reglas de supresión que cualquier otro correo.",
      set_status: "Queda en la auditoría como un cambio de Sevra; cualquiera puede revertirlo.",
      lock_public: "Marca el incidente como no público, así no se puede sacar nada hasta que alguien lo autorice.",
      log_only: "Deja constancia de que la regla se cumplió y no hace nada más.",
    } as Record<string, string>,
    noPublishNote:
      "No hay acción de publicar, a propósito: nada sale de este espacio de trabajo sin las dos aprobaciones.",

    sources: {
      title: "Fuentes y temas vigilados",
      intro:
        "La monitorización ya busca tu propio nombre. Aquí va todo el resto a quien merece la pena escuchar — un medio que te cubre, tu regulador, un activista, el hashtag de un incidente que sigue abierto.",
      sourcesTitle: "Fuentes",
      sourcesIntro: "Personas y organizaciones. Una entrada por actor, con sus cuentas en las redes que realmente usa.",
      topicsTitle: "Temas",
      topicsIntro:
        "Hashtags y frases, que no son de nadie. Se recogen siempre enteros — un hashtag de crisis merece vigilancia precisamente porque todavía no te nombra.",
      emptySources: "No se vigila a nadie más allá de tu propio nombre.",
      emptyTopics: "No se vigila ningún hashtag ni frase.",
      addSource: "Añadir fuente",
      editSource: "Editar fuente",
      namePlaceholder: "quién es",
      notePlaceholder: "por qué la vigilas (opcional)",
      handlesTitle: "Sus cuentas",
      handlesHint: "Todas opcionales. Añade solo las redes que realmente usa.",
      handlePlaceholder: "cuenta, sin @",
      roleLabel: "Qué es",
      roles: {
        press: "Prensa",
        regulator: "Regulador",
        activist: "Activista",
        competitor: "Competencia",
        partner: "Socio",
        community: "Comunidad",
      } as Record<string, string>,
      roleHint:
        "El rol decide cómo se vigila y le dice a Sevra quién habla cuando esa fuente abre un incidente. Puedes cambiar cualquiera de los dos ajustes después.",
      scopeEverything: "Todo lo que publique",
      scopeMentions: "Solo sobre ti",
      scopeHint:
        "Un medio publica todo el día y casi nada te concierne, así que por defecto Sevra recoge solo sus publicaciones que te nombran. Vigila el feed entero para un regulador, o para un activista que trabaja tu sector donde puede que no te nombren hasta el día que lo hagan.",
      amplifies: "Sube el nivel",
      amplifiesOff: "Sin peso extra",
      amplifiesHint:
        "Una queja de alguien con audiencia es un hecho mayor que las mismas palabras dichas por nadie en particular. Con esto activado, un incidente abierto desde su publicación empieza un nivel de crisis más arriba.",
      coverageSearched: (networks: string) => `Buscando sus publicaciones en ${networks}.`,
      coverageOwn: (networks: string) =>
        `En ${networks}, los marca cuando aparecen en lo que reciben tus propias cuentas — esas redes no las puede buscar nadie.`,
      coverageNeedsConnection: (networks: string) =>
        `Nada en ${networks} hasta que conectes esa cuenta en Administración — es la única vía por la que llega algo de ahí.`,
      coverageUnreachable: (networks: string) => `Nada en ${networks}: no se puede monitorizar en absoluto.`,
      watchingNothing: "Todavía no vigila nada",
      watchingNothingHint:
        "Esta fuente no tiene cuenta en ninguna red que Sevra pueda alcanzar ahora mismo, así que nunca coincidirá con nada. Añade una cuenta de X, o conecta la red en Administración.",
      kindHashtag: "Hashtag",
      kindPhrase: "Frase",
      topicPlaceholder: "un hashtag o una frase",
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      active: "Recogiendo",
      platformNote:
        "X es la única red que se puede buscar, y Sevra la busca con su propio token de aplicación — no necesitas conectar nada. Facebook e Instagram solo muestran lo que reciben tus propias cuentas, y TikTok no ofrece ninguna forma de encontrar menciones.",
      nameRequired: "Ponle un nombre a la fuente.",
    },
  },
});
