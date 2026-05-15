# Roadmap — Despesas to Dinnero

Lista de ideias, melhorias e evoluções futuras do projeto. Não é compromisso — é memória de "coisas que poderíamos fazer um dia".

Estrutura: cada item tem **prioridade** (alta/média/baixa), **horizonte** (curto/médio/longo) e **gatilho** (o que precisa acontecer para virar prioridade).

---

## Status atual (maio 2026)

### ✅ Fase 1 — PWA básica — CONCLUÍDA
PWA rodando em produção (`despesas-to-dinnero.vercel.app`), instalada no iPhone do Ricardo, capturando despesas manualmente com persistência em IndexedDB e exportação para iCloud Drive funcional.

### ✅ Fase 2 — Inteligência (Gemini) — CONCLUÍDA
**Versão final:** v1.2.7-beta (Fase 2 fechada) + v1.2.9-beta (refinamentos pré-Fase 3 entregues, aguardando teste em campo)

Funcionalidades entregues:
- Extração automática via Gemini 2.5 Flash para imagens e PDFs
- Auto-preenchimento de estabelecimento, valor, data, CNPJ, horário, categoria
- Sugestões inteligentes de categoria e justificativa (com botão "Aplicar")
- Campos condicionais extraídos automaticamente (diárias, placa, km rodados)
- **Inferência de quantidade de participantes em refeições** (v1.2.9)
- Suporte a PDF como anexo (botão separado da câmera)
- **Opção "Foto da fototeca"** além de câmera direta (v1.2.9)
- Visualizador de imagens com zoom programático completo
- PDFs abrem no Quick Look nativo do iOS
- Sistema de log de debug para versões beta
- **Auto-cadastro de participantes** com modelo enriquecido (validado/usado_em/ultimo_uso) (v1.2.9)
- **Fuzzy match no autocomplete de nomes** (v1.2.9)
- Modo offline gracioso: captura funciona sem internet, preenchimento manual sempre possível

Validação em campo:
- Almoço (cupom NFC-e): extração 100% correta + sugestão de categoria correta
- Combustível (cupom): testado, funcionando
- Hospedagem: identificação de nº de diárias OK
- Táxi/Uber (PDF): origem→destino na justificativa
- Passagem aérea (PDF da Latam): testado e funcionando
- Primeira viagem real iniciada em mai/2026 com v1.2.7-beta; primeira despesa real capturada com sucesso

---

## Próximo passo confirmado

### 🔨 Fase 3 — Refinamentos da PWA
**Status:** próximo a iniciar (em chat novo)
**Escopo definido pela Spec 1.0 + backlog da viagem:**
- Modo offline robusto (fila de processamento de IA) — **detalhamento abaixo**
- Junção de múltiplas fotos em um anexo
- Validações pré-exportação
- Itens do backlog da primeira viagem real (ver "Backlog" abaixo)

**Gatilho:** primeira viagem real em curso usando v1.2.9-beta; ao retornar, prioriza com base no feedback

---

## Backlog da primeira viagem real (maio 2026)

Coletado durante uso de campo da v1.2.7-beta e v1.2.9-beta.

### Inferência de quantidade de participantes em refeições — IMPLEMENTADA (v1.2.9)
Auto-preenchimento via IA do nº de pessoas na refeição. Status: entregue, aguardando validação em campo.

### Opção "Foto da fototeca" — IMPLEMENTADA (v1.2.9)
Status: entregue, aguardando validação em campo.

### Auto-cadastro de nomes na lista de frequentes — IMPLEMENTADA (v1.2.9)
Status: entregue, aguardando validação em campo.

### Fuzzy match para erros de digitação de nomes — IMPLEMENTADA PARCIALMENTE (v1.2.9)
**Status:** parte preventiva entregue (autocomplete tolerante a typos). Parte de retroalimentação fica para Fase 4.
**O que falta na Fase 4:** caminho de volta do agente Claude for Chrome → PWA, para que quando o agente confirmar um nome canônico no Dinnero, a PWA atualize o nome (ou marque como `validado`).

### Reconhecimento facial / contagem por foto de mesa — EM AVALIAÇÃO
**Prioridade:** indefinida (Ricardo vai pensar)
**Por que:** Tecnicamente possível mas levanta questões importantes:
- LGPD aplicada a fotos de colegas (dados biométricos)
- Consentimento das pessoas fotografadas
- Política Bunge sobre fotos de funcionários
- Risco de erro de identificação com consequência política
**Recomendação:** consultar Compliance/TI da Bunge antes de qualquer implementação.

---

## Itens parametrizados para Fase 3

### Fila offline de processamento de IA
**Prioridade:** alta
**Por que:** Hoje, captura sem internet salva a despesa mas não roda a IA — o usuário precisa lembrar de abrir cada despesa e clicar "Re-extrair com IA" manualmente quando voltar a ter sinal. Em viagem internacional sem roaming, ou rota com 4G ruim, isso vira um trabalho de prestação de contas posterior em vez de tempo real.

**Comportamento esperado:**
- Captura offline marca despesa como `pendente_extracao` (status visível)
- Detector dispara quando o iPhone volta a ter internet (evento `online` + check leve com fetch ao Gemini para evitar falso positivo de captive portal de Wi-Fi de hotel)
- Worker processa a fila uma de cada vez, com 1s entre chamadas e retry exponencial até 3 tentativas
- Toasts discretos por extração concluída
- Despesas que ganharam dados via IA recebem badge "Atualizado" pra revisão

**Decisões pendentes (decidir no início da Fase 3):**
- Visibilidade da fila: badge no header da viagem com contador, indicação só no card, ou discreto
- Toggle nas Configurações: "Processar fila automaticamente quando houver internet" (default ON) — dá controle pra usuário revisar antes em casos sensíveis
- Comportamento se o usuário abrir uma despesa pendente enquanto a fila está rodando

**Gatilho:** após primeira viagem real onde a falta de internet cause atrito perceptível

### Junção de múltiplas fotos em um anexo
**Prioridade:** média
**Por que:** Algumas NFs têm múltiplas páginas. Dinnero aceita só 1 anexo por cargo. Se a PWA não juntar, você precisa juntar manualmente.
**Gatilho:** primeira NF de várias páginas que apareça

### Validações pré-exportação
**Prioridade:** média
**Por que:** Antes de gerar o pacote para o agente do Chrome, validar que todas as despesas têm os campos obrigatórios preenchidos para sua categoria (ex: hospedagem sem diárias, refeição sem participantes).
**Gatilho:** Fase 3 iniciada

### Service Worker customizado com estratégia de cache
**Prioridade:** baixa
**Por que:** Hoje a PWA usa o SW padrão. Um SW customizado permitiria cache mais inteligente (stale-while-revalidate), suporte real a offline-first, e fallbacks robustos para recursos críticos.
**Considerações:** trade-off entre complexidade vs benefício. Só vale com alguma necessidade real (ex: voltarmos a depender de CDN externo no futuro).
**Gatilho:** quando houver demanda concreta por offline-first mais robusto

---

## Curto prazo (não vinculado a fase específica)

### Templates de justificativa por categoria
**Prioridade:** baixa (caiu de prioridade)
**Por que caiu:** A IA do Gemini agora gera a justificativa sugerida automaticamente baseada em estabelecimento + horário + categoria. Templates manuais talvez não sejam mais necessários.
**Re-avaliar:** se a IA sugerir justificativas ruins repetidamente em algum caso de uso específico

---

## Médio prazo

### Sincronização em nuvem própria (substitui iCloud manual)
**Prioridade:** média-alta
**Por que:** iCloud manual exige você lembrar de exportar. Sincronização automática elimina esse passo.
**Opções:** Supabase (recomendado, free tier generoso), Firebase, ou backend caseiro
**Considerações:** introduz custo e backend para manter; vale o trade-off só quando o sistema provar valor
**Gatilho:** após 2-3 meses de uso, quando o atrito do export manual virar incômodo recorrente

### Modo "viagem ao vivo" com geolocalização
**Prioridade:** baixa
**Por que:** A PWA poderia detectar automaticamente que você está em viagem (GPS fora da cidade base) e sugerir abrir uma viagem nova ou continuar a existente.
**Gatilho:** depois que a PWA estiver estável e quisermos sofisticar UX

### Preview da prestação antes de exportar
**Prioridade:** média
**Por que:** Mostrar uma "prévia" do que vai acontecer no Dinnero antes de exportar — quais cargos vão preencher, qual ordem, etc.
**Gatilho:** se em algum uso real der erro de matching e você precisar entender melhor

### Botão "Mejorar con IA" do Dinnero — testar uso
**Prioridade:** baixa (curiosidade)
**Por que:** Descobrir se a IA do Dinnero gera justificativas melhores que as nossas. Se sim, podemos pular o template e deixar para ele.
**Gatilho:** uma viagem em que você esteja com tempo de testar

### Histórico de viagens com busca
**Prioridade:** baixa
**Por que:** Encontrar "aquela viagem em que paramos no Posto X" pode ser útil para retroalimentar IA ou refazer contexto.
**Gatilho:** quando você tiver 5+ viagens fechadas no histórico

---

## Longo prazo

### App nativo iOS (App Store)
**Prioridade:** baixa
**Por que:** Vantagens incrementais (Siri shortcuts, widgets, distribuição via TestFlight), mas custo ($99/ano Apple Developer) e fricção (review process) altos.
**Gatilho:** quando a PWA chegar nos limites do que dá para fazer no iOS, ou quando virar ferramenta de equipe oficial

### Multi-tenant e compartilhamento com colegas
**Prioridade:** baixa (mas alta se ganhar tração)
**Por que:** Quando 2-3 colegas pedirem "como faço para usar isso?", já há demanda real. Aí compensa formalizar.
**Pré-requisitos:**
- Login/identidade por usuário
- Configurações isoladas por usuário
- Gestão de chaves API (cada um a sua, ou centralizada)
- Conversa com Compliance/TI da Bunge antes de qualquer formalização
**Gatilho:** após 2-3 meses de uso pessoal estável + interesse real de colegas

### Integração oficial via API do Dinnero (se existir)
**Prioridade:** média
**Por que:** Eliminaria o passo do Claude for Chrome — preencheria direto via API. 10-20x mais rápido e confiável.
**Pré-requisito:** confirmar com TI da Bunge ou suporte do Dinnero se há API oficial para clientes corporativos
**Gatilho:** quando você tiver tempo de fazer essa pergunta ao TI; pode ser feito a qualquer momento em paralelo

### Análise/insights de despesas
**Prioridade:** baixa
**Por que:** Com histórico de viagens, dá para gerar visões úteis: "você gasta em média R$ X por viagem", "estabelecimentos mais frequentes", "categoria mais cara em viagens internacionais", etc.
**Gatilho:** quando houver volume de dados (10+ viagens) que torne a análise interessante

---

## Ideias soltas (sem prioridade definida)

- Notificação push para lembrar de capturar despesa quando o cartão Bunge fizer um cobrança detectada
- Integração com calendário (importar reuniões para sugerir participantes em refeições)
- Modo "desktop companion" — tela web complementar para revisar viagens em telas maiores
- Suporte a múltiplas moedas (despesas internacionais)
- Exportação alternativa em PDF para arquivo pessoal
- Estatísticas de uso da própria PWA (quanto tempo economizou, quantas despesas processou)

---

## Anti-roadmap (coisas que decidimos não fazer e por quê)

### Engenharia reversa da API do Dinnero
**Por quê não:** Área cinzenta de termos de uso, risco/benefício ruim para o caso pessoal. Caminho legítimo é perguntar ao TI/Dinnero se há API oficial.

### Desktop app (Electron, Tauri)
**Por quê não:** A PWA já cobre o caso de uso. Adicionar mais um target de build duplica trabalho de manutenção sem benefício claro.

### IA on-device em vez de Gemini
**Por quê não (por enquanto):** Modelos on-device para extração de NF brasileira ainda têm qualidade inferior ao Gemini Flash, e o custo do Gemini é zero no nosso volume. Reavaliar quando Apple Intelligence ou similares amadurecerem.

### Submeter Reportes automaticamente
**Por quê não:** Decisão de design fundamental — usuário sempre revisa antes do envio. Sem exceções. Esta é uma regra inviolável do agente.

### Reimplementar visualização de PDF em JavaScript (PDF.js)
**Por quê não:** Lição aprendida durante a Fase 2 (v1.2.5 → v1.2.7). Tentamos via CDN, depois vendoring local. Mesmo funcionando, performance, scroll e zoom não competem com o **PDFKit nativo do iOS**. O Quick Look nativo é vastamente superior em todos os critérios e zero código pra manter. Regra geral: quando o sistema operacional já tem componente nativo bom pra um trabalho, delegar é sempre melhor que reimplementar.
