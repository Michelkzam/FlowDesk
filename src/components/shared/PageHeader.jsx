import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PageHeader({ title, subtitle, action, actionLabel = "Adicionar", actionIcon }) {
  const Icon = actionIcon || Plus;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <Button onClick={action} className="bg-primary hover:bg-primary/90 gap-2 shrink-0">
          <Icon className="w-4 h-4" /> {actionLabel}
        </Button>
      )}
    </div>
  );
}