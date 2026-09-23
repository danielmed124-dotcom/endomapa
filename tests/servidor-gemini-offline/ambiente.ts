// Testes inteiramente locais. Nenhuma função real de rede ou ambiente é preservada.
export const ENDPOINT_GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent";

type Handler = (req: Request) => Promise<Response>;
type RespostaSimulada = () => Response | Promise<Response>;
export const estado = {
  handler: null as Handler | null,
  pedidos: [] as { url: string; opcoes?: RequestInit }[],
  reservas: 0,
  tabelas: 0,
  storage: 0,
  permitido: true,
  registros: [] as Record<string, unknown>[],
  responder: (() => { throw new Error("Resposta simulada não configurada."); }) as RespostaSimulada,
};

export function reiniciar() {
  estado.pedidos.length = 0;
  estado.reservas = 0;
  estado.tabelas = 0;
  estado.storage = 0;
  estado.permitido = true;
  estado.registros.length = 0;
  estado.responder = () => { throw new Error("Resposta simulada não configurada."); };
}

Object.defineProperty(Deno, "serve", { configurable: true, value: (handler: Handler) => {
  estado.handler = handler;
  return {};
} });
Object.defineProperty(Deno.env, "get", { configurable: true, value: (nome: string) => {
  const valores: Record<string, string> = {
    SUPABASE_URL: "https://supabase-teste.invalid",
    SUPABASE_ANON_KEY: "anonimo-sintetico",
    SUPABASE_SERVICE_ROLE_KEY: "servico-sintetico",
    GEMINI_API_KEY: "gemini-sintetico",
  };
  if (!(nome in valores)) throw new Error("Tentativa de consultar ambiente não simulado.");
  return valores[nome];
} });
globalThis.fetch = async (entrada: RequestInfo | URL, opcoes?: RequestInit) => {
  const url = entrada instanceof Request ? entrada.url : String(entrada);
  estado.pedidos.push({ url, opcoes });
  if (url !== ENDPOINT_GEMINI) throw new Error("Endpoint inesperado; acesso externo bloqueado pelo teste.");
  return await estado.responder();
};
console.info = (...partes: unknown[]) => {
  if (partes.length !== 1 || typeof partes[0] !== "string") throw new Error("Registro inesperado.");
  estado.registros.push(JSON.parse(partes[0]));
};
