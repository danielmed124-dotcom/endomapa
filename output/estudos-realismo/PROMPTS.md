# Estudos de integração das lesões

Gerados com a ferramenta integrada de imagens, usando as referências já existentes no projeto. São propostas de aparência para avaliação, não substituições aprovadas dos mapas. A geometria e o tecido adjacente foram reconstruídos pela IA; não devem ser tratados como preservação exata da referência.

## Aplicação localizada ao mapa

### Versão selecionada pelo usuário

O usuário esclareceu a seleção anexando a imagem correta: **`mapa-gerado-v1.png`**. Esta é a imagem selecionada integralmente, sem recomposição, alteração do cisto ou ajuste do ligamento. A referência isolada `ligamento-integracao-v1.png` e a montagem `mapa-integrado-v2.png` não representam essa seleção. A interpretação anterior de “V1” estava incorreta e foi substituída por esta identificação explícita. O link principal em `index.html` aponta diretamente para `mapa-gerado-v1.png`. As outras montagens permanecem somente como histórico; nenhum pixel da imagem selecionada foi modificado nesta correção.

### Ajuste da junção, mantendo a direção visual do V1

O usuário preferiu o aspecto nodular do V1 e rejeitou a tentativa de achatamento. O cisto da segunda montagem foi mantido sem mudanças.

`preparar-contexto.js` extrai do mapa integrado V2 a região x=350, y=740, largura=170, altura=170 e amplia seis vezes para edição. A ferramenta integrada de imagens editou esse recorte. `montagem-juncao.js` reinsere somente a região do ligamento, suavizando a borda externa no tecido adjacente.

- Entrada: `ligamento-contexto-original.png`.
- Recorte editado: `ligamento-juncao-v1.png`.
- Nova montagem: `mapa-integrado-v3.png`.
- Comparação: `mapa-v3.html`.
- Conferência: `verificacao-montagem-v3.json`; nenhum pixel do cisto foi alterado em relação à montagem V2.

A IA manteve a direção visual nodular, mas a exatidão dos detalhes internos e do contato anatômico continua sujeita à avaliação do usuário. A contagem de pixels não é validação clínica. A versão achatada não foi aplicada.

Prompt usado na ferramenta integrada:

```text
Precise local edit of this enlarged medical atlas illustration. The physician wants to KEEP the existing dark red-brown raised nodular lesion exactly as it is: same visible nodules, shape, extent, color, highlights and relief. Do not flatten it, turn it into a plaque, recolor it, enlarge it, add nodules or remove nodules. The ONLY requested improvement is the contact interface with the underlying curved ligament. Work on the immediately adjoining pale tissue: make it naturally meet and gently wrap the base of each existing prominence, removing visible pasted-image seams and stippled cutout artifacts. Preserve the actual curved course, outer edges, width, attachments and lighting of this ligament, and keep all surrounding anatomical forms in exactly the same places. Make the junction continuous in texture and contact shading with both the lesion and the existing ligament. Avoid a newly drawn uniform ring, an outline around the lesion, a pink rectangular patch, sharp cutout edges or a detached shadow suggesting the lesion is hovering above the surface. This is a non-graphic medical atlas visual-editing task. The supplied image is the edit target, not a loose reference. Return exactly this same square crop, same camera and composition, with only the local surface junction improved. No new anatomical findings, text or insets.
```

### Segunda montagem: referências com tecido adjacente

Após a rejeição da primeira montagem, `montagem-referencias.js` passou a compor diretamente os dois estudos aprovados sobre o mapa original. Não utiliza uma nova geração do mapa inteiro, nem a imagem `mapa-gerado-v1.png`.

- `mapa-v2.html`: comparação atual, com ampliações.
- `mapa-integrado-v2.png`: segunda montagem completa.
- `verificacao-montagem-v2.json`: conferência técnica desta montagem.

A composição inclui a borda de tecido do cisto e o trecho superficial do ligamento. Ajusta a cor do tecido periférico e suaviza a transição para o mapa. Para impedir que a lesão antiga permaneça ao lado da nova, remove fragmentos escuros isolados na região do ligamento usando amostras de tecido vizinho; componentes escuros contínuos com o exterior da região são preservados como fundo. Essas regras foram feitas para este único exemplo e não são um método clínico de identificação de lesões.

A origem da textura e do contato com o tecido são as imagens já geradas pela IA. Não houve uma nova geração nesta segunda montagem. A forma interna e a distribuição dos detalhes das referências não são idênticas às do recorte original; a proposta exige avaliação visual e clínica e ainda não está publicada no aplicativo.

### Primeira montagem: edição do mapa inteiro, depois limitada

O usuário aprovou a direção visual dos dois estudos. A nova edição utilizou o mapa enviado por ele e as duas referências aprovadas. O resultado bruto da IA (`mapa-gerado-v1.png`) também modificou partes do fundo anatômico; por isso ele não é apresentado como montagem final.

A montagem em `montagem-local.js` copia somente duas regiões delimitadas, incluindo uma estreita faixa de contato, sobre os pixels da imagem original. A saída `mapa-integrado-v1.png` conserva o restante do mapa. Os limites de montagem foram definidos para este exemplo, não são regras clínicas nem um detector de lesões. Não há garantia de preservação dos detalhes internos das regiões editadas.

Arquivos para conferência:

- `mapa.html`: comparação com ampliações do cisto, ligamento e mapa completo; abre também como arquivo local.
- `mapa-original.webp`: cópia da imagem que o usuário enviou.
- `mapa-integrado-v1.png`: montagem localizada, 1024 × 1536.
- `verificacao-montagem.json`: contagem de pixels alterados. Nenhum pixel foi alterado fora das áreas de montagem.

Modo usado: ferramenta integrada de geração de imagens; composição final por código no navegador. Nenhum arquivo do aplicativo publicado foi alterado nesta etapa.

Prompt da edição com referências:

```text
Use case: precise-object-edit. Image 1 is the full medical atlas map to edit. Images 2 and 3 are physician-approved MATERIAL AND TISSUE-CONTACT STYLE studies, not geometry references. Produce a single edited copy of image 1, same 1024x1536 portrait composition. Apply the material rendering of image 2 to the small existing elongated dark lesion beside the cervix on the viewer-left diagonal ligament, approximately x394–472 y778–863. Apply the material rendering of image 3 to the small existing purple oval on the viewer-left ovary, approximately x263–325 y762–835. The visual improvement should reproduce the studies' clearly modeled organic surfaces, strong dark contrast, coherent lighting, and convincing junction of lesion base and neighboring tissue. Keep the lesions the SAME SIZE, position and overall extent as in image 1; do not enlarge them to the size seen in the studies. Allow only a narrow contact seam of neighboring tissue to meet each lesion, without creating new findings. Preserve every other part of image 1, including the complete anatomy and framing, organs, background, CentrusMG branding, logo and text. No added lesions, separate points, vessels or labels. Non-graphic medical atlas illustration for visual review. Do not change the global brightness or soften the entire map. Do not fade the lesions into pale spots. Use the same strong dark chocolate-brown relief as image 2 for the elongated lesion and the dark muted purple membrane and tissue-contact edge of image 3 for the oval. The task is local visual integration of these existing two shapes, not reinterpretation of the anatomy.
```

## Lesão no ligamento

Entrada: `assets/lesoes/endometriose-isolada-referencia-transparente.png`.
Saída: `ligamento-integracao-v1.png`.

```text
Create a magnified, non-graphic medical atlas illustration of the supplied endometriosis lesion integrated into a short segment of ligament. The attached image is the exact lesion-shape reference: preserve its narrow diagonal lower-left to upper-right overall outline and the distribution of its existing small projections. This is a material-and-contact study for a physician-designed anatomical diagram. Depict the lesion as a dark chocolate-brown and burgundy irregular low raised plaque physically continuous with a pale salmon-pink ligament surface. Show restrained moist highlights, fine organic surface texture, and tight contact shading at the lesion's base so it visibly joins the ligament surface. Dark color and surface relief must remain clearly readable even in a thumbnail. Surrounding ligament: one narrow softly rounded diagonal band passing beneath the lesion, extending off the lower-left and upper-right sides of the composition, fine longitudinal fibers and gentle warm atlas illumination. Lesion and ligament must share the same lighting and rendering style. Do not lighten the lesion into a pale stain. Do not add any new lesions, separate lumps, vessels or anatomical findings. No blood, incision, wound, instruments, labels or text. Close-up illustrative rendering on a plain warm white background. Single square image, with the existing lesion occupying the central half of the composition, suitable for visual review of tissue integration.
```

## Cisto no ovário

Entrada: `assets/lesoes/cisto-referencia.png`.
Saída: `cisto-integracao-v1.png`.

```text
Create a close-up non-graphic medical atlas illustration for physician visual review, studying how this supplied cyst illustration meets an ovarian surface. The supplied image is the cyst material and oval-outline reference. Depict one small oval cyst partly embedded in the outer surface of an isolated pale cream and warm pink ovary, using a polished naturalistic medical atlas illustration style. One cyst only. Its visible dome is dark muted plum-purple with maroon undertones, nonuniform organic membrane texture and restrained highlights matching warm light from upper left. Preserve a simple oval outline without internal nodules or additional findings. It must look like an organic part of the ovary rather than a separate shiny plastic sphere placed on top. At the base, neighboring ovarian tissue naturally meets and partly overlaps the cyst edge, with a fine contact shadow conveying depth and shared curvature. The ovary remains pale, delicately textured, smoothly rounded and clearly recognizable; do not invent a dissected cross-section, wounds, instruments or external anatomy. Strong dark-versus-light contrast makes the single cyst readable. No pale purple wash, large white glare, plastic sheen, labels or text. Square illustration with the isolated ovary centered on warm white background; cyst centered on its visible lower-left surface occupying roughly one quarter of the ovary's width. This is an illustrative appearance study, not an interpretation of medical findings.
```
