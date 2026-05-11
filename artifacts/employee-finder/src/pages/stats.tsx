import { useGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell } from "recharts";
import { Activity, Users, Search, Target, Database, TrendingUp } from "lucide-react";

const COLORS = [
  "hsl(221 83% 53%)", // Primary Blue
  "hsl(217 91% 60%)",
  "hsl(213 94% 68%)",
  "hsl(210 100% 75%)",
  "hsl(207 100% 82%)",
];

export function Stats() {
  const { data: stats, isLoading } = useGetStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const sourceData = Object.entries(stats.sourceBreakdown).map(([name, value]) => ({
    name: name.replace("_", " "),
    value,
  }));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-lg">Performance metrics and data source utilization.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Searches</span>
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-bold">{stats.totalSearches}</h2>
              <span className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Active</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Profiles Found</span>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-bold">{stats.totalProfilesFound}</h2>
              <span className="text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">Extracted</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-6 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Avg Confidence</span>
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-bold">{Math.round(stats.avgConfidence)}%</h2>
              <span className="text-xs font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Accuracy</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base font-bold flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" />
              Top Target Organizations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topCompanies} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="company" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
                    {stats.topCompanies.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base font-bold flex items-center">
              <Database className="w-5 h-5 mr-2 text-primary" />
              Source Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[260px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {sourceData.map((_, index) => (
                      <PieCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-6">
              {sourceData.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between border-b border-border/50 pb-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <span className="text-xs font-medium text-muted-foreground capitalize">{entry.name}</span>
                  </div>
                  <span className="text-xs font-bold">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
