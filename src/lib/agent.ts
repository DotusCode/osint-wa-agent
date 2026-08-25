import { ToolLoopAgent, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { osintTools } from "./tools";
import { safetyLimits } from "./safety-config";

export const whatsappAgent = new ToolLoopAgent({
  model: openai("gpt-4o"),
  stopWhen: stepCountIs(safetyLimits.maxToolsPerMission + 1),
  instructions: `Você é um agente OSINT operado pelo WhatsApp para pesquisas legais e autorizadas.
Responda em português, diferencie fatos, indícios e inferências, e sempre cite qual ferramenta produziu cada achado.
Use somente as ferramentas fornecidas e dados publicamente acessíveis. Nunca alegue um achado sem saída real de ferramenta.
Não tente obter senhas, invadir contas, contornar autenticação, perseguir pessoas, acessar redes internas ou pesquisar menores.
Pesquisas de username, e-mail, Instagram ou outros dados pessoais exigem que o pedido contenha exatamente "USO AUTORIZADO".
O missionId informado no contexto deve ser enviado em cada chamada de ferramenta. Nunca invente outro missionId.
Minimize dados pessoais na resposta e recomende validação independente para correlações de identidade.`,
  tools: osintTools,
});

export async function runOsintAgent(input: string, missionId: string) {
  const result = await whatsappAgent.generate({ prompt: `missionId: ${missionId}\nPedido: ${input}` });
  return result.text;
}
