import { estado } from "./ambiente.ts";

export function createClient(url: string, chave: string, _opcoes?: unknown) {
  if (url !== "https://supabase-teste.invalid"
    || !["anonimo-sintetico", "servico-sintetico"].includes(chave)) {
    throw new Error("Cliente recebeu configuração não simulada.");
  }
  return {
    auth: { getUser: async () => ({ data: { user: { id: "usuario-ficticio" } } }) },
    rpc(nome: string) {
      if (nome !== "reservar_geracao_imagem") throw new Error("Operação de banco não simulada.");
      estado.reservas += 1;
      return { single: async () => ({ data: { permitido: estado.permitido, motivo: "limite_atingido" }, error: null }) };
    },
    from(_nome: string): never {
      estado.tabelas += 1;
      throw new Error("O modo direto não deve consultar nem gravar tabela de último resultado.");
    },
    get storage(): never {
      estado.storage += 1;
      throw new Error("O modo direto não deve consultar nem gravar arquivos armazenados.");
    },
  };
}
