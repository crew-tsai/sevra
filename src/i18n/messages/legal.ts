import { defineMessages } from "@/i18n";

// Legal pages. Facts here must match what Sevra actually does — they are
// relied on by Meta's App Review and by clients' own compliance teams. Change
// the product, change this.

export type LegalSection = { h: string; p?: string[]; list?: string[] };
export type LegalPage = { title: string; updated: string; intro: string[]; sections: LegalSection[] };

const COMPANY = "The Stellar Crew LLC";
const ADDRESS = "18482 Kuykendahl Rd Unit #517, Spring, TX 77379, USA";
const EMAIL = "crew@thestellar.ai";

export const legalMessages = defineMessages<{
  privacy: LegalPage;
  terms: LegalPage;
  deletion: LegalPage;
  contact: string;
  footerPrivacy: string;
  footerTerms: string;
  footerDeletion: string;
}>({
  en: {
    contact: `${COMPANY} · ${ADDRESS} · ${EMAIL}`,
    footerPrivacy: "Privacy",
    footerTerms: "Terms",
    footerDeletion: "Data deletion",
    privacy: {
      title: "Privacy Policy",
      updated: "Last updated: September 19, 2026",
      intro: [
        `Sevra is a crisis-communications platform operated by ${COMPANY}, a Texas limited liability company ("we", "us"). This policy explains what information Sevra handles, why, and the choices you have.`,
        "Sevra is used by organizations (our \"clients\"). Inside a client's workspace, the client decides what information is added and who can see it; we process it on the client's behalf and under its instructions. For the public website and for our own business contacts, we decide how information is used.",
      ],
      sections: [
        {
          h: "Information we handle",
          list: [
            "Account information: name, work email address and role of the people a client invites to its workspace.",
            "Workspace content: incidents, response plans, drafted communications, comments, approvals and audit records that a client's team creates.",
            "Social media information: public posts that mention a client, and — when a client connects its own accounts — comments and posts on its Facebook Page, posts that tag the Page, the Page's name and ID, and the access tokens needed to read and publish on its behalf.",
            "Email distribution: the recipient addresses a client sends communications to, and delivery records.",
            "Website enquiries: the name, work email, company, industry and message you submit through our contact form.",
            "Technical information needed to run the service, such as sign-in sessions and error logs.",
          ],
        },
        {
          h: "How we use it",
          list: [
            "To provide the service a client has asked for: monitoring mentions, classifying their risk, drafting and routing communications for approval, and publishing or sending what the client's team approves.",
            "To keep the service secure, including recording when our support staff access a client's workspace — a record the client can see.",
            "To respond to enquiries from the website.",
          ],
          p: [
            "We do not sell personal information, we do not use it for advertising, and we do not use client data to train AI models.",
          ],
        },
        {
          h: "Facebook and Instagram data",
          p: [
            "When a client connects a Facebook Page, Sevra reads the Page's posts, the comments on them and posts by others that tag the Page, so the client's team is alerted to emerging issues. Sevra publishes to the Page only a statement that the client's team has reviewed and an administrator has approved.",
            "This data is stored in the client's own database, visible only to that client's team, and is not shared with other clients or third parties except the service providers listed below. Disconnecting the Page in Sevra deletes the stored access tokens. See our Data Deletion page for how to have all related data removed.",
          ],
        },
        {
          h: "Artificial intelligence",
          p: [
            "Sevra uses AI to classify mentions, summarize incidents and draft communications. Nothing is published or sent automatically: every communication requires review by the client's team and approval by an administrator.",
          ],
        },
        {
          h: "Where information is stored",
          p: [
            "Each client has its own separate database. Depending on the workspace, it is hosted in the United States or in the European Union (Ireland). Our internal service console receives only operating metrics about each workspace — never the content of its incidents or communications.",
          ],
        },
        {
          h: "Service providers",
          p: ["We rely on these providers to run Sevra, each only for the purpose shown:"],
          list: [
            "Supabase — databases, sign-in and server functions.",
            "Vercel — hosting of the web application.",
            "Google (Gemini API) — AI analysis and drafting.",
            "Resend — sending email.",
            "X and Meta — only for the accounts a client chooses to monitor or connect.",
          ],
        },
        {
          h: "How long we keep information",
          p: [
            "Workspace information is kept while the client's contract is active and deleted when the workspace is closed, unless the client asks us to delete it sooner. Access tokens for a social account are deleted when the account is disconnected. Website enquiries are kept until you ask us to delete them.",
          ],
        },
        {
          h: "Your choices and rights",
          p: [
            "You can ask us to access, correct or delete your personal information by writing to the address below. If your information is in a client's workspace, we will pass your request to that client, who decides on it, and help them respond. Depending on where you live, you may have additional rights under laws such as the GDPR or the CCPA; we will honor them.",
          ],
        },
        {
          h: "Browser storage",
          p: [
            "Sevra stores a few preferences in your browser — your chosen language, the workspaces you have opened from our website, and a client's email lists and responsibility matrix — plus the session that keeps you signed in. We do not use advertising or tracking cookies.",
          ],
        },
        {
          h: "Children",
          p: ["Sevra is a business service and is not intended for anyone under 18."],
        },
        {
          h: "Changes",
          p: ["We will post any change to this policy on this page with a new date. Material changes will also be communicated to clients."],
        },
        {
          h: "Contact",
          p: [`${COMPANY}, ${ADDRESS}. Email: ${EMAIL}.`],
        },
      ],
    },
    terms: {
      title: "Terms of Service",
      updated: "Last updated: September 19, 2026",
      intro: [
        `These terms govern the use of Sevra, a service of ${COMPANY}, a Texas limited liability company. By using Sevra you agree to them on behalf of yourself and the organization you represent. A signed agreement between us and a client takes precedence over these terms where they differ.`,
      ],
      sections: [
        {
          h: "The service",
          p: [
            "Sevra helps organizations detect, assess and respond to reputational and operational crises: it monitors mentions, classifies their risk, proposes response plans and drafts communications for the client's team to review, approve and distribute.",
          ],
        },
        {
          h: "Accounts",
          p: [
            "Workspaces are by invitation only. The client is responsible for who it invites, the roles it gives them, and keeping sign-in details confidential. Tell us promptly at the address below if you suspect unauthorized access.",
          ],
        },
        {
          h: "AI-generated content and approvals",
          p: [
            "Sevra's drafts, classifications and recommendations are produced with AI and can be wrong or incomplete. They are proposals: the client is responsible for reviewing them and for everything it approves, publishes or sends. Sevra never publishes or sends without a person's approval.",
          ],
        },
        {
          h: "Connected accounts",
          p: [
            "When a client connects a social media account, it authorizes Sevra to act on it as described when connecting, and remains bound by that platform's own terms. The client can disconnect an account at any time.",
          ],
        },
        {
          h: "Acceptable use",
          list: [
            "Do not use Sevra to break the law, infringe others' rights, or publish deceptive, defamatory or harassing content.",
            "Do not attempt to access other clients' workspaces, probe or disrupt the service, or reverse-engineer it.",
            "Do not monitor or collect information about private individuals for purposes unrelated to the organization's own communications.",
          ],
        },
        {
          h: "Client data",
          p: [
            "Clients own the content in their workspace. We use it only to provide the service, as described in our Privacy Policy. When a workspace is closed, its data is deleted.",
          ],
        },
        {
          h: "Availability and changes",
          p: [
            "We work to keep Sevra available and secure but do not guarantee uninterrupted service. Third-party platforms such as X and Meta can change or limit their services, which may affect Sevra's features. We may improve or change the service; we will give notice of changes that materially reduce it.",
          ],
        },
        {
          h: "Disclaimers and liability",
          p: [
            "Except as stated in a signed agreement, Sevra is provided \"as is\" without warranties of any kind. To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability for any claim is limited to the fees the client paid for Sevra in the twelve months before the claim.",
          ],
        },
        {
          h: "Termination",
          p: [
            "A client may stop using Sevra at any time. We may suspend access that breaches these terms or puts the service or other clients at risk.",
          ],
        },
        {
          h: "Governing law",
          p: ["These terms are governed by the laws of the State of Texas, USA, without regard to its conflict-of-law rules."],
        },
        {
          h: "Contact",
          p: [`${COMPANY}, ${ADDRESS}. Email: ${EMAIL}.`],
        },
      ],
    },
    deletion: {
      title: "Data Deletion",
      updated: "Last updated: September 19, 2026",
      intro: [
        "How to have data that Sevra holds about you, or data obtained through Facebook or Instagram, deleted.",
      ],
      sections: [
        {
          h: "If you connected a Facebook Page or Instagram account",
          list: [
            "In Sevra, go to Admin → Social connections and choose Disconnect. The access tokens are deleted immediately and Sevra stops reading or publishing.",
            "You can also remove Sevra from your Facebook account under Settings → Security and login → Business integrations.",
            `To delete the posts and comments Sevra collected from the account as well, email ${EMAIL} with the subject "Data deletion", naming the workspace and the account.`,
          ],
        },
        {
          h: "Anyone else",
          p: [
            `Email ${EMAIL} with the subject "Data deletion" and tell us the email address or social media account concerned. If the data belongs to a client's workspace, we will forward the request to that client and help them carry it out.`,
          ],
        },
        {
          h: "What happens next",
          p: [
            "We confirm receipt within 5 business days and complete the deletion within 30 days, then confirm it to you in writing. Copies in routine backups are overwritten on their normal cycle.",
          ],
        },
        {
          h: "Contact",
          p: [`${COMPANY}, ${ADDRESS}. Email: ${EMAIL}.`],
        },
      ],
    },
  },
  es: {
    contact: `${COMPANY} · ${ADDRESS} · ${EMAIL}`,
    footerPrivacy: "Privacidad",
    footerTerms: "Términos",
    footerDeletion: "Eliminación de datos",
    privacy: {
      title: "Política de privacidad",
      updated: "Última actualización: 19 de septiembre de 2026",
      intro: [
        `Sevra es una plataforma de comunicación de crisis operada por ${COMPANY}, una sociedad de responsabilidad limitada de Texas ("nosotros"). Esta política explica qué información trata Sevra, para qué y qué opciones tienes.`,
        "Sevra la utilizan organizaciones (nuestros \"clientes\"). Dentro del espacio de trabajo de un cliente, es el cliente quien decide qué información se añade y quién puede verla; nosotros la tratamos en su nombre y siguiendo sus instrucciones. En el sitio web público y con nuestros propios contactos comerciales, decidimos nosotros cómo se usa la información.",
      ],
      sections: [
        {
          h: "Información que tratamos",
          list: [
            "Datos de cuenta: nombre, correo de trabajo y rol de las personas que un cliente invita a su espacio de trabajo.",
            "Contenido del espacio de trabajo: incidentes, planes de respuesta, comunicaciones redactadas, comentarios, aprobaciones y registros de auditoría que crea el equipo del cliente.",
            "Información de redes sociales: publicaciones públicas que mencionan a un cliente y — cuando un cliente conecta sus propias cuentas — comentarios y publicaciones en su Página de Facebook, publicaciones que etiquetan a la Página, el nombre e ID de la Página y los tokens de acceso necesarios para leer y publicar en su nombre.",
            "Distribución por correo: las direcciones a las que un cliente envía comunicaciones y los registros de entrega.",
            "Consultas desde la web: el nombre, correo de trabajo, empresa, sector y mensaje que envías por nuestro formulario de contacto.",
            "Información técnica necesaria para prestar el servicio, como las sesiones de inicio de sesión y los registros de errores.",
          ],
        },
        {
          h: "Para qué la usamos",
          list: [
            "Para prestar el servicio que el cliente ha contratado: monitorizar menciones, clasificar su riesgo, redactar y encaminar comunicaciones para su aprobación, y publicar o enviar lo que el equipo del cliente aprueba.",
            "Para mantener el servicio seguro, incluido el registro de cada acceso de nuestro personal de soporte al espacio de un cliente — un registro que el cliente puede ver.",
            "Para responder a las consultas recibidas desde la web.",
          ],
          p: [
            "No vendemos información personal, no la usamos para publicidad y no usamos los datos de los clientes para entrenar modelos de IA.",
          ],
        },
        {
          h: "Datos de Facebook e Instagram",
          p: [
            "Cuando un cliente conecta una Página de Facebook, Sevra lee las publicaciones de la Página, sus comentarios y las publicaciones de terceros que etiquetan a la Página, para alertar al equipo del cliente de posibles problemas. Sevra solo publica en la Página un comunicado que el equipo del cliente ha revisado y un administrador ha aprobado.",
            "Estos datos se guardan en la base de datos propia del cliente, visibles solo para su equipo, y no se comparten con otros clientes ni con terceros, salvo los proveedores de servicios indicados más abajo. Desconectar la Página en Sevra elimina los tokens de acceso guardados. Consulta nuestra página de Eliminación de datos para pedir que se borre toda la información relacionada.",
          ],
        },
        {
          h: "Inteligencia artificial",
          p: [
            "Sevra usa IA para clasificar menciones, resumir incidentes y redactar comunicaciones. Nada se publica ni se envía automáticamente: cada comunicación requiere la revisión del equipo del cliente y la aprobación de un administrador.",
          ],
        },
        {
          h: "Dónde se guarda la información",
          p: [
            "Cada cliente tiene su propia base de datos, separada de las demás. Según el espacio de trabajo, se aloja en Estados Unidos o en la Unión Europea (Irlanda). Nuestra consola interna del servicio solo recibe métricas de funcionamiento de cada espacio — nunca el contenido de sus incidentes ni de sus comunicaciones.",
          ],
        },
        {
          h: "Proveedores de servicios",
          p: ["Nos apoyamos en estos proveedores para prestar Sevra, cada uno solo para la finalidad indicada:"],
          list: [
            "Supabase — bases de datos, inicio de sesión y funciones de servidor.",
            "Vercel — alojamiento de la aplicación web.",
            "Google (API de Gemini) — análisis y redacción con IA.",
            "Resend — envío de correos.",
            "X y Meta — solo para las cuentas que un cliente decide monitorizar o conectar.",
          ],
        },
        {
          h: "Cuánto tiempo conservamos la información",
          p: [
            "La información de un espacio de trabajo se conserva mientras el contrato del cliente esté vigente y se elimina al cerrar el espacio, salvo que el cliente pida borrarla antes. Los tokens de acceso de una red social se eliminan al desconectar la cuenta. Las consultas desde la web se conservan hasta que pidas borrarlas.",
          ],
        },
        {
          h: "Tus opciones y derechos",
          p: [
            "Puedes pedirnos acceder a tu información personal, corregirla o eliminarla escribiendo a la dirección indicada abajo. Si tu información está en el espacio de trabajo de un cliente, le trasladaremos tu solicitud, que es quien decide, y le ayudaremos a responderla. Según dónde vivas, puedes tener derechos adicionales conforme a leyes como el RGPD o la CCPA; los respetaremos.",
          ],
        },
        {
          h: "Almacenamiento en el navegador",
          p: [
            "Sevra guarda algunas preferencias en tu navegador — el idioma elegido, los espacios de trabajo que has abierto desde nuestra web y las listas de correo y la matriz de responsabilidades de un cliente — además de la sesión que te mantiene conectado. No usamos cookies de publicidad ni de seguimiento.",
          ],
        },
        {
          h: "Menores",
          p: ["Sevra es un servicio para empresas y no está dirigido a menores de 18 años."],
        },
        {
          h: "Cambios",
          p: ["Publicaremos cualquier cambio de esta política en esta página, con una nueva fecha. Los cambios importantes también se comunicarán a los clientes."],
        },
        {
          h: "Contacto",
          p: [`${COMPANY}, ${ADDRESS}. Correo: ${EMAIL}.`],
        },
      ],
    },
    terms: {
      title: "Términos del servicio",
      updated: "Última actualización: 19 de septiembre de 2026",
      intro: [
        `Estos términos regulan el uso de Sevra, un servicio de ${COMPANY}, una sociedad de responsabilidad limitada de Texas. Al usar Sevra los aceptas en tu nombre y en el de la organización que representas. Si existe un contrato firmado entre nosotros y un cliente, prevalece sobre estos términos en lo que difieran.`,
      ],
      sections: [
        {
          h: "El servicio",
          p: [
            "Sevra ayuda a las organizaciones a detectar, evaluar y responder a crisis reputacionales y operativas: monitoriza menciones, clasifica su riesgo, propone planes de respuesta y redacta comunicaciones para que el equipo del cliente las revise, apruebe y distribuya.",
          ],
        },
        {
          h: "Cuentas",
          p: [
            "Los espacios de trabajo son solo por invitación. El cliente es responsable de a quién invita, de los roles que asigna y de mantener la confidencialidad de los datos de acceso. Avísanos cuanto antes en la dirección indicada abajo si sospechas un acceso no autorizado.",
          ],
        },
        {
          h: "Contenido generado por IA y aprobaciones",
          p: [
            "Los borradores, clasificaciones y recomendaciones de Sevra se generan con IA y pueden ser incorrectos o incompletos. Son propuestas: el cliente es responsable de revisarlas y de todo lo que aprueba, publica o envía. Sevra nunca publica ni envía nada sin la aprobación de una persona.",
          ],
        },
        {
          h: "Cuentas conectadas",
          p: [
            "Al conectar una cuenta de redes sociales, el cliente autoriza a Sevra a actuar en ella según se indica al conectarla, y sigue sujeto a los términos de esa plataforma. El cliente puede desconectar una cuenta en cualquier momento.",
          ],
        },
        {
          h: "Uso aceptable",
          list: [
            "No uses Sevra para infringir la ley, vulnerar derechos de terceros ni publicar contenido engañoso, difamatorio o acosador.",
            "No intentes acceder a los espacios de otros clientes, sondear o alterar el servicio, ni aplicarle ingeniería inversa.",
            "No monitorices ni recopiles información sobre particulares con fines ajenos a las comunicaciones de la propia organización.",
          ],
        },
        {
          h: "Datos del cliente",
          p: [
            "El contenido del espacio de trabajo pertenece al cliente. Solo lo usamos para prestar el servicio, como se describe en nuestra Política de privacidad. Al cerrar un espacio de trabajo, sus datos se eliminan.",
          ],
        },
        {
          h: "Disponibilidad y cambios",
          p: [
            "Trabajamos para que Sevra esté disponible y sea segura, pero no garantizamos un servicio ininterrumpido. Plataformas de terceros como X y Meta pueden cambiar o limitar sus servicios, lo que puede afectar a funciones de Sevra. Podemos mejorar o cambiar el servicio; avisaremos de los cambios que lo reduzcan de forma importante.",
          ],
        },
        {
          h: "Exención y límite de responsabilidad",
          p: [
            "Salvo lo que establezca un contrato firmado, Sevra se ofrece \"tal cual\", sin garantías de ningún tipo. En la medida en que la ley lo permita, no respondemos de pérdidas indirectas o consecuentes, y nuestra responsabilidad total por cualquier reclamación se limita a lo que el cliente haya pagado por Sevra en los doce meses anteriores a la reclamación.",
          ],
        },
        {
          h: "Terminación",
          p: [
            "Un cliente puede dejar de usar Sevra en cualquier momento. Podemos suspender el acceso que incumpla estos términos o ponga en riesgo el servicio o a otros clientes.",
          ],
        },
        {
          h: "Ley aplicable",
          p: ["Estos términos se rigen por las leyes del Estado de Texas (EE. UU.), sin atender a sus normas sobre conflicto de leyes."],
        },
        {
          h: "Contacto",
          p: [`${COMPANY}, ${ADDRESS}. Correo: ${EMAIL}.`],
        },
      ],
    },
    deletion: {
      title: "Eliminación de datos",
      updated: "Última actualización: 19 de septiembre de 2026",
      intro: [
        "Cómo pedir que se eliminen los datos que Sevra guarda sobre ti, o los obtenidos a través de Facebook o Instagram.",
      ],
      sections: [
        {
          h: "Si conectaste una Página de Facebook o una cuenta de Instagram",
          list: [
            "En Sevra, ve a Administración → Redes sociales y elige Desconectar. Los tokens de acceso se eliminan de inmediato y Sevra deja de leer y publicar.",
            "También puedes quitar Sevra de tu cuenta de Facebook en Configuración → Seguridad e inicio de sesión → Integraciones comerciales.",
            `Para eliminar además las publicaciones y comentarios que Sevra recopiló de esa cuenta, escribe a ${EMAIL} con el asunto "Eliminación de datos", indicando el espacio de trabajo y la cuenta.`,
          ],
        },
        {
          h: "Cualquier otra persona",
          p: [
            `Escribe a ${EMAIL} con el asunto "Eliminación de datos" e indícanos el correo o la cuenta de redes sociales de que se trata. Si los datos pertenecen al espacio de trabajo de un cliente, le trasladaremos la solicitud y le ayudaremos a llevarla a cabo.`,
          ],
        },
        {
          h: "Qué pasa después",
          p: [
            "Confirmamos la recepción en un plazo de 5 días hábiles y completamos la eliminación en un máximo de 30 días; después te lo confirmamos por escrito. Las copias en las copias de seguridad rutinarias se sobrescriben en su ciclo habitual.",
          ],
        },
        {
          h: "Contacto",
          p: [`${COMPANY}, ${ADDRESS}. Correo: ${EMAIL}.`],
        },
      ],
    },
  },
});
