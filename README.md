# Dotus OSINT WhatsApp Agent

Agente OSINT local e independente, controlado por um número exclusivo de WhatsApp via Evolution API. Não possui ferramentas de GitHub ou Vercel.

## Ferramentas integradas

- OpenOSINT: username, e-mail, DNS e WHOIS.
- Toutatis: consulta autorizada de perfis do Instagram com sessão própria.
- Mr.Holmes: enumeração controlada de username usando sua base pública de sites.
- MetaDetective: varredura passiva de metadados publicados, sem download e sem geocodificação.

Os projetos externos não são copiados para este código. `scripts/setup-osint-tools.ps1` instala os pacotes publicados e baixa o Mr.Holmes sem criar repositórios Git locais.

## Segurança configurável

Todos os limites ficam em `config/safety-limits.json`: concorrência, missões por hora, timeout, tamanho de saída, retenção de auditoria, profundidade, threads, taxa de requests, alvos locais bloqueados e exigência da frase `USO AUTORIZADO`.

Cada ferramenta usa argumentos estruturados e `spawn` sem shell. Não existe ferramenta de comando arbitrário. Eventos são gravados como JSONL em `runtime/audit/`, com campos sensíveis removidos. Missões ficam em `runtime/missions/` e sobrevivem a reinícios do processo.

## Instalação

1. Execute `npm install`.
2. Execute `powershell -ExecutionPolicy Bypass -File scripts/setup-osint-tools.ps1`.
3. Copie `.env.example` para `.env.local` e use credenciais novas da Evolution API e um novo `AGENT_OWNER_PHONE`.
4. Preencha `OPENAI_API_KEY`, `WEBHOOK_SECRET`, `MCP_SHARED_SECRET` e, para Toutatis, `INSTAGRAM_SESSION_ID`.
5. Execute `npm test`, `npm run typecheck`, `npm run build` e `npm start`.
6. Exponha o serviço por HTTPS no seu servidor e configure `/api/webhooks/evolution` no webhook da nova instância Evolution.

## WhatsApp

- `AJUDA`: capacidades e política.
- `STATUS <protocolo>`: estado persistido da missão.
- `CANCELAR <protocolo>`: cancela a entrega da missão.
- `REPETIR`: repete o último pedido ainda mantido no processo.

Exemplo: `USO AUTORIZADO: pesquise o username exemplo nas fontes públicas.`

Use somente em pesquisas legais, com finalidade legítima e autorização apropriada. Resultados de correlação não comprovam identidade por si só.
