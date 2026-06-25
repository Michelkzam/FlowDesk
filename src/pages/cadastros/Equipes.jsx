import { db } from '@/api/flowdeskClient';

import React from "react";

import CrudPage from "@/components/shared/CrudPage";

export default function Equipes() {
  return (
    <CrudPage
      title="Equipes de Operadores"
      subtitle="Gerencie as equipes de atendimento"
      entityApi={db.entities.OperatorTeam}
      queryKey="operator-teams"
      columns={[
        { key: "name", label: "Nome" },
        { key: "description", label: "Descrição" },
        { key: "status", label: "Status", type: "status" },
      ]}
      formFields={[
        { key: "name", label: "Nome", required: true, placeholder: "Nome da equipe" },
        { key: "description", label: "Descrição", type: "textarea", placeholder: "Descrição da equipe" },
        { key: "status", label: "Status", type: "select", options: [
          { value: "active", label: "Ativa" },
          { value: "inactive", label: "Inativa" },
        ]},
      ]}
      defaultValues={{ status: "active" }}
    />
  );
}