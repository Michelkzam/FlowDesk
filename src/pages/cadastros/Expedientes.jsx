import { db } from '@/api/flowdeskClient';

import React, { useState, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Clock, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const DAYS = [
  { key: "sunday", label: "Domingo" },
  { key: "monday", label: "Segunda-feira" },
  { key: "tuesday", label: "Terça-feira" },
  { key: "wednesday", label: "Quarta-feira" },
  { key: "thursday", label: "Quinta-feira" },
  { key: "friday", label: "Sexta-feira" },
  { key: "saturday", label: "Sábado" },
];

const timeOptions = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    timeOptions.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

const defaultDay = (key) => ({
  day_of_week: key,
  open: key !== "sunday",
  start_time: "08:00",
  pause_time: "12:00",
  return_time: "13:00",
  end_time: "18:00",
  status: key !== "sunday" ? "active" : "inactive",
});

export default function Expedientes() {
  const [schedule, setSchedule] = useState(DAYS.map(d => defaultDay(d.key)));
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["business-hours"],
    queryFn: () => db.entities.BusinessHours.list(),
  });

  useEffect(() => {
    if (records.length > 0) {
      setSchedule(DAYS.map(d => {
        const rec = records.find(r => r.day_of_week === d.key);
        if (rec) return {
          id: rec.id,
          day_of_week: d.key,
          open: rec.status === "active",
          start_time: rec.start_time || "08:00",
          pause_time: rec.pause_time || "12:00",
          return_time: rec.return_time || "13:00",
          end_time: rec.end_time || "18:00",
          status: rec.status || "active",
        };
        return defaultDay(d.key);
      }));
    }
  }, [records]);

  const saveMutation = useMutation({
    mutationFn: async (schedule) => {
      for (const day of schedule) {
        const data = {
          name: DAYS.find(d => d.key === day.day_of_week)?.label || day.day_of_week,
          day_of_week: day.day_of_week,
          start_time: day.start_time,
          pause_time: day.pause_time,
          return_time: day.return_time,
          end_time: day.end_time,
          status: day.open ? "active" : "inactive",
        };
        if (day.id) {
          await db.entities.BusinessHours.update(day.id, data);
        } else {
          await db.entities.BusinessHours.create(data);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-hours"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const updateDay = (key, field, value) => {
    setSchedule(prev => prev.map(d => d.day_of_week === key ? { ...d, [field]: value } : d));
  };

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array(7).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Horário de Expediente
        </h1>
        <p className="text-sm text-muted-foreground">Configure os horários de atendimento por dia da semana</p>
      </div>

      <Card className="border border-border divide-y divide-border overflow-hidden">
        {schedule.map((day) => {
          const label = DAYS.find(d => d.key === day.day_of_week)?.label;
          return (
            <div key={day.day_of_week} className="flex flex-wrap items-center gap-4 px-5 py-4">
              {/* Day label */}
              <div className="w-32 flex-shrink-0">
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>

              {/* Toggle */}
              <div className="flex items-center gap-2 w-28 flex-shrink-0">
                <Switch
                  checked={day.open}
                  onCheckedChange={(v) => updateDay(day.day_of_week, "open", v)}
                />
                <span className={`text-sm font-medium ${day.open ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {day.open ? "Aberto" : "Fechado"}
                </span>
              </div>

              {/* Times */}
              {day.open ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Início</span>
                    <Select value={day.start_time} onValueChange={(v) => updateDay(day.day_of_week, "start_time", v)}>
                      <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-48">{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Pausa</span>
                    <Select value={day.pause_time} onValueChange={(v) => updateDay(day.day_of_week, "pause_time", v)}>
                      <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-48">{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Retorno</span>
                    <Select value={day.return_time} onValueChange={(v) => updateDay(day.day_of_week, "return_time", v)}>
                      <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-48">{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">até</span>
                    <Select value={day.end_time} onValueChange={(v) => updateDay(day.day_of_week, "end_time", v)}>
                      <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-48">{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic">Sem atendimento</span>
              )}
            </div>
          );
        })}
      </Card>

      <Button
        onClick={() => saveMutation.mutate(schedule)}
        disabled={saveMutation.isPending}
        className="w-full bg-primary hover:bg-primary/90 h-11 text-base gap-2"
      >
        <Save className="w-5 h-5" />
        {saved ? "Salvo com sucesso!" : saveMutation.isPending ? "Salvando..." : "Salvar horário"}
      </Button>
    </div>
  );
}