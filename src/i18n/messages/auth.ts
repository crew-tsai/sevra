import { defineMessages } from "@/i18n";

export const authMessages = defineMessages({
  en: {
    signInTitle: "Sign in to Sevra",
    tagline: "Enterprise crisis management platform",
    email: "Email",
    workEmail: "Work email",
    emailPlaceholder: "you@company.com",
    password: "Password",
    forgotPassword: "Forgot password?",
    signIn: "Sign in",
    createAccount: "Create account",
    loading: "Loading…",
    sending: "Sending…",
    noAccount: "No account? Create one",
    haveAccount: "Already have an account? Sign in",
    backToSignIn: "Back to sign in",
    accountCreated: "Account created",
    enterEmail: "Enter your email",
    emailAndPasswordRequired: "Email and password required",
    inviteOnly: "This workspace is invite-only. Ask your administrator to invite you.",
    authFailed: "Authentication failed",
    forgotIntro: "Enter your email and we'll send you a link to set a new password.",
    sendResetLink: "Send reset link",
    resetFailed: "Could not send the reset email. Try again in a minute.",
    checkInbox: "Check your inbox.",
    resetSent: (email: string) =>
      `If ${email} has an account here, we've sent a link to set a new password. It can take a minute to arrive.`,
    findWorkspacePrompt: "Signing in to your company's workspace?",
    findItHere: "Find it here",

    // Public-site workspace finder
    continueToWorkspace: "Continue to your workspace",
    forgetOnBrowser: "Forget on this browser",
    forgetWorkspace: (company: string) => `Forget ${company} on this browser`,
    useDifferentEmail: "Use a different email",
    workspaceSent: (email: string) =>
      `If ${email} has access to a Sevra workspace, we've sent a link to it. It can take a minute to arrive.`,
    emailMeLink: "Email me a sign-in link",
    finderHint: "We'll send you a link to your company's workspace. You'll enter your password there.",
    backToSaved: "Back to your saved workspaces",
    somethingWrong: "Something went wrong. Try again in a moment.",
    invalidEmail: "Enter a valid email address.",
    tooManyAttempts: "Too many attempts. Try again in an hour.",
    linkExpired: "This link is invalid or has expired. Request a new one.",
    workspaceGone: "This workspace is no longer available.",

    // Opening a workspace from the email link
    linkIncomplete: "This link is incomplete. Request a new one.",
    linkUnopenable: "This link could not be opened. Request a new one.",
    getNewLink: "Get a new sign-in link",
    openingWorkspace: "Opening your workspace…",
    yourWorkspace: "Your workspace",

    // Setting a new password
    setNewPassword: "Set a new password",
    checkingLink: "Checking your link…",
    linkInvalid: "This link is invalid or has expired.",
    requestNewOne: "Request a new one",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    savePassword: "Save password",
    saving: "Saving…",
    passwordTooShort: "Use at least 8 characters.",
    passwordsDontMatch: "The two passwords don't match.",
    passwordUpdated: "Password updated",
    passwordUpdatedSignIn: "Password updated. Sign in with your new password.",
    passwordSaveFailed: "Could not save the password. Request a new link.",
  },
  es: {
    signInTitle: "Inicia sesión en Sevra",
    tagline: "Plataforma empresarial de gestión de crisis",
    email: "Correo electrónico",
    workEmail: "Correo de trabajo",
    emailPlaceholder: "tu@empresa.com",
    password: "Contraseña",
    forgotPassword: "¿Olvidaste tu contraseña?",
    signIn: "Iniciar sesión",
    createAccount: "Crear cuenta",
    loading: "Cargando…",
    sending: "Enviando…",
    noAccount: "¿No tienes cuenta? Crea una",
    haveAccount: "¿Ya tienes cuenta? Inicia sesión",
    backToSignIn: "Volver a iniciar sesión",
    accountCreated: "Cuenta creada",
    enterEmail: "Escribe tu correo electrónico",
    emailAndPasswordRequired: "Correo y contraseña obligatorios",
    inviteOnly: "Este espacio de trabajo es solo por invitación. Pide a tu administrador que te invite.",
    authFailed: "No se pudo iniciar sesión",
    forgotIntro: "Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.",
    sendResetLink: "Enviar enlace",
    resetFailed: "No se pudo enviar el correo. Inténtalo de nuevo en un minuto.",
    checkInbox: "Revisa tu bandeja de entrada.",
    resetSent: (email: string) =>
      `Si ${email} tiene una cuenta aquí, te hemos enviado un enlace para crear una nueva contraseña. Puede tardar un minuto en llegar.`,
    findWorkspacePrompt: "¿Quieres entrar al espacio de trabajo de tu empresa?",
    findItHere: "Encuéntralo aquí",

    continueToWorkspace: "Continúa a tu espacio de trabajo",
    forgetOnBrowser: "Olvidar en este navegador",
    forgetWorkspace: (company: string) => `Olvidar ${company} en este navegador`,
    useDifferentEmail: "Usar otro correo",
    workspaceSent: (email: string) =>
      `Si ${email} tiene acceso a un espacio de trabajo de Sevra, te hemos enviado un enlace. Puede tardar un minuto en llegar.`,
    emailMeLink: "Envíame un enlace de acceso",
    finderHint: "Te enviaremos un enlace al espacio de trabajo de tu empresa. Allí escribirás tu contraseña.",
    backToSaved: "Volver a tus espacios guardados",
    somethingWrong: "Algo salió mal. Inténtalo de nuevo en un momento.",
    invalidEmail: "Escribe un correo electrónico válido.",
    tooManyAttempts: "Demasiados intentos. Inténtalo de nuevo en una hora.",
    linkExpired: "Este enlace no es válido o ha caducado. Pide uno nuevo.",
    workspaceGone: "Este espacio de trabajo ya no está disponible.",

    linkIncomplete: "Este enlace está incompleto. Pide uno nuevo.",
    linkUnopenable: "No se pudo abrir este enlace. Pide uno nuevo.",
    getNewLink: "Obtener un nuevo enlace de acceso",
    openingWorkspace: "Abriendo tu espacio de trabajo…",
    yourWorkspace: "Tu espacio de trabajo",

    setNewPassword: "Crea una nueva contraseña",
    checkingLink: "Comprobando tu enlace…",
    linkInvalid: "Este enlace no es válido o ha caducado.",
    requestNewOne: "Pide uno nuevo",
    newPassword: "Nueva contraseña",
    confirmPassword: "Confirma la nueva contraseña",
    savePassword: "Guardar contraseña",
    saving: "Guardando…",
    passwordTooShort: "Usa al menos 8 caracteres.",
    passwordsDontMatch: "Las dos contraseñas no coinciden.",
    passwordUpdated: "Contraseña actualizada",
    passwordUpdatedSignIn: "Contraseña actualizada. Inicia sesión con tu nueva contraseña.",
    passwordSaveFailed: "No se pudo guardar la contraseña. Pide un nuevo enlace.",
  },
});

/**
 * The auth server answers in English whatever the interface language. The
 * handful people actually meet are translated; anything else passes through.
 */
export function authErrorText(lang: "en" | "es", raw: string): string {
  if (lang === "en" || !raw) return raw;
  const map: Array<[RegExp, string]> = [
    [/invalid login credentials/i, "Correo o contraseña incorrectos."],
    [/email not confirmed/i, "Aún no has confirmado tu correo. Revisa tu bandeja de entrada."],
    [/user already registered|already been registered/i, "Ya existe una cuenta con este correo. Inicia sesión."],
    [/password should be at least|weak password/i, "La contraseña es demasiado débil. Usa al menos 8 caracteres."],
    [/rate limit|too many|for security purposes/i, "Demasiados intentos. Espera un momento e inténtalo de nuevo."],
    [/same password|different from the old/i, "La nueva contraseña debe ser distinta de la anterior."],
    [/session missing|jwt expired|invalid jwt/i, "Tu sesión ha caducado. Vuelve a iniciar sesión."],
    [/network|failed to fetch/i, "No hay conexión. Comprueba tu red e inténtalo de nuevo."],
  ];
  return map.find(([re]) => re.test(raw))?.[1] ?? raw;
}
