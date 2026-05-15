# Despesas to Dinnero — Instruções para Claude Code

## O que é este projeto
PWA pessoal para captura de despesas de viagem corporativa (Bunge), que alimenta um agente Claude for Chrome para preencher o sistema Dinnero. Arquivo único `app.jsx` com React (via CDN, sem build toolchain). Deploy via Vercel + GitHub.

## Stack e estrutura
- **Arquivo principal:** `app.jsx` (~3000 linhas, arquivo único com tudo)
- **Framework:** React 18 via CDN (UMD), sem JSX compiler — o Vercel serve o .jsx como está, o browser processa via Babel standalone
- **IA:** Google Gemini 2.5 Flash (free tier, 1500 req/dia) — chave armazenada no IndexedDB do dispositivo
- **Persistência:** IndexedDB (stores: `viagens`, `config`, `debug_log`)
- **CSS:** embutido na constante `CSS` dentro do `app.jsx` (template literal)
- **Icons:** SVG inline na constante `Icons`
- **Hospedagem:** Vercel free tier (auto-deploy do branch `main`)
- **Target:** iPhone (Safari standalone / PWA), mas funciona em qualquer browser

## Convenções de código
- Tudo em um arquivo só (`app.jsx`). Não dividir em múltiplos arquivos.
- Componentes React são funções simples (não classes). Hooks: useState, useEffect, useCallback, useRef.
- Nomes de variáveis e funções em inglês (camelCase). Comentários e strings de UI em português.
- Termos do Dinnero permanecem em espanhol quando se referem a elementos da interface deles (ex: "Sólo crear", "Aclaraciones", "Imputaciones").
- CSS usa variáveis definidas em `:root` dentro da constante `CSS`. Tema escuro. Accentos em verde (`--accent: #4ADE80`).
- Fontes: DM Sans (corpo) + JetBrains Mono (valores monetários). Importadas via Google Fonts no CSS.
- `IS_BETA = true` ativa sistema de debug log. Quando virar release, trocar para `false`.
- IndexedDB version = 2. Se precisar adicionar object store, bumpar DB_VERSION e tratar `onupgradeneeded`.

## Componentes existentes (ordem no arquivo)
1. Constantes (CATEGORIES, QUICK_CATEGORIES, MEAL_CATEGORIES, CATEGORY_PROFILES)
2. Helpers (uuid, formatCurrency, formatDate, todayISO)
3. IndexedDB helpers (openDB, dbGetAll, dbPut, dbDelete, dbGet)
4. Debug log (dbGetAllLogs, dbClearLogs, dbAddLogEntry, logEvent)
5. Participantes (normalizeParticipant, addOrUpdateParticipant, levenshtein, searchParticipants)
6. Gemini API (geminiExtractFromImage, geminiTestKey)
7. Icons (objeto SVG)
8. CSS (template literal)
9. AttachmentViewer (visualizador de imagem com zoom)
10. openPdfNative (abre PDF no Quick Look do iOS)
11. **App** (componente raiz — roteamento por estado `view`)
12. TripsPage + TripCard
13. TripDetailPage
14. ExpenseCard
15. CapturePage (3 steps: foto → dados → categoria)
16. EditExpensePage
17. ExportPage
18. SettingsPage
19. buildModais (helper)

## Deploy
```bash
cd ~/despesas-to-dinnero
./deploy.sh "PWA vX.Y.Z - descrição"
```
O script faz git add + commit + push. Vercel deploya automaticamente em ~30s.

## Regras importantes
- NUNCA quebrar o arquivo em múltiplos arquivos. O projeto funciona como single-file PWA.
- NUNCA adicionar dependências externas via npm. Tudo via CDN ou inline.
- NUNCA remover funcionalidades existentes sem pedir confirmação.
- Testar mentalmente se mudanças no CSS afetam componentes que não estão sendo modificados (tudo compartilha o mesmo namespace).
- Ao adicionar features, seguir o padrão visual existente (cores, espaçamentos, border-radius, animações).
- Ao modificar IndexedDB: bumpar DB_VERSION e tratar migração no `onupgradeneeded`.
- Versão atual: ver `APP_VERSION_BASE` no topo do arquivo.

## Versionamento
- Formato: `PWA X.Y.Z-beta` durante desenvolvimento, `PWA X.Y.Z` para releases
- Atualizar `APP_VERSION_BASE` no topo do `app.jsx` a cada entrega
- Registrar mudanças no `CHANGELOG.md`

## Modelo de dados resumido
- **Viagem:** `{ viagem_id, nome, data_inicio, data_fim, status, despesas[] }`
- **Despesa:** `{ despesa_id, captura{}, dados_nf{}, categoria_dinnero, justificativa, campos_condicionais{}, participantes{}, status_revisao, modais_dinnero_aplicaveis[] }`
- **Config:** `{ key:"user", nome, participantes_frequentes[], gemini_api_key }`
- Participante frequente: `{ nome, validado, usado_em, ultimo_uso }`

## Categorias com campos condicionais
- Hospedagens → Nº de diárias (inteiro)
- Combustível em viagem / frotas → Placa do veículo (alfanumérico)
- Km rodado em viagem / administrativo → Quilômetros rodados (inteiro)
- Fee de agência de viagem → NÃO requer anexo (único caso)
- Refeições (9 categorias em MEAL_CATEGORIES) → requerem lista de participantes
