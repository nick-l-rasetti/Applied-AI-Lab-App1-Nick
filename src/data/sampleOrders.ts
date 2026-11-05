import { SalesOrder } from '../types';

export const SAMPLE_CSV_CONTENT = `quarter,region,channel,product,units,discount_pct,revenue
Q1,West,Direct,Apex Cloud Enterprise,16,10.0,80000
Q1,West,Online,DataPulse AI Suite,35,5.0,35000
Q1,West,Retail Partner,Edge Security Gateway,22,12.0,39600
Q1,West,Wholesale,Nexus Core Platform,18,15.0,27000
Q1,East,Direct,Apex Cloud Enterprise,14,8.0,72000
Q1,East,Online,DataPulse AI Suite,32,6.0,30080
Q1,East,Retail Partner,Edge Security Gateway,28,14.0,48160
Q1,East,Wholesale,Nexus Core Platform,20,18.0,29520
Q1,North,Direct,Apex Cloud Enterprise,12,12.0,58000
Q1,North,Online,DataPulse AI Suite,40,7.0,37200
Q1,North,Retail Partner,Edge Security Gateway,22,10.0,39600
Q1,North,Wholesale,Nexus Core Platform,18,15.0,27540
Q1,South,Direct,Apex Cloud Enterprise,6,15.0,28500
Q1,South,Online,DataPulse AI Suite,18,8.0,16560
Q1,South,Retail Partner,Edge Security Gateway,14,12.0,24640
Q1,South,Wholesale,Nexus Core Platform,12,20.0,17280

Q2,West,Direct,Apex Cloud Enterprise,20,10.0,100000
Q2,West,Online,DataPulse AI Suite,40,5.0,40000
Q2,West,Retail Partner,Edge Security Gateway,25,12.0,45000
Q2,West,Wholesale,Nexus Core Platform,15,15.0,22500
Q2,East,Direct,Apex Cloud Enterprise,18,10.0,92000
Q2,East,Online,DataPulse AI Suite,35,8.0,32200
Q2,East,Retail Partner,Edge Security Gateway,34,15.0,57800
Q2,East,Wholesale,Nexus Core Platform,22,16.0,33260
Q2,North,Direct,Apex Cloud Enterprise,15,10.0,75000
Q2,North,Online,DataPulse AI Suite,46,6.0,43240
Q2,North,Retail Partner,Edge Security Gateway,25,12.0,44000
Q2,North,Wholesale,Nexus Core Platform,20,14.0,30960
Q2,South,Direct,Apex Cloud Enterprise,7,12.0,33500
Q2,South,Online,DataPulse AI Suite,20,10.0,18000
Q2,South,Retail Partner,Edge Security Gateway,15,14.0,25800
Q2,South,Wholesale,Nexus Core Platform,14,18.0,20660

Q3,West,Direct,Apex Cloud Enterprise,35,8.0,175000
Q3,West,Online,DataPulse AI Suite,110,4.0,165000
Q3,West,Retail Partner,Edge Security Gateway,28,10.0,50400
Q3,West,Wholesale,Nexus Core Platform,10,12.0,15000
Q3,East,Direct,Apex Cloud Enterprise,15,12.0,74000
Q3,East,Online,DataPulse AI Suite,30,8.0,27600
Q3,East,Retail Partner,Edge Security Gateway,30,16.0,50400
Q3,East,Wholesale,Nexus Core Platform,20,18.0,29060
Q3,North,Direct,Apex Cloud Enterprise,20,8.0,102000
Q3,North,Online,DataPulse AI Suite,54,5.0,51300
Q3,North,Retail Partner,Edge Security Gateway,30,10.0,54000
Q3,North,Wholesale,Nexus Core Platform,24,14.0,38000
Q3,South,Direct,Apex Cloud Enterprise,9,10.0,44000
Q3,South,Online,DataPulse AI Suite,24,8.0,22080
Q3,South,Retail Partner,Edge Security Gateway,16,12.0,28160
Q3,South,Wholesale,Nexus Core Platform,12,15.0,18520

Q4,West,Direct,Apex Cloud Enterprise,38,8.0,190000
Q4,West,Online,DataPulse AI Suite,125,4.0,187500
Q4,West,Retail Partner,Edge Security Gateway,30,10.0,54000
Q4,West,Wholesale,Nexus Core Platform,12,12.0,18000
Q4,East,Direct,Apex Cloud Enterprise,19,10.0,96000
Q4,East,Online,DataPulse AI Suite,38,6.0,35720
Q4,East,Retail Partner,Edge Security Gateway,32,14.0,54980
Q4,East,Wholesale,Nexus Core Platform,24,16.0,36280
Q4,North,Direct,Apex Cloud Enterprise,22,8.0,113000
Q4,North,Online,DataPulse AI Suite,60,5.0,57000
Q4,North,Retail Partner,Edge Security Gateway,32,10.0,57600
Q4,North,Wholesale,Nexus Core Platform,26,12.0,41180
Q4,South,Direct,Apex Cloud Enterprise,10,10.0,49500
Q4,South,Online,DataPulse AI Suite,26,7.0,24180
Q4,South,Retail Partner,Edge Security Gateway,18,12.0,31680
Q4,South,Wholesale,Nexus Core Platform,15,15.0,22950`;

export function getSampleOrders(): SalesOrder[] {
  const lines = SAMPLE_CSV_CONTENT.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());
  const orders: SalesOrder[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length >= 7) {
      orders.push({
        id: `sample-${i}`,
        quarter: parts[0].trim(),
        region: parts[1].trim(),
        channel: parts[2].trim(),
        product: parts[3].trim(),
        units: parseFloat(parts[4]) || 0,
        discount_pct: parseFloat(parts[5]) || 0,
        revenue: parseFloat(parts[6]) || 0,
      });
    }
  }

  return orders;
}
