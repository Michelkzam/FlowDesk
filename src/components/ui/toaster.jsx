import { useToast } from "@/components/ui/use-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const variantStyles = {
  default: "bg-background border-border text-foreground",
  destructive: "bg-destructive border-destructive text-destructive-foreground",
  success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(({ id, title, description, variant = "default" }) => (
        <div
          key={id}
          className={cn(
            "pointer-events-auto relative flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-top-full fade-in duration-300",
            variantStyles[variant] || variantStyles.default
          )}
        >
          <div className="flex-1 min-w-0">
            {title && <p className="text-sm font-semibold">{title}</p>}
            {description && <p className="text-sm opacity-90 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={() => dismiss(id)}
            className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
