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
  },
});
