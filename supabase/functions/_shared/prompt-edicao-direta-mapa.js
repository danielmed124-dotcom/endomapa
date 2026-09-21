export const VERSAO_PROMPT_DIRETO = "mapa-direto-v1";

export const PROMPT_EDICAO_DIRETA = [
  "Finalidade: ilustração anatômica médica didática para revisão de um médico radiologista.",
  "A única imagem anexada é o mapa completo já montado. Use-a como fonte de todas as estruturas, achados, posições, lados, quantidades, cores e proporções. Não há segunda referência.",
  "Operação: refazer o acabamento visual do mapa completo em estilo de atlas anatômico tridimensional. Redesenhe visivelmente cada achado já presente e sua ligação com o tecido adjacente, com volume coerente, textura contínua, iluminação comum e sombra de contato. Remova a aparência de elemento colado sem substituir o tipo ou o conteúdo visual de qualquer achado.",
  "Preserve o número de achados e suas formas clínicas distintas, centros, tamanhos aproximados, lateralidade, relações anatômicas e conteúdo interno. Preserve também órgãos, tubas, ligamentos, fundo branco, enquadramento e logomarca. Não acrescente, apague, troque, funda ou desloque achados.",
  "Faça a melhora nas próprias lesões e nas suas bordas de contato; uma mudança global de tonalidade, contraste ou nitidez não atende ao pedido. Mantenha as cores características de cada achado. Não transforme a ilustração em fotografia cirúrgica.",
  "Saída: um único mapa completo em PNG para comparação visual e revisão médica. Não acrescente texto, setas ou novas marcas.",
].join("\n");
