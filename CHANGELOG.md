# Changelog — Despesas to Dinnero

Histórico de evolução do projeto. Cada entrada registra o que mudou, quando, e por quê.

Formato: `[Versão] - YYYY-MM-DD`

---

## [PWA 1.3.0-beta] - 2026-05-15 — Fase 3: Validações pré-exportação

### Adicionado
- Validações pré-exportação com dois níveis de severidade:
  - **Bloqueantes** (box vermelho, impede exportação): despesa sem categoria, despesa sem anexo quando requerido
  - **Alertas** (box amarelo, permite exportar com aviso): sem justificativa, valor zerado, hospedagem sem diárias, combustível sem placa, km rodado sem quilômetros, refeição sem participantes

### Mudado
- Botão "Exportar" fica desabilitado quando há warnings bloqueantes
- Despesa sem categoria não gera mais warning duplicado de "sem foto" (a categoria é a raiz do problema)

### Notas
- Primeira entrega da Fase 3
- Escopo: apenas ExportPage modificada, nenhum outro componente tocado

---

## [PWA 1.2.9-beta] - 2026-05-11 — Refinamentos pré-Fase 3

### Adicionado
- **Auto-cadastro de participantes**: nomes adicionados em despesas de refeição entram automaticamente na lista de frequentes, com contador de uso e data do último uso
- **Modelo enriquecido de participantes**: lista agora é de objetos `{ nome, validado, usado_em, ultimo_uso }` em vez de strings. Campo `validado` preparado para a Fase 4 (agente Claude for Chrome marca como validado quando o Dinnero confirmar)
- **Fuzzy match no autocomplete**: digite "Jefersn" e ainda encontra "JEFERSON CAUMO". Algoritmo Levenshtein em camadas (prefix > substring > fuzzy). Chips fuzzy aparecem pontilhados/translúcidos pra você notar que é correção de typo
- **Inferência de quantidade de participantes em refeições**: IA tenta deduzir nº de pessoas pelos sinais do cupom (couvert, frações de conta, pratos, ticket médio). Banner verde "IA estima X pessoas · faltam N" aparece e some quando você completa
- **Opção "Foto da fototeca"** ao lado de "Tirar foto": 3 botões (câmera direta / galeria iOS / PDF). O botão "Da fototeca" abre o seletor nativo do iOS sem forçar câmera
- **Indicador de validação em Configurações**: participantes validados pelo Dinnero (futuro) aparecem com check verde; contador de uso "Nx" ao lado de cada nome

### Mudado
- Lista de participantes frequentes em Configurações ordena por uso e mostra "0 nomes / Lista vazia" quando não há nada cadastrado
- Migração transparente: configs antigas (com strings) são convertidas para o novo formato automaticamente sem perda

### Notas
- Versão entregue para teste em campo. Aguardando feedback antes de fechar pré-Fase 3.
- Decidido: retroalimentação real do agente (corrigir nomes) fica para Fase 4. Infraestrutura (`validado: true|false`) já está pronta no modelo de dados.

---

## [PWA 1.2.7-beta] - 2026-05-09 — Fase 2 fechada

### Mudado
- PDFs agora abrem no **Quick Look nativo do iOS** em vez de visualizador customizado da PWA
- Visualizador modal mantido apenas para imagens (com zoom programático já validado)

### Removido
- Toda a infra do PDF.js (loader, render canvas, conversão data URL → bytes, spinner de progresso)
- Vendoring de `vendor/pdfjs/pdf.min.js` e `pdf.worker.min.js` (~1.4 MB de assets desnecessários no repo)
- CSS órfão de `.pdf-pages` e `.pdf-fallback`

### Decisão arquitetural registrada
Após sequência iterativa de tentativas (CDN externo → vendoring local → PDF.js sob demanda), descobrimos que reimplementar visualização de PDF em JavaScript não compete com o **PDFKit nativo do iOS** em performance, scroll, zoom e familiaridade do usuário. Quando o sistema operacional tem componente nativo bem feito, delegar pra ele é sempre superior. Lição também registrada no anti-roadmap.

---

## [PWA 1.2.6-beta] - 2026-05-09

### Adicionado
- PDF.js vendorizado em `/vendor/pdfjs/` (v3.11.174, último release com build `.js` clássico)
- Probe HTTP HEAD em caso de falha de carregamento, com log enriquecido (status, SW ativo, origin)
- Fallback gracioso "Baixar PDF original" se renderização falhar
- Documento `VENDOR_PDFJS.md` com instruções de vendoring

### Mudado
- Tirou dependência do CDN externo (era SPOF; falhava silenciosamente no iOS Safari standalone)

### Notas de uso real
- Confirmado: a v4.0.379 do PDF.js só publica `.mjs` (módulos ES), por isso o `pdf.min.js` retornava 404 silencioso. A v3.11.174 ainda tem build clássico.
- Bug operacional: o primeiro deploy do `vendor/` não chegou ao GitHub. Recommit explícito (`git add vendor/` + `git commit` + `git push`) resolveu.

---

## [PWA 1.2.5-beta] - 2026-05-09

### Adicionado
- Renderização de PDF via PDF.js (canvas) dentro da PWA
- Loader sob demanda via CDN (`cdnjs.cloudflare.com`)
- Spinner de progresso "Renderizando PDF… X%"
- Suporte a múltiplas páginas com scroll vertical

### Notas
- Esta versão não passou em produção (CDN bloqueado no iPhone do Ricardo, ver 1.2.6)
- Foi a primeira tentativa de "PDF.js dentro da PWA", depois substituída pela abordagem nativa em 1.2.7

---

## [PWA 1.2.4-beta] - 2026-05-09

### Adicionado
- Zoom programático completo no visualizador de imagens (pinça com 2 dedos, double-tap, botões + / −, pan ao arrastar)
- Captura de gestos via `touch-action: none` e handlers JS (necessário porque o viewport meta da PWA bloqueia zoom nativo)

### Corrigido
- Zoom da imagem que não funcionava no viewer (PWA com `user-scalable=no` bloqueava o pinch nativo)

---

## [PWA 1.2.3-beta] - 2026-05-09

### Mudado
- PDF agora renderiza dentro do viewer da PWA via blob URL (em vez de `window.open` que tirava o usuário do app)

### Corrigido
- "Abrir PDF" não voltava à PWA — exigia fechar o app e abrir de novo

---

## [PWA 1.2.2-beta] - 2026-05-09

### Adicionado
- Visualizador full-screen `<AttachmentViewer>` para anexos
- Modal sobreposto à PWA, fundo escuro, botão X no topo
- Preview de imagens em tamanho real
- Indicador visual "ver completa" nos previews da captura e edição
- Botão "Trocar foto" separado da área de preview tappable

### Decisão de design
Read-only puro — visualizador apenas mostra, não edita.

---

## [PWA 1.2.1-beta] - 2026-05-09

### Adicionado
- Sistema de log de debug para versões beta (object store `debug_log` no IndexedDB)
- Captura automática de eventos: `gemini_error`, `parse_error`, `file_read_error`, `runtime_error`, `unhandled_rejection`
- Seção "Debug & Log (beta)" em Configurações com contador de eventos, KB acumulado, botão Copiar, Exportar (.json) e Limpar log
- Build flags `IS_BETA` + `APP_VERSION` no topo do arquivo — quando virar versão estável basta trocar `IS_BETA = false`
- Cap automático do log: 100 entradas / 500 KB com FIFO
- DB_VERSION bumpado para 2 (upgrade automático silencioso para usuários existentes)

---

## [PWA 1.2.1] - 2026-05-09

### Adicionado
- Auto-preenchimento de campos condicionais quando a IA extrai (`diarias_extraidas`, `placa_veiculo`, `km_rodados`)
- Prompt do Gemini agora pede explicitamente esses três campos no JSON de retorno

### Mudado
- Diárias e km vão direto para o campo numérico (sem botão "Aplicar"), pois são valores unívocos — diferente de categoria/justificativa que ainda permitem revisão humana

### Notas de uso real
- Hospedagem: a IA já identificava número de diárias na justificativa mas não preenchia o campo numérico — corrigido nesta versão
- Táxi/Uber: PDFs funcionam bem; sugestão de justificativa com origem→destino quando o recibo traz
- Passagem aérea: PDF da Latam testado com sucesso

---

## [PWA 1.2.0] - 2026-05-09

### Adicionado
- Suporte a PDF como anexo (botão separado "Anexar PDF" ao lado de "Tirar foto / galeria")
- Card visual para preview de PDF (ícone azul, nome do arquivo, tamanho)
- Sugestão de justificativa pela IA via campo `justificativa_sugerida` no prompt
- Banner verde com botão "Aplicar" para a sugestão de justificativa (mesmo padrão da sugestão de categoria)
- Regras específicas de justificativa por categoria no prompt (refeição, hospedagem, combustível, táxi, pedágio, passagem aérea, aluguel)
- Campos `cidade`, `origem`, `destino` no retorno do Gemini (úteis principalmente para táxi/uber/passagem aérea)
- Persistência de `anexo_tipo` e `anexo_nome_original` no objeto da despesa (preparação para Fase 4 do agente)
- Extensão dinâmica do `foto_path` no pacote de exportação (.pdf ou .jpg)

### Mudado
- ExpenseCard mostra ícone de PDF azul em vez de thumbnail quando anexo é PDF

---

## [PWA 1.1.0] - 2026-05-09 — Início da Fase 2

### Adicionado — IA de extração via Gemini
- Helpers `geminiExtractFromImage()` e `geminiTestKey()` chamando `gemini-2.5-flash` no free tier
- Prompt robusto com 48 categorias do Dinnero e heurísticas inline (hotel→Hospedagens, posto→Combustível, restaurante+horário, Uber→Táxi, etc.)
- Campo da chave Gemini em Configurações com toggle olho/olho fechado para visibilidade
- Botão "Testar conexão" com feedback verde/vermelho
- Banner de status da IA na captura: azul (processando), verde (extraído), amarelo (verificar) ou erro
- Badges "IA" / "Verifique" ao lado de cada campo conforme nível de confiança (≥0.8 = verde, abaixo = amarelo)
- Sugestão de categoria como banner pontilhado verde com botão "Aplicar"
- Modo offline gracioso: sem chave ou sem internet, mostra aviso e permite preenchimento manual
- Botão "Re-extrair com IA" na tela de edição
- Confiança da extração persistida em `dados_nf.confianca_extracao`
- Campos `horario` e `cnpj` no retorno do Gemini, persistidos em `dados_nf`

### Decisões tomadas
- Threshold de confiança visual: 0.8 (acima = badge "IA" verde, abaixo = badge "Verifique" amarelo)
- Chave Gemini fica apenas no IndexedDB do dispositivo, nunca trafega para fora além das chamadas à API do Google
- Modo offline não bloqueia uso — usuário sempre consegue preencher manualmente
- Auto-extração roda imediatamente após a foto, sem confirmação — UX mais rápida

---

## [Spec 1.0] - 2026-05-07

### Adicionado
- Especificação técnica inicial completa (10 seções + anexo de discovery)
- Definição da stack: PWA + Vercel + Gemini 2.5 Flash + IndexedDB + iCloud Drive + Claude for Chrome
- Modelo de dados (viagem, despesa, pacote de exportação)
- Mapeamento PWA → Dinnero campo a campo, modal a modal
- Plano de construção em 5 fases
- Lista das 48 categorias do Dinnero
- Perfis das 10 categorias mais usadas pelo Ricardo
- Regras invioláveis do agente Claude for Chrome (nunca submeter, nunca eliminar, etc.)

### Decisões tomadas
- Nome do projeto: "Despesas to Dinnero"
- Idioma da interface: Português (com termos do Dinnero em espanhol nos campos de saída)
- Suporte a modo offline: sim, captura funciona sem internet; IA processa em background quando houver sinal
- Hospedagem: Vercel free tier
- IA: Gemini 2.5 Flash (free tier, 1500 req/dia)
- Armazenamento: IndexedDB local + exportação manual para iCloud Drive
- Modelo de revisão: usuário sempre revisa antes do envio do Reporte; nada é submetido automaticamente

### Discovery realizado (camadas)
- Conversa exploratória inicial sobre problema e ferramentas
- Mapeamento estrutural via Claude for Chrome (3 modais documentados, 49 categorias listadas)
- Word com prints de prestação real de hospedagem (17 prints)
- Word com prints de prestação de refeição (8 páginas)
- Word com prints de campos condicionais (fee, combustível, km rodado)
- Conversa para definir stack tecnológica e arquitetura

---

## Convenções

- **Spec X.Y** = versão da especificação técnica
- **PWA X.Y** = versão da PWA construída
- **PWA X.Y-beta** = versão de desenvolvimento com sistema de log ativo
- **Agent X.Y** = versão do prompt-base do agente Claude for Chrome
- Versões evoluem independentemente. Spec pode ir à 1.3 enquanto PWA está na 1.0.
- Mudanças significativas → bump no primeiro dígito (1.x → 2.0). Ajustes pequenos → segundo dígito (1.0 → 1.1).
