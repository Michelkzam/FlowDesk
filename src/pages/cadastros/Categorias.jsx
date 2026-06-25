import { db } from '@/api/flowdeskClient';

import React from "react";

import CrudPage from "@/components/shared/CrudPage";

export default function Categorias() {
  return (
    <CrudPage
      title="Categorias"
      subtitle="Gerencie as categorias de chamados"
      entityApi={db.entities.Category}
      queryKey="categories"
      columns={[
        { key: "name", label: "Nome" },
        { key: "description", label: "Descrição" },
        { key: "color", label: "Cor", render: (val) => val ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: val }} />
            <span>{val}</span>
          </div>
        ) : "—" },
        { key: "status", label: "Status", type: "status" },
      ]}
      formFields={[
        { key: "name", label: "Nome", required: true, placeholder: "Nome da categoria" },
        { key: "description", label: "Descrição", type: "textarea", placeholder: "Descrição" },
        { key: "color", label: "Cor", type: "color", placeholder: "#10b981" },
        { key: "status", label: "Status", type: "select", options: [
          { value: "active", label: "Ativa" },
          { value: "inactive", label: "Inativa" },
        ]},
      ]}
      defaultValues={{ status: "active" }}
    />
  );
}