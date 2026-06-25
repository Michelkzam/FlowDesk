import { db } from '@/api/flowdeskClient';

import React from "react";

import CrudPage from "@/components/shared/CrudPage";

export default function Setores() {
  return (
    <CrudPage
      title="Setores de Solicitantes"
      subtitle="Gerencie os setores dos solicitantes"
      entityApi={db.entities.RequesterSector}
      queryKey="requester-sectors"
      columns={[
        { key: "name", label: "Nome" },
        { key: "description", label: "Descrição" },
        { key: "status", label: "Status", type: "status" },
      ]}
      formFields={[
        { key: "name", label: "Nome", required: true, placeholder: "Nome do setor" },
        { key: "description", label: "Descrição", type: "textarea", placeholder: "Descrição" },
        { key: "status", label: "Status", type: "select", options: [
          { value: "active", label: "Ativo" },
          { value: "inactive", label: "Inativo" },
        ]},
      ]}
      defaultValues={{ status: "active" }}
    />
  );
}