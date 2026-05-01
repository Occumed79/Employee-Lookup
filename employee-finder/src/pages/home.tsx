import { useState, useEffect } from "react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSearchEmployees, useExportSearchResults } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Search, Download, ExternalLink, Mail, Zap, Loader2, Target, Link as LinkIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile, SearchResponse } from "@workspace/api-client-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SOURCES = ["duckduckgo", "jina", "github", "serper", "brave", "company_site"] as const;

const searchSchema = z.object({
  company: z.string().min(2, "Company name is required"),
  jobTitle: z.string().min(2, "Job title is required"),
  maxResults: z.coerce.number().min(1).max(100).default(20),
  sources: z.array(z.enum(SOURCES)).min(1, "Select at least one source"),
  apiKeys: z.object({
    serper: z.string().optional(),
    groq: z.string().optional(),
    exa: z.string().optional(),
    firecrawl: z.string().optional(),
    brave: z.string().optional(),
    jina: z.string().optional(),
    tavily: z.string().optional(),
  }).optional(),
});

type SearchFormValues = z.infer<typeof searchSchema>;

function ConfidenceBadge({ score }: { score: number }) {
  let color = "bg-red-500/10 text-red-500 border-red-500/20";
  if (score >= 80) color = "bg-green-500/10 text-green-500 border-green-500/20";
  else if (score >= 50) color = "bg-amber-500/10 text-amber-500 border-amber-500/20";

  return (
    <Badge variant="outline" className={cn("font-mono font-medium rounded-sm border", color)}>
      {score}% CONF
    </Badge>
  );
}

export function Home() {
  const [isKeysOpen, setIsKeysOpen] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const { keys: storedKeys } = useApiKeys();

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      company: "",
      jobTitle: "",
      maxResults: 20,
      sources: [...SOURCES],
      apiKeys: {},
    },
  });

  useEffect(() => {
    if (Object.keys(storedKeys).length > 0) {
      form.setValue("apiKeys", storedKeys as SearchFormValues["apiKeys"]);
    }
  }, [storedKeys]);

  const searchMutation = useSearchEmployees();

  function onSubmit(data: SearchFormValues) {
    setResults(null);
    searchMutation.mutate({ data }, {
      onSuccess: (res) => {
        setResults(res);
      }
    });
  }

  const handleExport = async () => {
    if (!results?.searchId) return;
    try {
      const response = await fetch(`/api/export/${results.searchId}`);
      if (!response.ok) throw new Error("Export failed");
      const csvData = await response.text();
      
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nelf-export-${results.searchId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Intelligence Gathering</h1>
        <p className="text-muted-foreground text-sm">Targeted reconnaissance for employee mapping.</p>
      </div>

      <Card className="border-primary/20 shadow-lg shadow-primary/5 bg-card/50 backdrop-blur">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                        <Target className="w-3 h-3" />
                        Target Company
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. OpenAI" className="font-mono bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Role / Title
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Software Engineer" className="font-mono bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxResults"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Max Results
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={100} className="font-mono bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Active Sources
                </Label>
                <div className="flex flex-wrap gap-3">
                  {SOURCES.map((src) => (
                    <FormField
                      key={src}
                      control={form.control}
                      name="sources"
                      render={({ field }) => {
                        const checked = field.value?.includes(src);
                        return (
                          <FormItem
                            key={src}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <div className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-all",
                                checked ? "bg-primary/10 border-primary/50 text-primary" : "bg-background/50 border-border/50 text-muted-foreground hover:bg-muted"
                              )} onClick={() => {
                                const val = field.value || [];
                                if (checked) {
                                  field.onChange(val.filter(v => v !== src));
                                } else {
                                  field.onChange([...val, src]);
                                }
                              }}>
                                <Checkbox
                                  checked={checked}
                                  className="hidden"
                                />
                                <span className="text-xs font-mono font-medium">{src}</span>
                              </div>
                            </FormControl>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                {form.formState.errors.sources && (
                  <p className="text-sm font-medium text-destructive">{form.formState.errors.sources.message}</p>
                )}
              </div>

              <Collapsible open={isKeysOpen} onOpenChange={setIsKeysOpen} className="border border-border/50 rounded-lg bg-background/30">
                <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Boost Search Power (Optional API Keys)
                  </div>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isKeysOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 pt-0 border-t border-border/50 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {["serper", "groq", "exa", "firecrawl", "brave", "jina", "tavily"].map((keyName) => (
                      <FormField
                        key={keyName}
                        control={form.control}
                        name={`apiKeys.${keyName}` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-mono text-muted-foreground capitalize">{keyName} API Key</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="sk-..." className="font-mono text-xs bg-background/50" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={searchMutation.isPending}
                  className="font-mono font-bold tracking-widest min-w-[200px]"
                >
                  {searchMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      EXECUTING...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      LAUNCH SEARCH
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Progress View */}
      {searchMutation.isPending && (
        <Card className="border-primary/30 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <CardContent className="p-8 flex flex-col items-center justify-center space-y-6">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin [animation-duration:3s]" />
              <div className="absolute inset-2 border-r-2 border-primary/50 rounded-full animate-spin [animation-direction:reverse]" />
              <Search className="w-8 h-8 text-primary animate-pulse" />
            </div>
            
            <div className="space-y-2 w-full max-w-md text-center">
              <h3 className="font-mono text-sm text-primary tracking-widest uppercase">Querying Sources</h3>
              <Progress value={undefined} className="h-1 bg-primary/20" />
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {form.getValues("sources").map((src, i) => (
                  <span 
                    key={src} 
                    className="text-xs font-mono text-muted-foreground animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  >
                    [{src}]
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results View */}
      {results && !searchMutation.isPending && (
        <div className="space-y-4 animate-in slide-in-from-bottom-8 fade-in duration-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Mission Report</h2>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                Found {results.profiles.length} profiles in {results.durationMs}ms
                {results.companyDomain && ` | Domain: ${results.companyDomain}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="font-mono text-xs">
                <Download className="w-4 h-4 mr-2" />
                EXPORT CSV
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {results.profiles.map((profile, i) => (
              <Card 
                key={i} 
                className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors animate-in slide-in-from-bottom-4 fade-in"
                style={{ animationFillMode: "both", animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex flex-col md:flex-row">
                  <div className="p-5 md:w-1/3 border-b md:border-b-0 md:border-r border-border/50 bg-muted/20">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{profile.fullName}</h3>
                      <ConfidenceBadge score={profile.confidence} />
                    </div>
                    <p className="text-primary font-medium text-sm mb-4">{profile.likelyTitle}</p>
                    
                    <div className="space-y-1">
                      <div className="flex items-center text-xs text-muted-foreground font-mono">
                        <Target className="w-3 h-3 mr-2" />
                        Source: {profile.source}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 md:w-2/3 flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* LinkedIn Links */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <LinkIcon className="w-3 h-3" />
                          LinkedIn Vectors
                        </h4>
                        <div className="flex flex-col gap-1.5">
                          {profile.linkedinVariations.map((url, j) => (
                            <a 
                              key={j} 
                              href={url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-xs font-mono text-blue-400 hover:text-blue-300 hover:underline flex items-center truncate bg-blue-500/10 px-2 py-1 rounded w-fit max-w-full"
                            >
                              <ExternalLink className="w-3 h-3 mr-1.5 shrink-0" />
                              <span className="truncate">{url.replace('https://linkedin.com/in/', '')}</span>
                            </a>
                          ))}
                          {profile.linkedinVariations.length === 0 && (
                            <span className="text-xs text-muted-foreground italic">No vectors generated</span>
                          )}
                        </div>
                      </div>

                      {/* Email Permutations */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          Email Permutations
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.emailVariations.map((email, j) => (
                            <span 
                              key={j} 
                              className="text-xs font-mono bg-muted px-2 py-1 rounded border border-border/50 text-foreground"
                            >
                              {email}
                            </span>
                          ))}
                          {profile.emailVariations.length === 0 && (
                            <span className="text-xs text-muted-foreground italic">Domain unknown</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Raw Snippet */}
                    {profile.rawSnippet && (
                      <div className="mt-auto pt-4">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs text-muted-foreground/60 font-mono flex items-center gap-1 cursor-help w-fit">
                              <Info className="w-3 h-3" />
                              Hover to view extracted raw text
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md p-3 font-mono text-xs bg-card border-border/50 shadow-xl">
                            {profile.rawSnippet}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            
            {results.profiles.length === 0 && (
              <div className="p-12 text-center border border-dashed border-border rounded-lg bg-muted/10">
                <Target className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-20" />
                <h3 className="text-lg font-medium text-foreground">No Profiles Found</h3>
                <p className="text-sm text-muted-foreground mt-1">Try expanding your search parameters or adding more sources.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
