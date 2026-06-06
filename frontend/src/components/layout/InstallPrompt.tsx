import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setTimeout(() => setShow(true), 30000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show || !evt) return null;
  return (
    <div className="fixed bottom-16 inset-x-3 z-50 lg:hidden bg-surface-2 border border-border rounded-xl p-3 shadow-xl flex items-center gap-3 safe-bottom animate-in slide-in-from-bottom">
      <Download className="size-5 text-primary shrink-0" />
      <div className="flex-1 text-sm">
        <div className="font-display font-medium">Add FleetGuard</div>
        <div className="text-xs text-muted-foreground">Install for offline access & push alerts</div>
      </div>
      <button onClick={async () => { await evt.prompt(); setShow(false); }} className="text-xs font-display px-3 h-8 rounded-md bg-primary text-primary-foreground">Install</button>
      <button onClick={() => setShow(false)} className="text-muted-foreground"><X className="size-4" /></button>
    </div>
  );
}
