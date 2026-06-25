import { db } from '@/api/flowdeskClient';

import React from "react";

import CrudPage from "@/components/shared/CrudPage";

export default function Filas() {
  return (
    <CrudPage
      title="Filas de Atendimento"
      subtitle="Gerencie as filas de atendimento"
      entityApi={db.entities.ChatQueue}
      queryKey="chat-queues"
      columns={[
        { key: "name", label: "Nome" },
        { key: "description", label: "Descrição" },
        { key: "max_capacity", label: "Capacidade" },
        { key: "status", label: "Status", type: "status" },
      ]}
      formFields={[
        { key: "name", label: "Nome", required: true, placeholder: "Nome da fila" },
        { key: "description", label: "Descrição", type: "textarea", placeholder: "Descrição" },
        { key: "max_capacity", label: "Capacidade Máxima", type: "number", placeholder: "10" },
        { key: "status", label: "Status", type: "select", options: [
          { value: "active", label: "Ativa" },
          { value: "inactive", label: "Inativa" },
        ]},
      ]}
      defaultValues={{ status: "active" }}
    />
  );
}