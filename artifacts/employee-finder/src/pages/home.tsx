import { useState, useEffect } from "react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSearchEmployees } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Download, ExternalLink, Mail, Loader2, Building2, UserCircle2, Globe, Linkedin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResponse } from "@workspace/api-client-react";

const SOURCES = ["duckduckgo", "jina", "github", "serper", "brave", "company_site", "exa", "tavily", "firecrawl"] as const;

const searchSchema = z.object({
  company: z.string().min(2, "Company name is required"),
  jobTitle: z.string().min(2, "Job title is required"),
  maxResults: z.coerce.number().min(1).max(100).default(20),
  sources: z.array(z.string()).min(1, "Select at least one source"),
  apiKeys: z.record(z.string()).optional(),
});

type SearchFormValues = z.infer<typeof searchSchema>;

export function Home() {
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
      form.setValue("apiKeys", storedKeys as Record<string, string>);
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
      a.download = `employees-${results.searchId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Employee Search</h1>
        <p className="text-muted-foreground text-lg">Find and map employees across organizations using AI-powered OSINT.</p>
      </div>

      <Card className="border-border bg-card shadow-sm overflow-hidden">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        Target Company
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. OpenAI" className="h-12 text-base rounded-lg border-border bg-secondary/30 focus:bg-background transition-all" {...field} />
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
                      <FormLabel className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                        <UserCircle2 className="w-4 h-4 text-primary" />
                        Target Role
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Product Manager" className="h-12 text-base rounded-lg border-border bg-secondary/30 focus:bg-background transition-all" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-semibold text-foreground">Search Sources</FormLabel>
                  <span className="text-xs text-muted-foreground">Select providers for data gathering</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {SOURCES.map((src) => (
                    <FormField
                      key={src}
                      control={form.control}
                      name="sources"
                      render={({ field }) => {
                        const checked = field.value?.includes(src);
                        return (
                          <div
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium cursor-pointer transition-all",
                              checked 
                                ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                : "bg-secondary/50 border-border text-muted-foreground hover:border-muted-foreground/30"
                            )}
                            onClick={() => {
                              const val = field.value || [];
                              field.onChange(checked ? val.filter(v => v !== src) : [...val, src]);
                            }}
                          >
                            <Checkbox checked={checked} className="hidden" />
                            <span className="capitalize">{src.replace("_", " ")}</span>
                          </div>
                        );
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-4">
                   <FormField
                    control={form.control}
                    name="maxResults"
                    render={({ field }) => (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">Limit:</span>
                        <Input type="number" className="w-20 h-9 rounded-md border-border bg-secondary/30" {...field} />
                      </div>
                    )}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={searchMutation.isPending}
                  className="h-12 px-8 rounded-lg font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all min-w-[180px]"
                >
                  {searchMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Run Search
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Search Results</h2>
              <p className="text-sm text-muted-foreground">
                Found {results.profileCount} matches across {results.sourcesUsed.length} sources.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} className="h-10 rounded-lg">
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.profiles.map((profile, i) => (
              <Card key={i} className="border-border bg-card hover:border-primary/30 transition-all group shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold leading-none group-hover:text-primary transition-colors">{profile.fullName}</h3>
                      <p className="text-sm text-muted-foreground font-medium">{profile.likelyTitle}</p>
                    </div>
                    <Badge variant="secondary" className="bg-secondary/80 text-foreground rounded-md px-2 py-1">
                      {profile.confidence}% Match
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                    {profile.linkedinVariations?.[0] && (
                      <a href={profile.linkedinVariations[0]} target="_blank" rel="noreferrer" 
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded bg-secondary/50">
                        <Linkedin className="w-3 h-3" />
                        Profile
                      </a>
                    )}
                    {profile.emailVariations?.[0] && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-2 py-1 rounded bg-secondary/50">
                        <Mail className="w-3 h-3" />
                        {profile.emailVariations[0]}
                      </div>
                    )}
                  </div>
                  
                  {profile.rawSnippet && (
                    <div className="text-xs text-muted-foreground line-clamp-2 italic bg-secondary/20 p-2 rounded leading-relaxed">
                      "{profile.rawSnippet}"
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
