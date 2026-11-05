import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

interface Q2Q3RegionMetrics {
  region: string;
  q2Revenue: number;
  q3Revenue: number;
  diffRevenue: number;
  pctChange: number;
  q2Units: number;
  q3Units: number;
  diffUnits: number;
  q2AvgDiscountPct: number;
  q3AvgDiscountPct: number;
  topProductByDiff?: {
    product: string;
    q2Revenue: number;
    q3Revenue: number;
    diffRevenue: number;
  };
  topChannelByDiff?: {
    channel: string;
    q2Revenue: number;
    q3Revenue: number;
    diffRevenue: number;
  };
}

interface AnalysisPayload {
  mostChangedRegion: Q2Q3RegionMetrics;
  rankingByAbsoluteChange: Array<{
    region: string;
    absDiff: number;
    diffRevenue: number;
    pctChange: number;
  }>;
  overallQ2Revenue: number;
  overallQ3Revenue: number;
  overallDiff: number;
}

// Deterministic 3-sentence fallback generator using the exact calculated numbers
function generateDeterministicThreeSentenceSummary(payload: AnalysisPayload): string {
  const { mostChangedRegion } = payload;
  const isGain = mostChangedRegion.diffRevenue >= 0;
  const directionWord = isGain ? 'surged' : 'declined';
  const gainLossWord = isGain ? 'increase' : 'drop';

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);

  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

  // Sentence 1: Region identification with Q2 and Q3 revenue and change
  const s1 = `Between Q2 and Q3, the ${mostChangedRegion.region} region experienced the greatest revenue shift, where total revenue ${directionWord} by ${fmtCurrency(Math.abs(mostChangedRegion.diffRevenue))} (${fmtPct(mostChangedRegion.pctChange)}), moving from ${fmtCurrency(mostChangedRegion.q2Revenue)} in Q2 to ${fmtCurrency(mostChangedRegion.q3Revenue)} in Q3.`;

  // Sentence 2: Product driver
  let s2 = '';
  if (mostChangedRegion.topProductByDiff) {
    const prod = mostChangedRegion.topProductByDiff;
    const prodGain = prod.diffRevenue >= 0;
    s2 = `This shift was primarily propelled by the "${prod.product}" product line, which accounted for a ${fmtCurrency(Math.abs(prod.diffRevenue))} ${prodGain ? 'gain' : 'reduction'} as product revenue shifted from ${fmtCurrency(prod.q2Revenue)} to ${fmtCurrency(prod.q3Revenue)}.`;
  } else {
    s2 = `This variance was driven by a net shift of ${Math.abs(mostChangedRegion.diffUnits).toLocaleString()} order units, changing from ${mostChangedRegion.q2Units.toLocaleString()} units in Q2 to ${mostChangedRegion.q3Units.toLocaleString()} units in Q3.`;
  }

  // Sentence 3: Channel or discount driver
  let s3 = '';
  if (mostChangedRegion.topChannelByDiff) {
    const chan = mostChangedRegion.topChannelByDiff;
    s3 = `Additionally, the ${chan.channel} sales channel represented the largest conduit for this change with a ${fmtCurrency(Math.abs(chan.diffRevenue))} ${chan.diffRevenue >= 0 ? 'expansion' : 'contraction'} (from ${fmtCurrency(chan.q2Revenue)} to ${fmtCurrency(chan.q3Revenue)}), accompanied by an average discount movement from ${mostChangedRegion.q2AvgDiscountPct.toFixed(1)}% to ${mostChangedRegion.q3AvgDiscountPct.toFixed(1)}%.`;
  } else {
    s3 = `Additionally, regional sales volume shifted from ${mostChangedRegion.q2Units.toLocaleString()} units to ${mostChangedRegion.q3Units.toLocaleString()} units, while average promotional discount rates moved from ${mostChangedRegion.q2AvgDiscountPct.toFixed(1)}% to ${mostChangedRegion.q3AvgDiscountPct.toFixed(1)}%.`;
  }

  return `${s1} ${s2} ${s3}`;
}

// API endpoint for AI Three-Sentence Summary
app.post('/api/analyze-summary', async (req: Request, res: Response) => {
  try {
    const payload = req.body as AnalysisPayload;

    if (!payload || !payload.mostChangedRegion) {
      return res.status(400).json({ error: 'Missing calculation payload' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return deterministic fallback if key is unconfigured in environment
      const fallbackSummary = generateDeterministicThreeSentenceSummary(payload);
      return res.json({
        summary: fallbackSummary,
        source: 'engine_computed',
        note: 'Calculated directly from order metrics (no Gemini key attached).',
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `You are an executive sales intelligence analyst.

TASK:
Write an exact THREE-SENTENCE summary explaining which region changed the most from Q2 to Q3 in revenue, and why, using ONLY the verified calculated numbers provided below.

VERIFIED CALCULATED NUMBERS:
- Most Changed Region: ${payload.mostChangedRegion.region}
- Q2 Revenue: $${payload.mostChangedRegion.q2Revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Q3 Revenue: $${payload.mostChangedRegion.q3Revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Dollar Revenue Delta (Q3 - Q2): $${payload.mostChangedRegion.diffRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Percentage Change: ${payload.mostChangedRegion.pctChange.toFixed(2)}%
- Q2 Order Units: ${payload.mostChangedRegion.q2Units.toLocaleString()}
- Q3 Order Units: ${payload.mostChangedRegion.q3Units.toLocaleString()}
- Unit Delta: ${(payload.mostChangedRegion.diffUnits >= 0 ? '+' : '')}${payload.mostChangedRegion.diffUnits.toLocaleString()}
- Q2 Average Discount Rate: ${payload.mostChangedRegion.q2AvgDiscountPct.toFixed(2)}%
- Q3 Average Discount Rate: ${payload.mostChangedRegion.q3AvgDiscountPct.toFixed(2)}%
${
  payload.mostChangedRegion.topProductByDiff
    ? `- Top Product Driver: "${payload.mostChangedRegion.topProductByDiff.product}" (Q2 Revenue: $${payload.mostChangedRegion.topProductByDiff.q2Revenue.toLocaleString()}, Q3 Revenue: $${payload.mostChangedRegion.topProductByDiff.q3Revenue.toLocaleString()}, Delta: $${payload.mostChangedRegion.topProductByDiff.diffRevenue.toLocaleString()})`
    : ''
}
${
  payload.mostChangedRegion.topChannelByDiff
    ? `- Top Channel Driver: "${payload.mostChangedRegion.topChannelByDiff.channel}" (Q2 Revenue: $${payload.mostChangedRegion.topChannelByDiff.q2Revenue.toLocaleString()}, Q3 Revenue: $${payload.mostChangedRegion.topChannelByDiff.q3Revenue.toLocaleString()}, Delta: $${payload.mostChangedRegion.topChannelByDiff.diffRevenue.toLocaleString()})`
    : ''
}
- Other Regions Q2-to-Q3 Changes: ${payload.rankingByAbsoluteChange.map((r) => `${r.region}: $${r.diffRevenue.toLocaleString()} (${r.pctChange.toFixed(1)}%)`).join(', ')}

STRICT RULES:
1. The response MUST be EXACTLY THREE SENTENCES. Do not write two sentences, do not write four sentences.
2. Sentence 1: Identify the region that changed the most from Q2 to Q3, citing its Q2 revenue, Q3 revenue, and the net dollar change or percent change.
3. Sentence 2: Explain the primary product driver behind this change, quoting the specific product name and its exact numbers.
4. Sentence 3: Explain the channel or unit/discount factor that explains why the change occurred, citing only the provided numbers.
5. Use ONLY numbers from the provided list. Do not hallucinate external causes, macroeconomic events, or unlisted data.
6. Return purely the three sentences. No preamble, no quotes around sentences, no markdown headings, no bullet points.`;

    let aiText = '';
    let lastError: any = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'You are a strict financial analytics AI. You produce concise, exactly 3-sentence executive summaries using only explicitly provided figures.',
          },
        });
        aiText = response.text ? response.text.trim() : '';
        if (aiText) break;
      } catch (e: any) {
        lastError = e;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }

    if (!aiText) {
      const fallbackSummary = generateDeterministicThreeSentenceSummary(payload);
      return res.json({
        summary: fallbackSummary,
        source: 'engine_fallback',
        error: lastError?.message || undefined,
      });
    }

    return res.json({
      summary: aiText,
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Gemini summary error:', error);
    // Graceful fallback so user always gets the accurate 3-sentence summary
    const fallbackSummary = generateDeterministicThreeSentenceSummary(req.body as AnalysisPayload);
    return res.json({
      summary: fallbackSummary,
      source: 'engine_computed_fallback',
      error: error.message || 'Gemini service unreachable, generated via certified calculations.',
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
