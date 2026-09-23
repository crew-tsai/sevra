import { defineMessages } from "@/i18n";

// The answers are the product's own behaviour, written the way a comms person
// would ask about it — not a feature list. Anything here that stops being true
// is a bug in this file as much as in the code.
export const helpMessages = defineMessages({
  en: {
    title: "Help",
    intro: "How Sevra works, and a way to reach the people who built it.",

    faqTitle: "Questions we get asked",
    faq: [
      {
        q: "Where do the communications come from?",
        a: "When Sevra detects a crisis at your configured level or above, it writes the whole package — press release, holding statement, posts for each network, an internal memo and the Q&As — and leaves it in Approvals. They follow your own crisis communications manual if you have uploaded one in Admin › Company; where you have none, or it is silent, they follow recognised practice for your industry. The audit log records which of the two was used.",
      },
      {
        q: "Can Sevra publish something without us?",
        a: "No. Every communication needs two approvals: someone on your team sends it to an administrator, and an administrator gives the final approval. Only then can it be sent or published, and a person still presses the button. There is no automatic publishing anywhere in the product, by design.",
      },
      {
        q: "What do the crisis levels mean?",
        a: "L0 routine, L1 localized, L2 significant, L3 major, L4 catastrophic. The level comes from the risk and the score, then rises if someone was hurt, a regulator is involved, or the post came from a verified or influential account. It decides what gets drafted automatically and the order everything is listed in.",
      },
      {
        q: "Who can change what Sevra does by itself?",
        a: "Only an administrator. Workflows holds both the baseline — the level at which the package is drafted — and any rules you add on top. Everyone else can read the rules but not change them.",
      },
      {
        q: "Which networks does Sevra monitor?",
        a: "X today, and Facebook and Instagram for comments, tags and mentions on your own accounts. TikTok can be connected so Sevra can act on the account, but nobody can monitor TikTok: TikTok offers no way to search the platform for mentions outside its academic research programme.",
      },
      {
        q: "Can Sevra watch someone other than us?",
        a: "Yes — in Workflows, under Watched sources and topics. A source is a person or an organisation: a newsroom that covers you, your regulator, a campaigner, a competitor. Give them a name, say what they are, and add their handle on whichever networks they use. A topic is a hashtag or a phrase, useful when a crisis is moving before anyone has named you. What each source can actually collect differs by network, and Sevra says so on the source itself: X can be searched, so it finds their posts wherever they are; Facebook and Instagram cannot be searched by anyone, so a source there is marked when it turns up in what your own accounts already receive; TikTok collects nothing at all. A source that cannot reach anything says so rather than looking configured.",
      },
      {
        q: "Why is this mention in my feed?",
        a: "If Sevra went looking for it, the mention says so: a badge names the watched source or topic that brought it in. Mentions without one were found on your own name.",
      },
      {
        q: "Why does a post from a newsroom raise the crisis level?",
        a: "Because the same words from an account with an audience are a bigger event than from nobody in particular. A watched source set to raise the level starts an incident opened from its post one crisis level higher. You can turn that off per source. Watching a newsroom also defaults to collecting only their posts that name you — they publish all day and almost none of it concerns you — while a regulator or a campaigner defaults to being read in full.",
      },
      {
        q: "Why is a post about us marked as no risk?",
        a: "Sevra separates a crisis from a mention that is merely about you — praise, questions, neutral news — and from posts that use your name as an ordinary word. Only a crisis opens an incident. If something was classified wrongly, send it to us with the link and we will look at it.",
      },
      {
        q: "Something is in the wrong language.",
        a: "The interface follows the toggle at the top right and remembers your choice. AI-written content is stored in both languages and translated when needed. A communication is published in the language it was written in, which is why regenerating one keeps its own language rather than yours.",
      },
      {
        q: "We forgot a password.",
        a: "Use the forgot-password link on the sign-in page. If the email does not arrive within a few minutes, check that the address is on the team in Admin › Team & roles, then write to us — an invitation that was never accepted needs a different path.",
      },
    ] as Array<{ q: string; a: string }>,

    contactTitle: "Ask Sevra",
    contactIntro:
      "This reaches the people who build Sevra, with your workspace and the page you were on attached, so nobody has to ask you which client you are.",
    category: "What kind of message is this?",
    categories: {
      question: "A question",
      problem: "Something is not working",
      request: "A request or an idea",
    } as Record<string, string>,
    subject: "Subject",
    subjectPlaceholder: "In one line",
    message: "Message",
    messagePlaceholder:
      "What you expected, what happened, and where. Links and incident references help.",
    send: "Send to Sevra",
    sending: "Sending…",
    sent: "Sent — we have it",
    sentDetail: "The answer appears below your question here, and at the address on your account.",
    notDelivered: "Saved, but it has not reached Sevra yet",
    notDeliveredDetail:
      "Your message is recorded here and nothing is lost. If it stays like this, email crew@thestellar.ai directly.",
    required: "A subject and a message are required",
    failed: "Could not send the message",

    historyTitle: "What your team has asked",
    historyEmpty: "Nobody on your team has written to Sevra yet.",
    delivered: "Delivered",
    retry: "Send again",
    pending: "Not delivered",
    answered: "Answered",
    awaitingReply: "With Sevra — the answer appears here.",
    supportName: "Sevra support",
    by: (who: string) => `from ${who}`,

    // A thread, not a question and an answer.
    reply: "Write back",
    replyPlaceholder: "Anything else that helps — what you tried, what happened.",
    sendReply: "Send",
    attach: "Attach a file",
    attachHint: "Screenshots help most. Up to 5 files, 10 MB each.",
    remove: "Remove",
    uploading: "Uploading…",
    tooLarge: (name: string) => `${name} is larger than 10 MB`,
    closed: "Closed",
    waiting: "With Sevra",
    you: "You",
  },
  es: {
    title: "Ayuda",
    intro: "Cómo funciona Sevra, y una forma de llegar a quienes lo construyen.",

    faqTitle: "Preguntas que nos hacen",
    faq: [
      {
        q: "¿De dónde salen las comunicaciones?",
        a: "Cuando Sevra detecta una crisis en el nivel que configuraste o superior, redacta el paquete completo — nota de prensa, comunicado inicial, publicaciones para cada red, memorando interno y preguntas y respuestas — y lo deja en Aprobaciones. Siguen tu propio manual de comunicación de crisis si lo subiste en Administración › Empresa; si no hay manual, o no cubre algo, siguen los estándares reconocidos de tu sector. El registro de auditoría deja constancia de cuál de los dos se usó.",
      },
      {
        q: "¿Sevra puede publicar algo sin nosotros?",
        a: "No. Cada comunicación necesita dos aprobaciones: alguien de tu equipo la envía al administrador y un administrador da la aprobación final. Solo entonces se puede enviar o publicar, y aun así lo hace una persona. No hay publicación automática en ninguna parte del producto, a propósito.",
      },
      {
        q: "¿Qué significan los niveles de crisis?",
        a: "L0 rutina, L1 localizado, L2 significativo, L3 grave, L4 catastrófico. El nivel sale del riesgo y la puntuación, y sube si hubo personas heridas, si hay un regulador involucrado o si la publicación viene de una cuenta verificada o influyente. Decide qué se redacta automáticamente y el orden en que aparece todo.",
      },
      {
        q: "¿Quién puede cambiar lo que Sevra hace por su cuenta?",
        a: "Solo un administrador. En Flujos están tanto la base — el nivel a partir del cual se redacta el paquete — como las reglas que añadas encima. El resto del equipo puede verlas pero no cambiarlas.",
      },
      {
        q: "¿Qué redes monitorea Sevra?",
        a: "X hoy, y Facebook e Instagram para comentarios, etiquetas y menciones en tus propias cuentas. TikTok se puede conectar para que Sevra actúe sobre la cuenta, pero nadie puede monitorear TikTok: TikTok no ofrece ninguna forma de buscar menciones en la plataforma fuera de su programa de investigación académica.",
      },
      {
        q: "¿Puede Sevra vigilar a alguien que no seamos nosotros?",
        a: "Sí — en Flujos, en Fuentes y temas vigilados. Una fuente es una persona o una organización: un medio que te cubre, tu regulador, un activista, la competencia. Ponle nombre, di qué es y añade su cuenta en las redes que realmente use. Un tema es un hashtag o una frase, útil cuando una crisis ya se mueve y todavía no te nombra. Lo que cada fuente puede recoger cambia según la red, y Sevra lo dice en la propia fuente: X se puede buscar, así que encuentra sus publicaciones estén donde estén; Facebook e Instagram no los puede buscar nadie, así que ahí la fuente se marca cuando aparece en lo que ya reciben tus propias cuentas; en TikTok no se recoge nada. Una fuente que no alcanza nada lo dice, en vez de parecer configurada.",
      },
      {
        q: "¿Por qué tengo esta mención delante?",
        a: "Si Sevra fue a buscarla, la mención lo dice: una etiqueta nombra la fuente o el tema vigilado que la trajo. Las menciones sin etiqueta se encontraron por tu propio nombre.",
      },
      {
        q: "¿Por qué una publicación de un medio sube el nivel de crisis?",
        a: "Porque las mismas palabras dichas por una cuenta con audiencia son un hecho mayor que dichas por nadie en particular. Una fuente vigilada marcada para subir el nivel hace que un incidente abierto desde su publicación empiece un nivel de crisis más arriba. Puedes desactivarlo en cada fuente. Vigilar a un medio además recoge por defecto solo sus publicaciones que te nombran — publican todo el día y casi nada te concierne — mientras que un regulador o un activista se leen enteros por defecto.",
      },
      {
        q: "¿Por qué una publicación sobre nosotros aparece como sin riesgo?",
        a: "Sevra distingue una crisis de una mención que simplemente habla de ti — elogios, preguntas, noticias neutras — y de publicaciones que usan tu nombre como una palabra cualquiera. Solo una crisis abre un incidente. Si algo quedó mal clasificado, mándanoslo con el enlace y lo revisamos.",
      },
      {
        q: "Algo está en el idioma equivocado.",
        a: "La interfaz sigue el selector de arriba a la derecha y recuerda tu elección. El contenido escrito por la IA se guarda en los dos idiomas y se traduce cuando hace falta. Una comunicación se publica en el idioma en que fue escrita, por eso al regenerarla conserva su idioma y no el tuyo.",
      },
      {
        q: "Olvidamos una contraseña.",
        a: "Usa el enlace de contraseña olvidada en la pantalla de acceso. Si el correo no llega en unos minutos, comprueba que la dirección esté en el equipo en Administración › Equipo y roles, y luego escríbenos: una invitación que nunca se aceptó necesita otro camino.",
      },
    ] as Array<{ q: string; a: string }>,

    contactTitle: "Escribir a Sevra",
    contactIntro:
      "Esto llega a quienes construyen Sevra, con tu espacio de trabajo y la página en la que estabas, así nadie tiene que preguntarte qué cliente eres.",
    category: "¿Qué tipo de mensaje es?",
    categories: {
      question: "Una pregunta",
      problem: "Algo no funciona",
      request: "Una petición o una idea",
    } as Record<string, string>,
    subject: "Asunto",
    subjectPlaceholder: "En una línea",
    message: "Mensaje",
    messagePlaceholder:
      "Qué esperabas, qué pasó y dónde. Los enlaces y las referencias de incidente ayudan.",
    send: "Enviar a Sevra",
    sending: "Enviando…",
    sent: "Enviado — lo tenemos",
    sentDetail: "La respuesta aparece aquí debajo de tu pregunta, y en el correo de tu cuenta.",
    notDelivered: "Guardado, pero todavía no llegó a Sevra",
    notDeliveredDetail:
      "Tu mensaje queda registrado aquí y no se pierde nada. Si sigue así, escribe directamente a crew@thestellar.ai.",
    required: "El asunto y el mensaje son obligatorios",
    failed: "No se pudo enviar el mensaje",

    historyTitle: "Lo que ha preguntado tu equipo",
    historyEmpty: "Nadie de tu equipo ha escrito a Sevra todavía.",
    delivered: "Entregado",
    retry: "Reenviar",
    pending: "Sin entregar",
    answered: "Respondida",
    awaitingReply: "En manos de Sevra — la respuesta aparece aquí.",
    supportName: "Soporte de Sevra",
    by: (who: string) => `de ${who}`,

    reply: "Responder",
    replyPlaceholder: "Cualquier cosa que ayude: qué intentaste, qué pasó.",
    sendReply: "Enviar",
    attach: "Adjuntar un archivo",
    attachHint: "Las capturas de pantalla son lo que más ayuda. Hasta 5 archivos de 10 MB.",
    remove: "Quitar",
    uploading: "Subiendo…",
    tooLarge: (name: string) => `${name} supera los 10 MB`,
    closed: "Cerrada",
    waiting: "En manos de Sevra",
    you: "Tú",
  },
});
