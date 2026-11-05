import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to format currency for the prompt
function formatUSD(val: number): string {
  const hasDecimals = Math.abs(val % 1) > 0.001;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(val);
}

function formatPct(val: number): string {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
}

// Gemini API endpoint for Q2 to Q3 3-sentence summary
app.post('/api/analyze-q2-q3', async (req, res) => {
  try {
    const {
      regionMetrics,
      largestDollarRegion,
      largestPctRegion,
      totalQ2Revenue,
      totalQ3Revenue,
      totalRevenueDiff,
      totalRevenuePctChange,
      primaryFocusMetric = 'dollar', // 'dollar' or 'percent'
    } = req.body;

    if (!regionMetrics || !Array.isArray(regionMetrics) || regionMetrics.length === 0) {
      return res.status(400).json({ error: 'Missing or empty regionMetrics payload.' });
    }

    const targetRegionInfo = primaryFocusMetric === 'percent' ? largestPctRegion : largestDollarRegion;
    const targetRegionData = regionMetrics.find(
      (r: { region: string }) => r.region.toLowerCase() === targetRegionInfo.region.toLowerCase()
    ) || targetRegionInfo;

    // Structured summary of calculated facts
    const driverDetails = [
      `Target Region: ${targetRegionData.region}`,
      `Q2 Revenue: ${formatUSD(targetRegionData.q2Revenue)}`,
      `Q3 Revenue: ${formatUSD(targetRegionData.q3Revenue)}`,
      `Revenue Net Change: ${formatUSD(targetRegionData.revenueDiff)} (${formatPct(targetRegionData.revenuePctChange)})`,
      `Q2 Units Sold: ${targetRegionData.q2Units.toLocaleString()}`,
      `Q3 Units Sold: ${targetRegionData.q3Units.toLocaleString()}`,
      `Units Change: ${targetRegionData.unitsDiff > 0 ? '+' : ''}${targetRegionData.unitsDiff.toLocaleString()} (${formatPct(targetRegionData.unitsPctChange)})`,
      `Average Discount in Q2: ${targetRegionData.q2AvgDiscount.toFixed(1)}%`,
      `Average Discount in Q3: ${targetRegionData.q3AvgDiscount.toFixed(1)}% (Shift: ${targetRegionData.discountDiff > 0 ? '+' : ''}${targetRegionData.discountDiff.toFixed(1)} percentage points)`,
    ];

    if (targetRegionData.topChannelDrivers && targetRegionData.topChannelDrivers.length > 0) {
      const topCh = targetRegionData.topChannelDrivers[0];
      driverDetails.push(
        `Top Channel Impact: ${topCh.channel} channel changed by ${formatUSD(topCh.diff)} from ${formatUSD(topCh.q2Rev)} to ${formatUSD(topCh.q3Rev)}`
      );
    }

    if (targetRegionData.topProductDrivers && targetRegionData.topProductDrivers.length > 0) {
      const topProd = targetRegionData.topProductDrivers[0];
      driverDetails.push(
        `Top Product Impact: ${topProd.product} changed by ${formatUSD(topProd.diff)} from ${formatUSD(topProd.q2Rev)} to ${formatUSD(topProd.q3Rev)}`
      );
    }

    const allRegionsSummary = regionMetrics
      .map(
        (r: { region: string; q2Revenue: number; q3Revenue: number; revenueDiff: number; revenuePctChange: number }) =>
          `${r.region}: Q2 ${formatUSD(r.q2Revenue)} -> Q3 ${formatUSD(r.q3Revenue)} (${r.revenueDiff >= 0 ? '+' : ''}${formatUSD(r.revenueDiff)}, ${formatPct(r.revenuePctChange)})`
      )
      .join('; ');

    const calculatedFactsPrompt = `
You must analyze ONLY the pre-calculated numbers provided below for Q2 to Q3 sales performance.

CALCULATED METRICS:
- Overall Total Revenue: Q2 ${formatUSD(totalQ2Revenue)} to Q3 ${formatUSD(totalQ3Revenue)} (Net change: ${totalRevenueDiff >= 0 ? '+' : ''}${formatUSD(totalRevenueDiff)}, ${formatPct(totalRevenuePctChange)})
- Region with largest change: ${targetRegionData.region}
- Key Metrics for ${targetRegionData.region}:
  ${driverDetails.join('\n  ')}
- All Regions Comparison:
  ${allRegionsSummary}

STRICT INSTRUCTIONS:
1. Write EXACTLY three sentences (no more, no fewer than three sentences).
2. Sentence 1: Identify that ${targetRegionData.region} underwent the largest shift from Q2 to Q3, explicitly stating its Q2 revenue (${formatUSD(targetRegionData.q2Revenue)}), Q3 revenue (${formatUSD(targetRegionData.q3Revenue)}), and the net variance (${formatUSD(targetRegionData.revenueDiff)} or ${formatPct(targetRegionData.revenuePctChange)}).
3. Sentence 2: Explain WHY it changed using ONLY the exact calculated numbers provided above (such as the shift in units from ${targetRegionData.q2Units.toLocaleString()} to ${targetRegionData.q3Units.toLocaleString()} (${formatPct(targetRegionData.unitsPctChange)}), discount rate change of ${targetRegionData.discountDiff > 0 ? '+' : ''}${targetRegionData.discountDiff.toFixed(1)} percentage points, or specific channel/product movements).
4. Sentence 3: Contextualize this movement against company-wide performance or contrasting regions using the exact provided totals or other regional figures.
5. STRICT NUMERICAL ACCURACY: Do NOT invent, round differently, or mention any figures not listed in the calculated metrics. Output plain text only without markdown asterisks or bullet points.
`;

    const buildFallbackSummary = () => {
      const diffSign = targetRegionData.revenueDiff >= 0 ? '+' : '';
      const sentence1 = `${targetRegionData.region} experienced the largest revenue change from Q2 to Q3, moving from ${formatUSD(targetRegionData.q2Revenue)} to ${formatUSD(targetRegionData.q3Revenue)}, a variance of ${diffSign}${formatUSD(targetRegionData.revenueDiff)} (${formatPct(targetRegionData.revenuePctChange)}).`;
      
      const channelPart = targetRegionData.topChannelDrivers?.[0]
        ? ` with the ${targetRegionData.topChannelDrivers[0].channel} channel shifting by ${targetRegionData.topChannelDrivers[0].diff >= 0 ? '+' : ''}${formatUSD(targetRegionData.topChannelDrivers[0].diff)}`
        : '';
      const sentence2 = `This change was primarily driven by a volume change of ${targetRegionData.unitsDiff >= 0 ? '+' : ''}${targetRegionData.unitsDiff.toLocaleString()} units (${formatPct(targetRegionData.unitsPctChange)}) alongside an average discount movement from ${targetRegionData.q2AvgDiscount.toFixed(1)}% to ${targetRegionData.q3AvgDiscount.toFixed(1)}%${channelPart}.`;
      
      const sentence3 = `In comparison, total company revenue moved from ${formatUSD(totalQ2Revenue)} to ${formatUSD(totalQ3Revenue)} (${formatPct(totalRevenuePctChange)}), highlighting ${targetRegionData.region}'s outsized contribution to overall quarterly dynamics.`;

      return {
        summary: `${sentence1} ${sentence2} ${sentence3}`,
        sentences: [sentence1, sentence2, sentence3],
        targetRegion: targetRegionData.region,
        source: 'calculated-engine',
      };
    };

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      return res.json(buildFallbackSummary());
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let outputText = '';
    // Attempt generation with retry and timeout guard
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 6000)
        );

        const response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: calculatedFactsPrompt,
            config: {
              systemInstruction:
                'You are an executive finance controller and data auditor. Your job is to summarize quarterly sales changes in strictly three sentences, using exclusively the numbers calculated by the application with zero hallucination.',
            },
          }),
          timeoutPromise,
        ]);

        outputText = response.text?.trim() || '';
        if (outputText) break;
      } catch (err: any) {
        if (attempt === 0) {
          // brief pause before retry
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          console.warn('Gemini request unresolved, applying calculation engine summary:', err?.message || err);
          return res.json(buildFallbackSummary());
        }
      }
    }

    if (!outputText) {
      return res.json(buildFallbackSummary());
    }

    // Split sentences cleanly
    const rawSentences = outputText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return res.json({
      summary: outputText,
      sentences: rawSentences,
      targetRegion: targetRegionData.region,
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Server Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate AI executive summary',
    });
  }
});

// Setup Vite development server or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
