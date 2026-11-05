import { SalesOrder } from '../types.ts';

// Pre-generated realistic sales orders CSV string
export const SAMPLE_CSV_CONTENT = `quarter,region,channel,product,units,discount_pct,revenue
Q1,North America,Enterprise Direct,Cloud Enterprise Platform,140,0.10,770000
Q1,North America,Strategic Resellers,Cybersecurity Suite,220,0.15,660000
Q1,North America,Online B2B,Data Mesh Engine,310,0.05,465000
Q1,North America,Channel Partners,Edge AI Workstation,85,0.08,425000
Q1,Europe (EMEA),Enterprise Direct,Cloud Enterprise Platform,95,0.12,501600
Q1,Europe (EMEA),Strategic Resellers,Cybersecurity Suite,140,0.15,416500
Q1,Europe (EMEA),Online B2B,Data Mesh Engine,205,0.08,282900
Q1,Europe (EMEA),Channel Partners,Edge AI Workstation,60,0.10,270000
Q1,Asia-Pacific (APAC),Enterprise Direct,Cloud Enterprise Platform,65,0.15,331500
Q1,Asia-Pacific (APAC),Strategic Resellers,Cybersecurity Suite,90,0.18,258300
Q1,Asia-Pacific (APAC),Online B2B,Data Mesh Engine,160,0.10,216000
Q1,Asia-Pacific (APAC),Channel Partners,Edge AI Workstation,40,0.12,176000
Q1,Latin America (LATAM),Enterprise Direct,Cloud Enterprise Platform,30,0.15,153000
Q1,Latin America (LATAM),Strategic Resellers,Cybersecurity Suite,45,0.20,126000
Q1,Latin America (LATAM),Online B2B,Data Mesh Engine,75,0.10,101250
Q1,Latin America (LATAM),Channel Partners,Edge AI Workstation,18,0.15,76500
Q2,North America,Enterprise Direct,Cloud Enterprise Platform,165,0.10,907500
Q2,North America,Strategic Resellers,Cybersecurity Suite,245,0.14,735000
Q2,North America,Online B2B,Data Mesh Engine,340,0.05,510000
Q2,North America,Channel Partners,Edge AI Workstation,92,0.08,460000
Q2,Europe (EMEA),Enterprise Direct,Cloud Enterprise Platform,110,0.10,594000
Q2,Europe (EMEA),Strategic Resellers,Cybersecurity Suite,155,0.15,461125
Q2,Europe (EMEA),Online B2B,Data Mesh Engine,210,0.08,289800
Q2,Europe (EMEA),Channel Partners,Edge AI Workstation,65,0.10,292500
Q2,Asia-Pacific (APAC),Enterprise Direct,Cloud Enterprise Platform,80,0.15,408000
Q2,Asia-Pacific (APAC),Strategic Resellers,Cybersecurity Suite,110,0.16,322960
Q2,Asia-Pacific (APAC),Online B2B,Data Mesh Engine,180,0.10,243000
Q2,Asia-Pacific (APAC),Channel Partners,Edge AI Workstation,50,0.12,220000
Q2,Latin America (LATAM),Enterprise Direct,Cloud Enterprise Platform,38,0.15,193800
Q2,Latin America (LATAM),Strategic Resellers,Cybersecurity Suite,50,0.18,143500
Q2,Latin America (LATAM),Online B2B,Data Mesh Engine,85,0.10,114750
Q2,Latin America (LATAM),Channel Partners,Edge AI Workstation,22,0.15,93500
Q3,North America,Enterprise Direct,Cloud Enterprise Platform,175,0.08,966000
Q3,North America,Strategic Resellers,Cybersecurity Suite,260,0.12,800800
Q3,North America,Online B2B,Data Mesh Engine,360,0.05,540000
Q3,North America,Channel Partners,Edge AI Workstation,105,0.08,525000
Q3,Europe (EMEA),Enterprise Direct,Cloud Enterprise Platform,105,0.12,554400
Q3,Europe (EMEA),Strategic Resellers,Cybersecurity Suite,145,0.15,431375
Q3,Europe (EMEA),Online B2B,Data Mesh Engine,195,0.08,269100
Q3,Europe (EMEA),Channel Partners,Edge AI Workstation,62,0.10,279000
Q3,Asia-Pacific (APAC),Enterprise Direct,Cloud Enterprise Platform,280,0.08,1545600
Q3,Asia-Pacific (APAC),Strategic Resellers,Cybersecurity Suite,310,0.10,976500
Q3,Asia-Pacific (APAC),Online B2B,Data Mesh Engine,420,0.05,598500
Q3,Asia-Pacific (APAC),Channel Partners,Edge AI Workstation,160,0.08,736000
Q3,Latin America (LATAM),Enterprise Direct,Cloud Enterprise Platform,45,0.15,229500
Q3,Latin America (LATAM),Strategic Resellers,Cybersecurity Suite,58,0.18,166460
Q3,Latin America (LATAM),Online B2B,Data Mesh Engine,95,0.10,128250
Q3,Latin America (LATAM),Channel Partners,Edge AI Workstation,28,0.14,120400
Q4,North America,Enterprise Direct,Cloud Enterprise Platform,190,0.08,1048800
Q4,North America,Strategic Resellers,Cybersecurity Suite,280,0.12,862400
Q4,North America,Online B2B,Data Mesh Engine,390,0.05,585000
Q4,North America,Channel Partners,Edge AI Workstation,115,0.08,575000
Q4,Europe (EMEA),Enterprise Direct,Cloud Enterprise Platform,120,0.10,648000
Q4,Europe (EMEA),Strategic Resellers,Cybersecurity Suite,160,0.15,476000
Q4,Europe (EMEA),Online B2B,Data Mesh Engine,225,0.08,310500
Q4,Europe (EMEA),Channel Partners,Edge AI Workstation,70,0.10,315000
Q4,Asia-Pacific (APAC),Enterprise Direct,Cloud Enterprise Platform,310,0.07,1730420
Q4,Asia-Pacific (APAC),Strategic Resellers,Cybersecurity Suite,340,0.09,1084260
Q4,Asia-Pacific (APAC),Online B2B,Data Mesh Engine,460,0.05,655500
Q4,Asia-Pacific (APAC),Channel Partners,Edge AI Workstation,185,0.07,859325
Q4,Latin America (LATAM),Enterprise Direct,Cloud Enterprise Platform,50,0.15,255000
Q4,Latin America (LATAM),Strategic Resellers,Cybersecurity Suite,65,0.18,186550
Q4,Latin America (LATAM),Online B2B,Data Mesh Engine,105,0.10,141750
Q4,Latin America (LATAM),Channel Partners,Edge AI Workstation,32,0.14,137600`;

export function getSampleOrders(): SalesOrder[] {
  const lines = SAMPLE_CSV_CONTENT.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const orders: SalesOrder[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim());
    if (parts.length < headers.length) continue;

    orders.push({
      quarter: parts[0],
      region: parts[1],
      channel: parts[2],
      product: parts[3],
      units: parseFloat(parts[4]) || 0,
      discount_pct: parseFloat(parts[5]) || 0,
      revenue: parseFloat(parts[6]) || 0,
      rawIndex: i,
    });
  }

  return orders;
}
