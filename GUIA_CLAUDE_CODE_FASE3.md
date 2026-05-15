# Guia: Desenvolvendo a Fase 3 no Claude Code

## Pré-requisitos

### 1. Instalar Claude Code
No Windows, abra o **PowerShell** (não CMD) e rode:
```powershell
irm https://claude.ai/install.ps1 | iex
```

Depois feche e reabra o terminal. Verifique:
```bash
claude --version
```

> **Importante:** Claude Code requer plano Pro ($20/mês) ou Max. Você já tem Max, então está coberto.

### 2. Autenticar
```bash
claude
```
Na primeira execução ele abre o browser para login. Siga os prompts e autorize.

### 3. Verificar instalação
```bash
claude doctor
```
Esse comando verifica se tudo está OK (PATH, auth, config).

---

## Preparação do projeto

### 4. Colocar o CLAUDE.md na raiz do repo
Copie o arquivo `CLAUDE.md` (entregue junto com este guia) para:
```
C:\Users\Ricardo\despesas-to-dinnero\CLAUDE.md
```

Esse arquivo é lido automaticamente pelo Claude Code no início de cada sessão. Ele contém todas as regras do projeto, a stack, as convenções, e o mapa dos componentes. Não precisa colar nada manualmente — o Claude Code lê sozinho.

### 5. Navegar até o projeto
```bash
cd ~/despesas-to-dinnero
```

### 6. Iniciar sessão
```bash
claude
```

Pronto — você está dentro do Claude Code, no diretório do projeto, com o CLAUDE.md carregado.

---

## Fluxo de trabalho: Fase 3

A Fase 3 tem 3 entregas. Cada uma segue o mesmo ciclo:

```
PLANEJAR → IMPLEMENTAR → REVISAR → TESTAR → DEPLOYAR
```

Abaixo está o prompt e o passo-a-passo para cada entrega.

---

## Entrega 1: Validações pré-exportação

### Prompt para colar no Claude Code:

```
Estou na Fase 3 do Despesas to Dinnero. Primeira entrega: validações pré-exportação.

CONTEXTO:
A ExportPage (função ExportPage no app.jsx) já tem validações básicas que checam:
- despesa sem categoria
- despesa sem justificativa  
- despesa sem foto quando a categoria requer anexo

O que FALTA e preciso que você implemente:

1. Checar campos condicionais obrigatórios por categoria:
   - Hospedagens sem nº de diárias → warning
   - Combustível em viagem / frotas sem placa do veículo → warning
   - Km rodado em viagem / administrativo sem quilômetros → warning

2. Checar participantes em refeições:
   - Qualquer categoria em MEAL_CATEGORIES sem participantes.internos (vazio ou null) → warning

3. Checar valor zerado:
   - dados_nf.valor === 0 ou null → warning

4. Classificar warnings em dois níveis:
   - BLOQUEANTE (borda vermelha, impede exportação): sem categoria, sem anexo quando requerido
   - ALERTA (borda amarela, permite exportar com aviso): sem justificativa, sem campos condicionais, sem participantes, valor zero

5. O botão "Exportar" deve ficar desabilitado se houver warnings bloqueantes.
   Se houver apenas alertas, o botão fica habilitado mas mostra o box amarelo de avisos.

REGRAS:
- Edite apenas a função ExportPage e o bloco de warnings dentro dela
- Mantenha o padrão visual existente (cores --warn, --danger, border-radius, fontes)
- Não quebre nenhum outro componente
- Atualize APP_VERSION_BASE para "1.3.0"
- Depois de implementar, me mostre o diff completo antes de salvar

Comece lendo o app.jsx e me mostre o plano antes de editar.
```

### O que vai acontecer:

1. **Claude Code lê o arquivo** — ele vai abrir o `app.jsx`, encontrar a `ExportPage`, e entender a estrutura atual.

2. **Claude Code propõe um plano** — ele vai descrever o que pretende fazer antes de editar. **Leia o plano com atenção.** Se algo não fizer sentido, corrija antes dele editar.

3. **Claude Code edita o arquivo** — ele vai mostrar as mudanças (diff). Revise o diff.

4. **Você testa no iPhone:**
   - Abra uma viagem com despesas variadas
   - Crie uma hospedagem sem diárias, uma refeição sem participantes, uma despesa sem valor
   - Vá em "Exportar pacote" e confirme que os warnings aparecem corretamente
   - Confirme que warnings bloqueantes desabilitam o botão

5. **Se precisar de ajustes**, diga no Claude Code:
   ```
   O warning de participantes não está aparecendo para "Café da manhã - brasil". 
   Verifique se MEAL_CATEGORIES inclui essa categoria na checagem.
   ```

6. **Quando estiver OK**, faça o deploy:
   ```bash
   ./deploy.sh "PWA v1.3.0 - validações pré-exportação (Fase 3)"
   ```

---

## Entrega 2: Fila offline de processamento de IA

### Decisões a tomar ANTES de implementar

Cole este prompt no Claude Code para discutir antes de codar:

```
Próxima entrega da Fase 3: fila offline de processamento de IA.

Antes de implementar, preciso tomar 3 decisões de design. Me ajude a pensar em cada uma, com prós e contras, e eu decido:

1. VISIBILIDADE DA FILA
   Opções:
   a) Badge com contador no header da TripDetailPage ("3 pendentes de IA")
   b) Indicação apenas no card de cada despesa (pill "Pendente IA")
   c) Ambos (badge + pill individual)

2. TOGGLE EM CONFIGURAÇÕES
   Opções:
   a) "Processar fila automaticamente" (default ON) — roda sozinho quando volta internet
   b) Sem toggle — sempre automático, sem opção de desligar
   c) Toggle com 3 estados: Automático / Manual / Desligado

3. CONFLITO DE EDIÇÃO
   Se o usuário abre uma despesa pendente enquanto a fila está processando ela:
   a) Fila pula essa despesa e tenta de novo depois
   b) Fila pausa completamente enquanto o usuário está editando qualquer despesa
   c) Fila roda normalmente e os dados da IA sobrescrevem o que o usuário preencheu

Me apresente cada opção com prós/contras para o meu caso de uso (viagens corporativas, iPhone, uso pessoal).
```

### Depois de decidir, cole o prompt de implementação:

```
Decisões tomadas para a fila offline:
- Visibilidade: [sua escolha]
- Toggle: [sua escolha]  
- Conflito: [sua escolha]

Agora implemente. Comportamento esperado:

1. Quando a captura acontece sem internet (ou sem chave Gemini), a despesa 
   é salva com um campo `pendente_extracao: true`

2. Detector de conectividade:
   - Escuta o evento `online` do window
   - Quando dispara, faz um fetch leve (HEAD ao endpoint do Gemini) para 
     confirmar que não é captive portal de hotel
   - Se confirmar internet real, inicia processamento da fila

3. Worker de fila:
   - Busca todas as despesas da viagem ativa que tenham `pendente_extracao: true`
   - Processa uma de cada vez
   - Intervalo de 1 segundo entre chamadas
   - Retry: até 3 tentativas com backoff exponencial (1s, 3s, 9s)
   - Após extração bem-sucedida: `pendente_extracao = false`, preenche dados_nf

4. Feedback visual:
   - Toast discreto por despesa processada: "✓ [estabelecimento] extraído"
   - [badge/pill conforme decisão de visibilidade]
   - Despesas que ganharam dados da IA recebem um badge temporário "Atualizado" 
     no ExpenseCard

5. A fila roda APENAS quando:
   - Existe viagem em andamento com despesas pendentes
   - Existe chave Gemini configurada
   - Existe conexão confirmada com internet
   - [condição do toggle se aplicável]

REGRAS:
- A lógica da fila deve ser um hook ou função no nível do App (não dentro de um componente filho)
- Usar refs para evitar re-renders desnecessários durante o processamento
- Não duplicar a lógica de extração — reutilizar geminiExtractFromImage
- Não modificar o fluxo de captura normal (online) — a fila é só para o caso offline
- Atualizar APP_VERSION_BASE para "1.3.1"

Comece lendo o app.jsx (foque no App, CapturePage e geminiExtractFromImage) 
e me mostre o plano.
```

### Ciclo de testes:

1. **Simular offline:** No iPhone, ative modo avião, capture 2-3 despesas
2. **Voltar online:** Desative modo avião e observe se a fila processa automaticamente
3. **Verificar:** Abra cada despesa e confirme que os dados da IA foram preenchidos
4. **Testar conflito:** Capture offline, abra uma despesa pendente para editar, volte online — confirme o comportamento esperado

5. **Deploy quando OK:**
   ```bash
   ./deploy.sh "PWA v1.3.1 - fila offline de processamento de IA (Fase 3)"
   ```

---

## Entrega 3: Junção de múltiplas fotos

### Prompt:

```
Última entrega da Fase 3: junção de múltiplas fotos em um anexo.

PROBLEMA: Algumas NFs têm várias páginas. O Dinnero aceita só 1 anexo por cargo.
A PWA precisa permitir capturar múltiplas fotos e juntar em uma única imagem.

IMPLEMENTAÇÃO:
1. Na CapturePage (step 0, área de captura), adicionar botão "Múltiplas páginas" 
   ao lado dos botões existentes (câmera / fototeca / PDF)

2. Ao clicar "Múltiplas páginas":
   - Abre câmera para primeira foto
   - Após capturar, mostra thumbnail + botão "Adicionar página" + botão "Pronto"
   - Pode adicionar quantas páginas quiser
   - Ao clicar "Pronto": junta todas as imagens verticalmente em um canvas, 
     gera uma única imagem JPEG
   - Essa imagem combinada vira o anexo da despesa (substitui foto individual)

3. A imagem resultante deve:
   - Manter resolução razoável (max width 1200px por página)
   - Comprimir em JPEG quality 0.85
   - Gerar um data URL único que é armazenado como qualquer outra foto

4. A extração via Gemini recebe a imagem combinada normalmente — o modelo 
   consegue ler múltiplas páginas em uma imagem vertical longa

REGRAS:
- Manter os 3 botões existentes intactos (câmera / fototeca / PDF)
- O botão "Múltiplas páginas" é um 4º botão, com ícone diferenciado
- O canvas de junção roda 100% no client-side (sem backend)
- Atualizar APP_VERSION_BASE para "1.3.2"
- Se a junção resultar em imagem > 10MB, alertar o usuário

Leia o app.jsx (foco na CapturePage step 0) e me mostre o plano.
```

### Deploy:
```bash
./deploy.sh "PWA v1.3.2 - junção de múltiplas fotos (Fase 3)"
```

---

## Dicas de uso do Claude Code

### Comandos úteis dentro de uma sessão

| Comando | O que faz |
|---------|-----------|
| `/compact` | Compacta a conversa quando ficar longa (preserva contexto) |
| `/compact Foco nas mudanças da ExportPage` | Compacta preservando contexto específico |
| `Esc Esc` | Volta a uma mensagem anterior (checkpoint) |
| `/clear` | Limpa a conversa e começa do zero (mantém CLAUDE.md) |
| `/cost` | Mostra quanto de quota você já usou na sessão |

### Padrões que funcionam bem

**Antes de pedir implementação, peça o plano:**
> "Leia o arquivo X e me diga o que pretende fazer antes de editar."

**Quando algo der errado, dê contexto específico:**
> "O toast de extração não aparece. Verifique se o showToast está sendo passado como prop pro hook da fila."

**Para mudanças pequenas, seja direto:**
> "Na linha do botão Exportar, troque `disabled={selected.size === 0}` para incluir também a checagem de bloqueantes."

**Para revisar antes de salvar:**
> "Me mostre o diff completo antes de salvar."

**Se a sessão ficar longa (>30 min de conversa), compacte:**
> "/compact Preservar: lista de arquivos modificados, versão atual, decisões tomadas na fila offline"

### Cuidados

- **Claude Code edita arquivos diretamente.** Diferente do chat aqui no claude.ai, ele mexe no arquivo real no disco. Sempre revise os diffs.
- **Git é sua rede de segurança.** Antes de uma sessão grande, faça um commit do estado atual. Se algo der muito errado: `git checkout -- app.jsx`
- **Uma entrega por sessão.** Não peça as 3 entregas de uma vez. Faça uma, teste, deploye, e comece sessão nova para a próxima.
- **Quota:** O plano Max tem limite por janela de 5 horas. Se estiver fazendo muito, pode bater no limite. Nesse caso, espere ou use `/cost` para monitorar.

---

## Checklist final da Fase 3

```
[ ] CLAUDE.md colocado na raiz do repo
[ ] Entrega 1: Validações pré-exportação → v1.3.0 → deploy → teste no iPhone
[ ] Entrega 2: Fila offline → decisões → v1.3.1 → deploy → teste offline/online
[ ] Entrega 3: Múltiplas fotos → v1.3.2 → deploy → teste com NF de 2+ páginas
[ ] CHANGELOG.md atualizado com as 3 entregas
[ ] ROADMAP.md atualizado (Fase 3 = CONCLUÍDA)
```

---

## Resumo: o que vai no repo, o que fica aqui

| Arquivo | Onde | Propósito |
|---------|------|-----------|
| `CLAUDE.md` | Raiz do repo (`~/despesas-to-dinnero/`) | Claude Code lê automaticamente |
| Este guia | Seu computador (referência pessoal) | Passo a passo com prompts prontos |
| `app.jsx` | Repo | Claude Code edita diretamente |
| `CHANGELOG.md` | Repo | Você atualiza após cada deploy |
| `ROADMAP.md` | Repo | Você atualiza ao fechar a Fase 3 |
