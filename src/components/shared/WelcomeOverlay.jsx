import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function WelcomeOverlay({ userName, onClose }) {
  const [systemName, setSystemName] = useState("FlowDesk");
  const [logoUrl, setLogoUrl] = useState("");
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const load = async () => {
      const savedLogo = localStorage.getItem("appLogo");
      if (savedLogo) setLogoUrl(savedLogo);
      const savedName = localStorage.getItem("appName");
      if (savedName) setSystemName(savedName);
      try {
        const { data } = await supabase.from('system_settings').select('*');
        if (data) {
          const map = {};
          data.forEach(s => { map[s.key] = s.value; });
          if (map.helpdesk_name) setSystemName(map.helpdesk_name);
          if (map.helpdesk_logo) setLogoUrl(map.helpdesk_logo);
        }
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p <= 0) { clearInterval(interval); return 0; }
        return p - 2;
      });
    }, 100);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="relative bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center animate-in zoom-in duration-500" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        {logoUrl ? (
          <div className="w-20 h-20 rounded-xl mx-auto mb-4 overflow-hidden bg-white dark:bg-zinc-800 border border-border flex items-center justify-center">
            <img src={logoUrl} alt={systemName} className="w-full h-full object-contain p-2" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-primary">{systemName.charAt(0)}</span>
          </div>
        )}
        <p className="text-lg text-foreground font-medium mb-1">
          {getGreeting()}, <span className="font-bold">{userName}</span>
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Bem-vindo ao <span className="font-semibold text-foreground">{systemName}</span>
        </p>
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-100 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
