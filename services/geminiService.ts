
import { GoogleGenAI } from '@google/genai';
import type { QuoteData, QuoteStep, Currency, TechnicalReportData } from '../types';

// Helper function to get API Key from various sources
const getApiKey = (): string | undefined => {
  // 1. Check standard process.env (Node.js/AI Studio)
  try {
    if (typeof process !== 'undefined' && process.env?.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore error if process is undefined
  }

  // 2. Check Vite environment variable (Browser/Vercel)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {
    // Ignore error if import.meta is undefined
  }

  return undefined;
};

const apiKey = getApiKey();

if (!apiKey) {
    throw new Error("API Key não encontrada. Por favor, configure a variável de ambiente 'VITE_API_KEY' (ou 'API_KEY') nas configurações do seu projeto no Vercel.");
}

const ai = new GoogleGenAI({ apiKey });

async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string; } }> {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        resolve(''); // Should not happen with readAsDataURL
      }
    };
    reader.readAsDataURL(file);
  });
  const data = await base64EncodedDataPromise;
  return {
    inlineData: {
      data,
      mimeType: file.type,
    },
  };
}


export async function generateQuote(description: string, city: string, images: File[], currency: Currency, clientName: string): Promise<Omit<QuoteData, 'id' | 'date' | 'clientName' | 'clientAddress' | 'clientContact'>> {
    const model = 'gemini-2.5-flash';

    const textPart = {
        text: `
          Cliente: ${clientName}
          Descrição do Trabalho: ${description}
          Cidade para Precificação: ${city}
          Moeda para o orçamento: ${currency}

          Por favor, analise as seguintes imagens e a descrição do trabalho para gerar um orçamento detalhado.
          Use a busca para encontrar os preços de mercado justos para os serviços e materiais na cidade e moeda informadas.
          Divida o trabalho em etapas lógicas, descreva cada uma, estime uma quantidade, uma unidade (se aplicável), e um preço de mercado justo POR UNIDADE para cada etapa.
          Além disso, estime um prazo de execução razoável e uma forma de pagamento padrão para este tipo de serviço.
        `,
    };

    const imageParts = await Promise.all(images.map(fileToGenerativePart));
    
    const systemInstruction = `Você é um assistente especialista para profissionais de construção e reparos domésticos. Sua tarefa é criar orçamentos detalhados e profissionais. As descrições devem ser claras, diretas e escritas como se você, o profissional, estivesse explicando cada etapa do serviço diretamente para o cliente final (use uma linguagem como "Nesta etapa, iremos preparar...", "Aqui, faremos a instalação...").
Use a ferramenta de busca para pesquisar os custos de mão de obra e materiais na cidade e moeda especificadas pelo usuário.
Sua resposta DEVE ser um único objeto JSON, e nada mais. Não inclua \`\`\`json ou qualquer outra formatação.
O JSON deve ter a seguinte estrutura:
{
  "title": "Um título conciso e profissional para o trabalho geral.",
  "summary": "Um breve resumo do trabalho a ser realizado.",
  "executionTime": "Uma estimativa do tempo total necessário (ex: '3 a 5 dias úteis').",
  "paymentTerms": "Uma sugestão de forma de pagamento comum para este serviço (ex: '50% de entrada e 50% na conclusão').",
  "steps": [
    {
      "title": "Um título curto para esta etapa específica (ex: 'Preparação da Superfície e Demolição').",
      "description": "Uma descrição detalhada das tarefas envolvidas nesta etapa, escrita como se estivesse explicando ao cliente.",
      "suggestedQuantity": "A quantidade estimada para esta etapa (ex: 5 para 5m², 1 para uma tarefa única), como um número. Use 1 como padrão se não for aplicável.",
      "suggestedPrice": {
          "unitPrice": "O preço de mercado justo estimado POR UNIDADE para esta etapa, como um número sem símbolos de moeda.",
          "unit": "A unidade de medida para o preço (ex: 'm²', 'unidade', 'hora')."
      }
    }
  ]
}`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [textPart, ...imageParts] },
        config: {
            systemInstruction: systemInstruction,
            tools: [{ googleSearch: {} }],
        },
    });

    try {
        let jsonText = response.text.trim();
        const jsonMatch = jsonText.match(/```(json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[2]) {
            jsonText = jsonMatch[2];
        }

        const parsedJson = JSON.parse(jsonText);
        
        if (parsedJson.title && Array.isArray(parsedJson.steps)) {
             const stepsWithUserPrice: QuoteStep[] = parsedJson.steps.map((step: any) => {
                const unitPrice = step.suggestedPrice?.unitPrice ?? step.suggestedPrice ?? 0;
                const unit = step.suggestedPrice?.unit;
                const quantity = step.suggestedQuantity ?? 1;
                return {
                    title: step.title,
                    description: step.description,
                    suggestedPrice: Number(unitPrice),
                    suggestedUnit: unit,
                    quantity: Number(quantity),
                    userPrice: Number(unitPrice), 
                    taxRate: 0, 
                };
            });
            return { 
                title: parsedJson.title,
                summary: parsedJson.summary,
                executionTime: parsedJson.executionTime || "A definir",
                paymentTerms: parsedJson.paymentTerms || "A combinar",
                steps: stepsWithUserPrice, 
                currency, 
                city 
            } as Omit<QuoteData, 'id' | 'date' | 'clientName' | 'clientAddress' | 'clientContact'>;
        } else {
            throw new Error("A resposta da IA não corresponde ao formato esperado.");
        }
    } catch (e) {
        console.error("Failed to parse JSON response:", response.text, e);
        throw new Error("A resposta da IA não estava em um formato JSON válido.");
    }
}

export async function generateTechnicalReport(quote: QuoteData, images: File[], companyName: string): Promise<TechnicalReportData> {
    const model = 'gemini-2.5-flash';

    const textPart = {
        text: `
          DADOS DO SERVIÇO:
          Cliente: ${quote.clientName}
          Endereço: ${quote.clientAddress}
          Data: ${new Date().toLocaleDateString('pt-PT')}
          Descrição do Problema/Serviço: ${quote.summary}
          
          DETALHES DO ORÇAMENTO JÁ GERADO:
          ${quote.steps.map(s => `- ${s.title}: ${s.description}`).join('\n')}

          Gere um LAUDO TÉCNICO PROFISSIONAL seguindo estritamente o protocolo da empresa "${companyName || 'HidroClean'}".
        `
    };

    const imageParts = await Promise.all(images.map(fileToGenerativePart));

    const systemInstruction = `Você é um perito técnico da empresa ${companyName || 'HidroClean'}. Sua tarefa é criar um "Laudo Técnico" extremamente profissional, detalhado e extenso, usado para seguradoras e perícias.

    PROTOCOLO OBRIGATÓRIO:
    1. ANÁLISE: Identifique o tipo de problema (fuga de água, infiltração, etc) com base nas fotos e texto.
    2. ESTRUTURA DO JSON DE RESPOSTA (ÚNICA SAÍDA PERMITIDA):
    {
      "title": "LAUDO TÉCNICO - RELATÓRIO DE INSPEÇÃO",
      "clientInfo": {
        "name": "Nome do Cliente",
        "address": "Endereço completo",
        "date": "Data atual",
        "technician": "Técnico Responsável (deixe em branco para preencher)",
        "buildingType": "Apartamento/Moradia/Comércio (infira)"
      },
      "objective": "Descrição curta e técnica do motivo da intervenção (3-5 linhas).",
      "methodology": ["Lista", "dos", "equipamentos", "usados", "ex: Geofone, Câmara Térmica, Teste de Vazão..."],
      "development": [
        { 
           "title": "Inspeção Inicial", 
           "content": "Texto LONGO e detalhado sobre o ambiente encontrado, humidade, manchas, etc." 
        },
        { 
           "title": "Inspeção Técnica / Análise Instrumental", 
           "content": "Texto LONGO e técnico sobre o uso do Geofone/Câmera, zonas investigadas, mapas sonoros, gradientes térmicos." 
        },
        {
           "title": "Testes Realizados",
           "content": "Texto detalhado sobre testes de vazão, pressão, estanqueidade e resultados observados."
        }
      ],
      "photoAnalysis": [
        {
           "photoIndex": 0, // Índice da imagem correspondente no array de entrada (0, 1, 2...)
           "legend": "Legenda técnica curta",
           "description": "Descrição técnica do que se vê na imagem (ex: anomalia térmica, mancha de humidade)."
        }
      ],
      "conclusion": {
        "diagnosis": "Local exato da avaria e causa provável.",
        "technicalProof": "Evidências que comprovam (ex: ruído característico, queda de pressão).",
        "consequences": "Impacto se não houver reparo imediato.",
        "activeLeak": true // ou false
      },
      "recommendations": {
        "repairType": "Descrição do reparo necessário.",
        "materials": ["Lista", "de", "materiais"],
        "estimatedTime": "Tempo estimado",
        "notes": "Observações sobre a intervenção."
      }
    }

    LINGUAGEM:
    - Use PT-PT ou PT-BR formal e técnico (ex: "zona de impacto hídrico", "gradiente térmico", "ensaio hidráulico").
    - NUNCA atribua culpa direta, use termos como "origem provável", "compatível com".
    - Os textos de "development" devem ser densos e explicativos.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [textPart, ...imageParts] },
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json'
        },
    });

    try {
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        return parsedJson as TechnicalReportData;
    } catch (e) {
        console.error("Failed to parse Report JSON:", response.text, e);
        throw new Error("Não foi possível gerar o relatório técnico. Tente novamente.");
    }
}
