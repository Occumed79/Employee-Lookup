import { useGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell } from "recharts";
import { Activity, Users, Search, Target, Database } from "lucide-react";

const COLORS = [
  "hsl(217 91% 60%)", // Primary
  "hsl(190 100% 50%)", // Chart 2
  "hsl(280 80% 60%)", // Chart 3
  "hsl(160 80% 40%)", // Chart 4
  "hsl(340 80% 60%)", // Chart 5
];

export function Stats() {
  const { data: stats, isLoading } = useGetStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
          <Activity className="w-6 h-6 text-primary animate-pulse" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const sourceData = Object.entries(stats.sourceBreakdown).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">System Telemetry</h1>
        <p className="text-muted-foreground text-sm">Global metrics and operational analytics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 bg-card/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-lg text-primary">
              <Search className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Total Missions</p>
              <h2 className="text-4xl font-black font-mono mt-1">{stats.totalSearches}</h2>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-card/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-lg text-primary">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Profiles Extracted</p>
              <h2 className="text-4xl font-black font-mono mt-1">{stats.totalProfilesFound}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-lg text-primary">
              <Target className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Avg Confidence</p>
              <h2 className="text-4xl font-black font-mono mt-1">{Math.round(stats.avgConfidence)}%</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-card/30 flex flex-col">
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-sm uppercase tracking-wider flex items-center">
              <Activity className="w-4 h-4 mr-2 text-primary" />
              Top Target Companies
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topCompanies} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="company" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'currentColor', fontSize: 12, fontFamily: 'monospace' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'monospace' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={40}>
                    {stats.topCompanies.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 flex flex-col">
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-sm uppercase tracking-wider flex items-center">
              <Database className="w-4 h-4 mr-2 text-primary" />
              Source Utilization
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-center">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {sourceData.map((_, index) => (
                      <PieCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'monospace' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {sourceData.map((entry, index) => (
                <div key={entry.name} className="flex items-center text-xs font-mono">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                  />
                  <span className="text-muted-foreground">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
