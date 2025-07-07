import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, AlertTriangle, Activity, Shield } from "lucide-react";

interface Transaction {
  id: string;
  riskLevel?: 'low' | 'medium' | 'high';
  riskScore?: number;
  channel?: string;
  amount: string;
}

interface FraudAnalyticsProps {
  transactions: Transaction[];
}

export const FraudAnalytics = ({ transactions }: FraudAnalyticsProps) => {
  // Risk level distribution
  const riskDistribution = [
    { name: 'Low Risk', value: transactions.filter(t => t.riskLevel === 'low').length, color: '#10B981' },
    { name: 'Medium Risk', value: transactions.filter(t => t.riskLevel === 'medium').length, color: '#F59E0B' },
    { name: 'High Risk', value: transactions.filter(t => t.riskLevel === 'high').length, color: '#EF4444' }
  ];

  // Channel-wise risk analysis
  const channelRisk = transactions.reduce((acc: any[], tx) => {
    const existing = acc.find(item => item.channel === tx.channel);
    if (existing) {
      existing.total += 1;
      if (tx.riskLevel === 'high') existing.highRisk += 1;
    } else {
      acc.push({
        channel: tx.channel || 'Unknown',
        total: 1,
        highRisk: tx.riskLevel === 'high' ? 1 : 0
      });
    }
    return acc;
  }, []);

  // Risk score distribution
  const riskScoreRanges = [
    { range: '0-0.2', count: 0 },
    { range: '0.2-0.4', count: 0 },
    { range: '0.4-0.6', count: 0 },
    { range: '0.6-0.8', count: 0 },
    { range: '0.8-1.0', count: 0 }
  ];

  transactions.forEach(tx => {
    const score = tx.riskScore || 0;
    if (score < 0.2) riskScoreRanges[0].count++;
    else if (score < 0.4) riskScoreRanges[1].count++;
    else if (score < 0.6) riskScoreRanges[2].count++;
    else if (score < 0.8) riskScoreRanges[3].count++;
    else riskScoreRanges[4].count++;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Risk Level Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span>Risk Level Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-4 mt-4">
            {riskDistribution.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Channel Risk Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-orange-500" />
            <span>Channel Risk Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={channelRisk}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#3B82F6" name="Total Transactions" />
              <Bar dataKey="highRisk" fill="#EF4444" name="High Risk" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Risk Score Distribution */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span>Risk Score Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={riskScoreRanges}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
