// Versão 2. O fluxo atual usa Images API diretamente; não há modelo de texto
// separado nem campo `instructions` neste endpoint. Estas regras orientam o
// template visual abaixo e qualquer futuro interpretador deve recebê-las de novo.
export const REGRAS_ASSISTENTE_MEDICO = `Você auxilia na criação e edição de mapas anatômicos médicos didáticos. Avalie o conteúdo e o contexto efetivos. Descreva estruturas e relações com linguagem anatômica objetiva. Distinga atlas tridimensional de fotografia de procedimento. Não invente lesões, diagnósticos, medidas ou lateralidade; informação ausente permanece não informada. Preserve a base e limite edições às regiões autorizadas. Só declare conclusão após receber e verificar uma imagem utilizável. Uma recusa preserva o trabalho original. Estas regras não substituem as regras do provedor.`;

export const VERSAO_PROMPT_MAPA = "mapa-medico-v2";

export function construirPromptMapaMedico({ inventario, largura, altura, referenciaAnexada }) {
  if (!referenciaAnexada || !Array.isArray(inventario) || !inventario.length) {
    throw new Error("Mapa ou referência ausente.");
  }
  const achados = inventario.map((item, indice) =>
    `${indice + 1}. ${item.nome}; centro (${item.x.toFixed(1)}%, ${item.y.toFixed(1)}%); área aproximada ${item.largura.toFixed(1)}% × ${item.altura.toFixed(1)}%`).join("; ");
  return [
    "Finalidade: ilustração médica didática de anatomia pélvica e achados já informados, para revisão por médico radiologista.",
    "Representação: atlas anatômico tridimensional ilustrado, com volume, sombreamento e textura orgânica; não é fotografia de procedimento.",
    "Operação: edição do mapa completo enviado como imagem 1. A imagem 1 determina anatomia, composição, quantidade, tipo, posição e dimensões dos achados.",
    `Estruturas e achados informados (${inventario.length} itens distintos): ${achados}. Nomes repetidos indicam achados separados. As coordenadas começam no canto superior esquerdo da imagem inteira.`,
    "Alteração solicitada: redesenhar visualmente os achados existentes e sua transição com o tecido adjacente; uma mudança global de cor ou contraste não basta.",
    "Referência: imagem 2 efetivamente anexada, ilustração didática aprovada somente para estilo, material, relevo e iluminação. Não copiar suas lesões, posições ou dispositivos.",
    "Preservar: todos os achados distintos, sua morfologia, lateralidade, órgão, centros e dimensões aproximadas; anatomia da imagem 1, enquadramento, fundo branco e logomarca. Não acrescentar, apagar, fundir ou deslocar achados. Não criar rótulos ou texto; o aplicativo adiciona rótulos depois.",
    "Acabamento: continuidade de textura, volume ilustrativo, iluminação coerente e sombras discretas de contato, mantendo conteúdo interno identificável em cistos e nódulos.",
    `Saída: ilustração completa em PNG, ${largura} × ${altura} pixels, para comparação e revisão médica.`,
  ].join("\n");
}
