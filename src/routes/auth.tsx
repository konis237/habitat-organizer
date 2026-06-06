import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else navigate({ to: "/" });
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) toast.error(error.message);
      else { toast.success("Compte créé. Vous êtes connecté."); navigate({ to: "/" }); }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary grid place-items-center text-primary-foreground font-bold">L</div>
            <span className="text-lg font-semibold tracking-tight">LocaDesk</span>
          </div>
          <h1 className="text-2xl font-bold">{mode === "signin" ? "Connexion administrateur" : "Créer le compte admin"}</h1>
          <p className="text-sm text-muted-foreground">Accès réservé au gestionnaire</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : mode === "signin" ? "Se connecter" : "Créer le compte"}
          </Button>
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full text-xs text-muted-foreground hover:text-foreground">
            {mode === "signin" ? "Premier accès ? Créer le compte admin" : "Déjà inscrit ? Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
