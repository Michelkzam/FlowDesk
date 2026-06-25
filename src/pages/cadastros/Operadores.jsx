import { db } from '@/api/flowdeskClient';

import React from "react";

import CrudPage from "@/components/shared/CrudPage";

export default function Operadores() {
  return (
    <CrudPage
      title="Operadores"
      subtitle="Gerencie os operadores de atendimento"
      entityApi={db.entities.Operator}
      queryKey="operators"
      columns={[
        { key: "name", label: "Nome" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Telefone" },
        { key: "status", label: "Status", type: "status" },
      ]}
      formFields={[
        { key: "name", label: "Nome", required: true, placeholder: "Nome do operador" },
        { key: "email", label: "Email", type: "email", required: true, placeholder: "email@exemplo.com" },
        { key: "phone", label: "Telefone", placeholder: "(00) 00000-0000" },
        { key: "status", label: "Status", type: "select", options: [
          { value: "online", label: "Online" },
          { value: "offline", label: "Offline" },
          { value: "busy", label: "Ocupado" },
        ]},
      ]}
      defaultValues={{ status: "offline" }}
    />
  );
}