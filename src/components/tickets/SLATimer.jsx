import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/api/flowdeskClient";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_SLA_HOURS = {
  emergency: 2,
  high: 8,
  normal: 24,
  low: 48,
};

const PRIORITY_LABELS = {
  emergency: "Crítica",
  high: "Alta",
  normal: "Média",
  low: "Baixa",
};

function calculateTimeRemaining(createdDate, priorityHours) {
  const created = new Date(createdDate);
  const deadline = new Date(created.getTime() + priorityHours * 60 * 60 * 1000);
  const now = new Date();
  const diff = deadline - now;

  if (diff <= 0) {
    const overdue = Math.abs(diff);
    const hours = Math.floor(overdue / (1000 * 60 * 60));
    const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: true, hours, minutes, totalMinutes: Math.floor(overdue / (1000 * 60)) };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { expired: false, hours, minutes, totalMinutes: Math.floor(diff / (1000 * 60)) };
}

function formatTime(hours, minutes) {
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

function getSLAHoursForPriority(slaPlan, priority) {
  if (!slaPlan) return DEFAULT_SLA_HOURS[priority] || DEFAULT_SLA_HOURS.normal;

  switch (priority) {
    case "emergency": return slaPlan.emergency_hours || DEFAULT_SLA_HOURS.emergency;
    case "high": return slaPlan.high_hours || DEFAULT_SLA_HOURS.high;
    case "normal": return slaPlan.normal_hours || DEFAULT_SLA_HOURS.normal;
    case "low": return slaPlan.low_hours || DEFAULT_SLA_HOURS.low;
    default: return slaPlan.normal_hours || DEFAULT_SLA_HOURS.normal;
  }
}

export default function SLATimer({ createdDate, priority, status }) {
  const [timeRemaining, setTimeRemaining] = useState(null);

  const { data: slaPlans = [] } = useQuery({
    queryKey: ["sla-plans"],
    queryFn: () => db.entities.SLAPlan.list(),
  });

  const slaPlan = slaPlans.find(p => p.is_default && p.status === "active") || slaPlans.find(p => p.status === "active");

  useEffect(() => {
    if (!createdDate || !priority) return;

    const priorityHours = getSLAHoursForPriority(slaPlan, priority);
    setTimeRemaining(calculateTimeRemaining(createdDate, priorityHours));

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(createdDate, priorityHours));
    }, 60000);

    return () => clearInterval(interval);
  }, [createdDate, priority, slaPlan]);

  if (!timeRemaining || ["resolved", "closed"].includes(status)) {
    return null;
  }

  const { expired, hours, minutes, totalMinutes } = timeRemaining;
  const priorityLabel = PRIORITY_LABELS[priority] || "Média";
  const priorityHours = getSLAHoursForPriority(slaPlan, priority);

  let colorClass = "text-green-600 dark:text-green-400";
  let bgColorClass = "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
  let Icon = CheckCircle;

  if (expired) {
    colorClass = "text-red-600 dark:text-red-400";
    bgColorClass = "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
    Icon = AlertTriangle;
  } else if (totalMinutes < 60) {
    colorClass = "text-orange-600 dark:text-orange-400";
    bgColorClass = "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800";
    Icon = Clock;
  } else if (totalMinutes < 180) {
    colorClass = "text-yellow-600 dark:text-yellow-400";
    bgColorClass = "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800";
    Icon = Clock;
  }

  return (
    <div className={cn("rounded-lg border p-3", bgColorClass)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-4 h-4", colorClass)} />
        <span className={cn("text-xs font-semibold uppercase tracking-wide", colorClass)}>
          SLA - {priorityLabel}
        </span>
      </div>
      <div className={cn("text-lg font-bold", colorClass)}>
        {expired ? (
          <span>Vencido há {formatTime(hours, minutes)}</span>
        ) : (
          <span>Restam {formatTime(hours, minutes)}</span>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">
        Prazo: {priorityHours}h úteis {slaPlan && `• Plano: ${slaPlan.name}`}
      </div>
    </div>
  );
}

export function SLATimerMini({ createdDate, priority }) {
  const [timeRemaining, setTimeRemaining] = useState(null);

  const { data: slaPlans = [] } = useQuery({
    queryKey: ["sla-plans"],
    queryFn: () => db.entities.SLAPlan.list(),
  });

  const slaPlan = slaPlans.find(p => p.is_default && p.status === "active") || slaPlans.find(p => p.status === "active");

  useEffect(() => {
    if (!createdDate || !priority) return;

    const priorityHours = getSLAHoursForPriority(slaPlan, priority);
    setTimeRemaining(calculateTimeRemaining(createdDate, priorityHours));

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(createdDate, priorityHours));
    }, 60000);

    return () => clearInterval(interval);
  }, [createdDate, priority, slaPlan]);

  if (!timeRemaining) return null;

  const { expired, hours, minutes, totalMinutes } = timeRemaining;

  let colorClass = "text-green-600";
  if (expired) {
    colorClass = "text-red-600";
  } else if (totalMinutes < 60) {
    colorClass = "text-orange-600";
  } else if (totalMinutes < 180) {
    colorClass = "text-yellow-600";
  }

  return (
    <span className={cn("text-[10px] font-medium", colorClass)}>
      {expired ? `-${formatTime(hours, minutes)}` : formatTime(hours, minutes)}
    </span>
  );
}
