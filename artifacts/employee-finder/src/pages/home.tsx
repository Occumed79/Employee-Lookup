import { useEffect, useMemo, useState } from "react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SearchRequestSourcesItem, useSearchEmployees } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Linkedin,
  Loader2,
  Mail,
  Search,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type { SearchResponse } from "@workspace/api-client-react";

const SEARCH_SOURCES: SearchRequestSourcesItem[] = [
  SearchRequestSourcesItem.duckduckgo,
  SearchRequestSourcesItem.jina,
  SearchRequestSourcesItem.github,
  SearchRequestSourcesItem.serper,
  SearchRequestSourcesItem.brave,
  SearchRequestSourcesItem.company_site,
];

const searchSchema = z.object({
  company: z.string().min(2, "Company name is required"),
  positions: z.string().min(2, "Add at least one position"),
  maxResults: z.coerce.number().min(1).max(100).default(25),
  sources: z.array(z.nativeEnum(SearchRequestSourcesItem)).default([...SEARCH_SOURCES]),
  apiKeys: z.record(z.string()).optional(),
});

type SearchFormValues = z.infer<typeof searchSchema>;

function parsePositions(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFirst(values?: string[] | null) {
  return values?.find(Boolean) || "";
}

export function Home() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const { keys: storedKeys } = useApiKeys();

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      company: "",
      positions: "",
      maxResults: 25,
      sources: [...SEARCH_SOURCES],
      apiKeys: {},
    },
  });

  const positions = form.watch("positions");
  const parsedPositions = useMemo(() => parsePositions(positions || ""), [positions]);

  useEffect(() => {
    if (Object.keys(storedKeys).length > 0) {
      form.setValue("apiKeys", storedKeys as Record<string, string>);
    }
  }, [storedKeys, form]);

  const searchMutation = useSearchEmployees();

  function onSubmit(data: SearchFormValues) {
    const targetRoles = parsePositions(data.positions);
    setResults(null);
    searchMutation.mutate(
      {
        data: {
          company: data.company.trim(),
          jobTitle: targetRoles.join(", "),
          maxResults: data.maxResults,
          sources: data.sources,
          apiKeys: data.apiKeys,
        },
      },
      {
        onSuccess: (res) => setResults(res),
      }
    );
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

  const copyEmail = async (email: string) => {
    await navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    window.setTimeout(() => setCopiedEmail(null), 1400);
  };

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="rounded-[2rem] border border-border bg-background/80 p-7 shadow-xl shadow-slate-200/50 backdrop-blur sm:p-10">
          <div className="max-w-3xl">
            <Badge className="mb-5 rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">Master search</Badge>
            <h1 className="text-4xl font-black tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl">
              Find the right people at a company in one pass.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Enter the company and the positions you care about. The tool gathers likely employee names, then surfaces emails and LinkedIn profiles in a clean contact list.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Set company"],
              ["2", "Add roles"],
              ["3", "Review contacts"],
            ].map(([step, label]) => (
              <div key={step} className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/35 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{step}</div>
                <div className="text-sm font-semibold">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden rounded-[2rem] border-border bg-card shadow-xl shadow-slate-200/60">
          <CardContent className="p-0">
            <div className="border-b border-border bg-slate-950 px-7 py-6 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <Sparkles className="h-5 w-5 text-blue-200" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Lookup setup</h2>
                  <p className="text-sm text-slate-300">No tabs. No dashboards. Just the search inputs that matter.</p>
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-7">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm font-bold">
                        <Building2 className="h-4 w-4 text-primary" />
                        Company name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Acme Health, Stripe, OpenAI"
                          className="h-12 rounded-2xl border-border bg-secondary/40 text-base focus:bg-background"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="positions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm font-bold">
                        <Target className="h-4 w-4 text-primary" />
                        Target positions
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={"Add one role per line or comma-separated\nOwner\nOperations Manager\nHR Director"}
                          className="min-h-32 rounded-2xl border-border bg-secondary/40 text-base leading-7 focus:bg-background"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {parsedPositions.length > 0 ? (
                          parsedPositions.map((role) => (
                            <span key={role} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">The search will use every role you list here.</span>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <FormField
                    control={form.control}
                    name="maxResults"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold">Result limit</FormLabel>
                        <FormControl>
                          <Input type="number" className="h-12 rounded-2xl border-border bg-secondary/40" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={searchMutation.isPending}
                    className="h-12 rounded-2xl px-7 text-base font-bold shadow-lg shadow-primary/25"
                  >
                    {searchMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Searching
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-5 w-5" />
                        Run master search
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </section>

      {searchMutation.isPending && (
        <Card className="rounded-[2rem] border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div>
              <h3 className="font-bold">Searching and enriching contacts</h3>
              <p className="text-sm text-muted-foreground">Gathering candidate names first, then checking for email and LinkedIn signals.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <section className="animate-in fade-in slide-in-from-bottom-4 space-y-5 duration-500">
          <div className="flex flex-col gap-4 rounded-[2rem] border border-border bg-background/85 p-6 shadow-lg shadow-slate-200/50 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Search complete
              </div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">{results.profiles.length} contacts prepared</h2>
              <p className="text-sm text-muted-foreground">
                {results.totalRawResults} raw results reviewed across {results.sourcesUsed.length} sources{results.companyDomain ? ` · ${results.companyDomain}` : ""}.
              </p>
            </div>
            <Button variant="outline" onClick={handleExport} disabled={!results.searchId} className="h-11 rounded-2xl font-semibold">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl shadow-slate-200/60">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border bg-secondary/70 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-bold">Name</th>
                    <th className="px-6 py-4 font-bold">Likely position</th>
                    <th className="px-6 py-4 font-bold">Email</th>
                    <th className="px-6 py-4 font-bold">LinkedIn</th>
                    <th className="px-6 py-4 font-bold">Confidence</th>
                    <th className="px-6 py-4 font-bold">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.profiles.map((profile, index) => {
                    const email = getFirst(profile.emailVariations);
                    const linkedin = getFirst(profile.linkedinVariations);
                    return (
                      <tr key={`${profile.fullName}-${index}`} className="transition-colors hover:bg-secondary/35">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                              {profile.fullName?.split(" ").map((part) => part[0]).join("").slice(0, 2) || <Users className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="font-bold text-foreground">{profile.fullName || "Unknown contact"}</div>
                              {profile.companyDomain && <div className="text-xs text-muted-foreground">{profile.companyDomain}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-muted-foreground">{profile.likelyTitle || "Role match"}</td>
                        <td className="px-6 py-5">
                          {email ? (
                            <button
                              type="button"
                              onClick={() => copyEmail(email)}
                              className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 font-semibold text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              {email}
                              <Copy className="h-3.5 w-3.5 opacity-60" />
                              {copiedEmail === email && <span className="text-xs text-primary">Copied</span>}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">Not found</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          {linkedin ? (
                            <a
                              href={linkedin}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-[#0A66C2]/10 px-3 py-1.5 font-semibold text-[#0A66C2] transition-colors hover:bg-[#0A66C2]/15"
                            >
                              <Linkedin className="h-3.5 w-3.5" />
                              Profile
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Not found</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <Badge variant="secondary" className="rounded-full px-3 py-1 font-bold">
                            {profile.confidence}%
                          </Badge>
                        </td>
                        <td className="px-6 py-5 text-muted-foreground">{profile.source || "Search"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {results.profiles.length === 0 && (
              <div className="p-10 text-center">
                <h3 className="text-lg font-bold">No contacts found</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try a broader role list, a different company spelling, or add more provider keys.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
