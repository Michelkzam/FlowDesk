import React from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

export default function StatCard({ title, value, icon: Icon, color, link, subtitle }) {
  const colorMap = {
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    yellow: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100",
  };

  const iconBg = colorMap[color] || colorMap.green;

  const content = (
    <Card className={cn(
      "p-5 border border-border hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden",
      "hover:border-primary/20 hover:-translate-y-0.5"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("p-2.5 rounded-xl border", iconBg)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <ArrowUpRight className="absolute top-3 right-3 w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
    </Card>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }
  return content;
}