import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

const TEAM = [
  {
    name: "Gustavo Vargas",
    role: "Chief Executive Officer",
    initials: "GV",
    bio: "Drives Sevra's vision and strategy, partnering with crisis leaders across industries.",
  },
  {
    name: "Victor Herrera",
    role: "Chief Marketing Officer",
    initials: "VH",
    bio: "Leads brand, growth and go-to-market — connecting Sevra with the teams who need it most.",
  },
  {
    name: "Miriam Gonzalez",
    role: "Chief Legal Officer",
    initials: "MG",
    bio: "Oversees legal, compliance and governance — ensuring trust, privacy and regulatory rigor.",
  },
  {
    name: "Ronald Ayala",
    role: "Chief Technology Officer",
    initials: "RA",
    bio: "Heads engineering, architecture and AI — building the platform that powers every response.",
  },
];

const GRADIENTS = [
  "linear-gradient(135deg, #FF5A3C 0%, #7C4DFF 100%)",
  "linear-gradient(135deg, #7C4DFF 0%, #FF5A3C 100%)",
  "linear-gradient(135deg, #FF5A3C 0%, #FFA15A 100%)",
  "linear-gradient(135deg, #7C4DFF 0%, #4DA8FF 100%)",
];

export default function About() {
  return (
    <div>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 text-center">
        <p className="text-xs uppercase tracking-widest text-primary">About Us</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">Built by people who've lived the crisis.</h1>
        <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">
          Sevra was founded to give crisis teams the clarity, speed and confidence they need when the world
          is watching. We bring decades of experience across communications, technology, law and growth.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="sr-only">Leadership team</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TEAM.map((m, idx) => (
            <Card key={m.name} className="bg-card border-border p-6 text-center">
              <div
                className="mx-auto h-24 w-24 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: GRADIENTS[idx % GRADIENTS.length] }}
              >
                {m.initials}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{m.name}</h3>
              <p className="text-sm text-primary mt-1">{m.role}</p>
              <p className="text-sm text-muted-foreground mt-3">{m.bio}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="sr-only">Our values</h2>
          <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "Clarity", body: "We turn noise into structured, actionable intelligence." },
            { title: "Speed", body: "Every minute matters — our tools collapse hours into moments." },
            { title: "Trust", body: "Auditability, privacy and security are non-negotiable." },
          ].map((v) => (
            <div key={v.title}>
              <h3 className="text-xl font-semibold">{v.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{v.body}</p>
            </div>
          ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Let's talk.</h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Whether you're evaluating crisis tools or rethinking your playbooks — we'd love to hear from you.
        </p>
        <Link
          to="/#contact"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Get in touch <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
