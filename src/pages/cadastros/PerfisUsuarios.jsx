import { db } from '@/api/flowdeskClient';

import React from "react";

import CrudPage from "@/components/shared/CrudPage";

export default function PerfisUsuarios() {
  return (
    <CrudPage
      title="Perfis de Usuários"
      subtitle="Gerencie os perfis de acesso dos usuários"
      entityApi={db.entities.UserProfile}
      queryKey="user-profiles"
      columns={[
        { key: "name", label: "Nome" },
        { key: "description", label: "Descrição" },
        { key: "status", label: "Status", type: "status" },
      ]}
      formFields={[
        { key: "name", label: "Nome", required: true, placeholder: "Nome do perfil" },
        { key: "description", label: "Descrição", type: "textarea", placeholder: "Descrição do perfil" },
        { key: "status", label: "Status", type: "select", options: [
          { value: "active", label: "Ativo" },
          { value: "inactive", label: "Inativo" },
        ]},
      ]}
      defaultValues={{ status: "active" }}
    />
  );
}