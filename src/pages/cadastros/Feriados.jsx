import { db } from '@/api/flowdeskClient';

import React from "react";

import CrudPage from "@/components/shared/CrudPage";

export default function Feriados() {
  return (
    <CrudPage
      title="Feriados"
      subtitle="Gerencie os feriados do sistema"
      entityApi={db.entities.Holiday}
      queryKey="holidays"
      columns={[
        { key: "name", label: "Nome" },
        { key: "date", label: "Data", type: "date" },
        { key: "recurring", label: "Recorrente", render: (val) => val ? "Sim" : "Não" },
        { key: "notes", label: "Observação" },
      ]}
      formFields={[
        { key: "name", label: "Nome", required: true, placeholder: "Nome do feriado" },
        { key: "date", label: "Data", type: "date", required: true },
        { key: "recurring", label: "Recorrente", type: "select", options: [
          { value: "true", label: "Sim" },
          { value: "false", label: "Não" },
        ]},
        { key: "notes", label: "Observação", type: "textarea", placeholder: "Observações sobre o feriado..." },
      ]}
      defaultValues={{ recurring: "false" }}
    />
  );
}