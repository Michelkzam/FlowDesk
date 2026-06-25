import { db } from '@/api/flowdeskClient';

import React from "react";

import CrudPage from "@/components/shared/CrudPage";

export default function Clientes() {
  return (
    <CrudPage
      title="Clientes"
      subtitle="Gerencie os clientes do sistema"
      entityApi={db.entities.Client}
      queryKey="clients"
      columns={[
        { key: "name", label: "Nome" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Telefone" },
        { key: "company", label: "Empresa" },
        { key: "document", label: "CPF/CNPJ" },
        { key: "status", label: "Status", type: "status" },
      ]}
      formFields={[
        { key: "name", label: "Nome", required: true, placeholder: "Nome do cliente" },
        { key: "email", label: "Email", type: "email", placeholder: "email@exemplo.com" },
        { key: "phone", label: "Telefone", placeholder: "(00) 00000-0000" },
        { key: "company", label: "Empresa", placeholder: "Nome da empresa" },
        { key: "document", label: "CPF/CNPJ", placeholder: "000.000.000-00" },
        { key: "status", label: "Status", type: "select", options: [
          { value: "active", label: "Ativo" },
          { value: "inactive", label: "Inativo" },
        ]},
        { key: "notes", label: "Observações", type: "textarea", placeholder: "Observações..." },
      ]}
      defaultValues={{ status: "active" }}
    />
  );
}