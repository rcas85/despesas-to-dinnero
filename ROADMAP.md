# Roadmap — Despesas to Dinnero

Lista de ideias, melhorias e evoluções futuras do projeto. Não é compromisso — é memória de "coisas que poderíamos fazer um dia".

Estrutura: cada item tem **prioridade** (alta/média/baixa), **horizonte** (curto/médio/longo) e **gatilho** (o que precisa acontecer para virar prioridade).

---

## Status atual (maio 2026)

### ✅ Fase 1 — PWA básica — CONCLUÍDA
PWA rodando em produção (`despesas-to-dinnero.vercel.app`), instalada no iPhone do Ricardo, capturando despesas manualmente com persistência em IndexedDB e exportação para iCloud Drive funcional.

### ✅ Fase 2 — Inteligência (Gemini) — CONCLUÍDA
**Versão final:** v1.2.7-beta (Fase 2 fechada) + v1.2.9-beta (refinamentos pré-Fase 3)

Funcionalidades entregues:
- Extração automática via Gemini 2.5 Flash para imagens e PDFs
- Auto-preenchimento de estabelecimento, valor, data, CNPJ, horário, categoria
- Sugestões inteligentes de categoria e justificativa (com botão "Aplicar")
- Campos condicionais extraídos automaticamente (diárias, placa, km rodados)
- Inferência de quantidade de participantes em refeições (v1.2.9)
- Suporte a PDF como anexo (botão separado da câmera)
- Opção "Foto da fototeca" além de câmera direta (v1.2.9)
- Visualizador de imagens com zoom programático completo
- PDFs abrem no Quick Look nativo do iOS
- Sistema de log de debug para versões beta
- Auto-cadastro de participantes com modelo enriquecido (validado/usado_em/ultimo_uso) (v1.2.9)
- Fuzzy match no autocomplete de nomes (v1.2.9)
- Modo offline gracioso: captura funciona sem internet, preenchimento manual sempre possível

Validação em campo:
- Almoço (cupom NFC-e): extração 100% correta + sugestão de categoria correta
- Combustível (cupom): testado, funcionando
- Hospedagem: identificação de nº de diárias OK
- Táxi/Uber (PDF): origem→destino na justificativa
- Passagem aérea (PDF da Latam): testado e funcionando
- Primeira viagem real iniciada em mai/2026 com v1.2.7-beta; primeira despesa real capturada com sucesso

### ✅ Fase 3 — Refinamentos da PWA — CONCLUÍDA
**Versão final:** v1.3.1-beta

| # | Entrega | Versão | Status |
|---|---------|--------|--------|
| 1 | Validações pré-exportação | v1.3.0 | ✅ Concluída |
| 2 | Fila offline + swipe + undo | v1.3.1 | ✅ Concluída |
| 3 | Junção de múltiplas fotos em um anexo | — | ⏭️ Adiada (sem demanda real) |

Entrega 3 adiada: nunca apareceu NF de várias páginas em uso real. Gatilho para retomar: quando aparecer.

---

## Próximo passo confirmado

### 🔨 Fase 4 — Agente Claude for Chrome
**Status:** próximo a iniciar
**Escopo:** prompt-base do agente que preenche o Dinnero a partir do pacote exportado pela PWA
**Pré-requisito:** Fase 3 concluída (pacote de exportação validado e confiável)

---

## Itens parametrizados para Fase 3

### ✅ Validações pré-exportação — CONCLUÍDA (v1.3.0)
Dois níveis de severidade: bloqueantes (box vermelho, impede exportação) e alertas (box amarelo, permite exportar com aviso). Checa categoria, anexo, justificativa, valor, campos condicionais por categoria e participantes em refeições.

### ✅ Fila offline de processamento de IA — CONCLUÍDA (v1.3.1)
Despesas capturadas offline são marcadas como pendentes e processadas automaticamente quando a internet volta. Dados da IA chegam como sugestões (banners com "Aplicar"), não preenchimento direto. Inclui salvar rápido offline, despesas pendentes no topo da lista, badge "Pendente IA" / "Atualizado", swipe gestures (esquerda = apagar, direita = revisar), toast com botão "Desfazer" por 5 segundos, e shake to undo.

**Decisões tomadas:**
- Visibilidade: badge no header da viagem com contador
- Toggle: sem toggle, sempre automático
- Conflito de edição: fila pula despesa que o usuário está editando

### Junção de múltiplas fotos em um anexo
**Prioridade:** média
**Por que:** Algumas NFs têm múltiplas páginas. Dinnero aceita só 1 anexo por cargo. Se a PWA não juntar, você precisa juntar manualmente.
**Gatilho:** primeira NF de várias páginas que apareça

### Service Worker customizado com estratégia de cache
**Prioridade:** baixa
**Por que:** Hoje a PWA usa o SW padrão. Um SW customizado permitiria cache mais inteligente (stale-while-revalidate), suporte real a offline-first, e fallbacks robustos para recursos críticos.
**Considerações:** trade-off entre complexidade vs benefício. Só vale com alguma necessidade real (ex: voltarmos a depender de CDN externo no futuro).
**Gatilho:** quando houver demanda concreta por offline-first mais robusto

---

## Backlog da primeira viagem real (maio 2026)

### Inferência de quantidade de participantes em refeições — IMPLEMENTADA (v1.2.9)
### Opção "Foto da fototeca" — IMPLEMENTADA (v1.2.9)
### Auto-cadastro de nomes na lista de frequentes — IMPLEMENTADA (v1.2.9)

### Fuzzy match para erros de digitação de nomes — IMPLEMENTADA PARCIALMENTE (v1.2.9)
**O que falta na Fase 4:** caminho de volta do agente Claude for Chrome → PWA, para que quando o agente confirmar um nome canônico no Dinnero, a PWA atualize o nome (ou marque como `validado`).

### Reconhecimento facial / contagem por foto de mesa — EM AVALIAÇÃO
**Prioridade:** indefinida (Ricardo vai pensar)
**Recomendação:** consultar Compliance/TI da Bunge antes de qualquer implementação (LGPD, consentimento, política Bunge sobre fotos de funcionários).

---

## Curto prazo (não vinculado a fase específica)

### Templates de justificativa por categoria
**Prioridade:** baixa (caiu de prioridade)
**Por que caiu:** A IA do Gemini agora gera a justificativa sugerida automaticamente baseada em estabelecimento + horário + categoria. Templates manuais talvez não sejam mais necessários.
**Re-avaliar:** se a IA sugerir justificativas ruins repetidamente em algum caso de uso específico

### Usar repo GitHub como banco de dados de prestações
**Prioridade:** média (ideia nova, mai/2026)
**Por que:** Em vez de exportar via iCloud Drive manualmente, a PWA salvaria os pacotes (manifest JSON) diretamente no repo GitHub, criando um histórico acessível e versionado.
**Considerações:**
- JSONs das prestações pesam kilobytes — OK para o repo
- Fotos das NFs pesam megabytes — NÃO devem ir pro repo (limite GitHub 1 GB)
- Separação: JSONs no repo, fotos ficam no dispositivo até serem consumidas pelo agente
- Possibilidade de expiração: PWA pede autorização para excluir prestações com mais de 1 ano
**Gatilho:** quando o atrito do iCloud manual virar incômodo recorrente

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

## Checklist de fechamento de fase

Executar SEMPRE ao fechar uma fase ou entrega significativa. Evita documentação desatualizada.

```
[ ] app.jsx — versão atualizada (APP_VERSION_BASE)
[ ] CHANGELOG.md — entrada da versão registrada
[ ] ROADMAP.md — status da fase/entrega atualizado
[ ] CLAUDE.md — componentes, modelo de dados e funcionalidades atualizados
[ ] Deploy feito e testado no iPhone
[ ] Commit de docs: ./deploy.sh "docs: atualização pós-vX.Y.Z"
[ ] Memória do projeto atualizada no Claude Chat
```

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
