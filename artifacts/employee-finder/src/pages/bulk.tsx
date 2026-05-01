import React, { useState, useRef, useEffect } from "react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useStartBulkSearch, 
  useListBulkJobs, 
  getListBulkJobsQueryKey,
  useDeleteBulkJob,
  useGetBulkJob,
  getGetBulkJobQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { 
  ChevronDown, Search, Download, ExternalLink, Mail, Zap, Loader2, 
  Target, Link as LinkIcon, Info, Layers, Plus, Trash2, Upload, FileText, Check, AlertCircle, Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const SOURCES = ["duckduckgo", "jina", "github", "serper", "brave", "company_site"] as const;

const bulkItemSchema = z.object({
  company: z.string().min(1, "Required"),
  jobTitle: z.string().min(1, "Required"),
});

const searchSchema = z.object({
  items: z.array(bulkItemSchema).min(1, "Add at least one item"),
  maxResultsPerSearch: z.number().min(1).max(20).default(10),
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

export function Bulk() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isKeysOpen, setIsKeysOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"manual" | "csv">("manual");
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvItems, setCsvItems] = useState<{ company: string; jobTitle: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { keys: storedKeys } = useApiKeys();

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      items: [{ company: "", jobTitle: "" }],
      maxResultsPerSearch: 10,
      sources: [...SOURCES],
      apiKeys: {},
    },
  });

  useEffect(() => {
    if (Object.keys(storedKeys).length > 0) {
      form.setValue("apiKeys", storedKeys as SearchFormValues["apiKeys"]);
    }
  }, [storedKeys]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const startBulkSearch = useStartBulkSearch();
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);

  const { data: currentJobData, refetch: refetchJob } = useGetBulkJob(currentJobId!, {
    query: {
      enabled: !!currentJobId,
      queryKey: getGetBulkJobQueryKey(currentJobId!),
    }
  });

  const listJobsQuery = useListBulkJobs();

  const deleteJob = useDeleteBulkJob();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentJobId && currentJobData?.status !== "done" && currentJobData?.status !== "failed") {
      interval = setInterval(() => {
        refetchJob();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [currentJobId, currentJobData?.status, refetchJob]);

  function onSubmit(data: SearchFormValues) {
    let payloadItems = data.items;
    if (inputMode === "csv") {
      if (csvItems.length === 0) {
        toast({ title: "Error", description: "Please upload a valid CSV first.", variant: "destructive" });
        return;
      }
      payloadItems = csvItems;
    }

    startBulkSearch.mutate(
      { data: { ...data, items: payloadItems } },
      {
        onSuccess: (res) => {
          setCurrentJobId(res.id);
          queryClient.invalidateQueries({ queryKey: getListBulkJobsQueryKey() });
          toast({ title: "Bulk Search Started", description: "Your job has been queued." });
        },
        onError: (err: any) => {
          toast({ title: "Failed to start", description: err?.message || "Unknown error", variant: "destructive" });
        }
      }
    );
  }

  const handleDownloadSample = () => {
    const csvContent = "company,jobTitle\nOpenAI,Software Engineer\nAnthropic,Product Manager";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-bulk-search.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setCsvError("CSV must contain a header and at least one row of data.");
        setCsvItems([]);
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const companyIdx = headers.findIndex(h => h === "company");
      const titleIdx = headers.findIndex(h => h === "jobtitle" || h === "job title");

      if (companyIdx === -1 || titleIdx === -1) {
        setCsvError("CSV must have 'company' and 'jobTitle' columns.");
        setCsvItems([]);
        return;
      }

      const parsedItems = lines.slice(1).map(line => {
        // simple csv parse, handles basic quotes somewhat
        const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
        const comp = parts[companyIdx]?.replace(/(^"|"$)/g, '').trim() || "";
        const title = parts[titleIdx]?.replace(/(^"|"$)/g, '').trim() || "";
        return { company: comp, jobTitle: title };
      }).filter(item => item.company && item.jobTitle);

      if (parsedItems.length === 0) {
        setCsvError("No valid rows found in CSV.");
        setCsvItems([]);
      } else {
        setCsvItems(parsedItems);
      }
    };
    reader.readAsText(file);
  };

  const handleExportBatch = async (jobId: number) => {
    try {
      const response = await fetch(`/api/export/bulk/${jobId}`);
      if (!response.ok) throw new Error("Export failed");
      const csvData = await response.text();
      
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nelf-bulk-export-${jobId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast({ title: "Export Error", description: "Failed to download export.", variant: "destructive" });
    }
  };

  const handleDeleteJob = (jobId: number) => {
    deleteJob.mutate({ id: jobId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBulkJobsQueryKey() });
        toast({ title: "Job Deleted" });
      }
    });
  };

  const isRunning = startBulkSearch.isPending || (currentJobId && currentJobData?.status !== "done" && currentJobData?.status !== "failed");

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Bulk Intelligence</h1>
        <p className="text-muted-foreground text-sm">Execute multiple reconnaissance missions simultaneously.</p>
      </div>

      {isRunning ? (
        <Card className="border-primary/30 shadow-lg shadow-primary/5 bg-card/50 backdrop-blur min-h-[400px] flex flex-col items-center justify-center p-8">
          <div className="relative w-32 h-32 flex items-center justify-center mb-8">
            <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin [animation-duration:3s]" />
            <div className="absolute inset-2 border-r-2 border-primary/50 rounded-full animate-spin [animation-direction:reverse]" />
            <Layers className="w-10 h-10 text-primary animate-pulse" />
          </div>
          
          <div className="space-y-4 w-full max-w-md text-center">
            <h3 className="font-mono text-lg text-primary tracking-widest uppercase font-bold">
              Executing Bulk Search...
            </h3>
            {currentJobData ? (
              <>
                <p className="font-mono text-sm text-muted-foreground">
                  Processing {currentJobData.completedItems} / {currentJobData.totalItems} Targets
                </p>
                <Progress 
                  value={(currentJobData.completedItems / currentJobData.totalItems) * 100} 
                  className="h-2 bg-primary/20" 
                />
              </>
            ) : (
              <Progress value={undefined} className="h-2 bg-primary/20" />
            )}
          </div>
        </Card>
      ) : currentJobData && currentJobData.status === "done" ? (
        <div className="space-y-6">
          <Card className="border-primary/20 shadow-lg bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
              <div>
                <CardTitle className="text-xl">Mission Report: Batch #{currentJobData.id}</CardTitle>
                <CardDescription className="font-mono mt-1">
                  Completed {currentJobData.completedItems} targets. Found {currentJobData.totalProfilesFound} profiles.
                </CardDescription>
              </div>
              <Button onClick={() => handleExportBatch(currentJobData.id)} className="font-mono text-xs tracking-widest font-bold">
                <Download className="w-4 h-4 mr-2" />
                EXPORT BATCH CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[200px]">Company</TableHead>
                    <TableHead className="w-[200px]">Role</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Profiles Found</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentJobData.results?.map((res, i) => (
                    <React.Fragment key={i}>
                    <TableRow className="group">
                      <TableCell className="font-medium">{res.company}</TableCell>
                      <TableCell className="text-muted-foreground">{res.jobTitle}</TableCell>
                      <TableCell className="text-center">
                        {res.status === "done" ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">SUCCESS</Badge>
                        ) : res.status === "failed" ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 cursor-help">FAILED</Badge>
                            </TooltipTrigger>
                            <TooltipContent>{res.error || "Unknown error"}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant="outline">{res.status.toUpperCase()}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {res.profileCount}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground font-mono text-xs">
                        {res.durationMs ? `${res.durationMs}ms` : "-"}
                      </TableCell>
                    </TableRow>
                    {res.profiles && res.profiles.length > 0 && (
                      <TableRow className="border-b-0 hover:bg-transparent">
                        <TableCell colSpan={5} className="p-0">
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value={`item-${i}`} className="border-none">
                              <AccordionTrigger className="px-4 py-2 hover:bg-muted/50 text-xs font-mono text-muted-foreground uppercase tracking-widest data-[state=open]:bg-muted/50 transition-none">
                                View Profiles ({res.profiles.length})
                              </AccordionTrigger>
                              <AccordionContent className="p-4 bg-muted/10 space-y-4">
                                {res.profiles.map((profile, pIdx) => (
                                  <Card 
                                    key={pIdx} 
                                    className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors"
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
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setCurrentJobId(null)} className="font-mono tracking-widest text-xs">
              <Plus className="w-4 h-4 mr-2" /> NEW BULK SEARCH
            </Button>
          </div>
        </div>
      ) : (
        <Card className="border-primary/20 shadow-lg shadow-primary/5 bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="manual" className="font-mono text-xs uppercase tracking-widest">Manual Input</TabsTrigger>
                    <TabsTrigger value="csv" className="font-mono text-xs uppercase tracking-widest">CSV Upload</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="manual" className="space-y-4">
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex gap-4 items-start bg-muted/20 p-3 rounded-lg border border-border/50">
                          <FormField
                            control={form.control}
                            name={`items.${index}.company`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input placeholder="Company (e.g. OpenAI)" className="font-mono text-sm bg-background/50" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.jobTitle`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input placeholder="Role (e.g. Software Engineer)" className="font-mono text-sm bg-background/50" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (fields.length > 1) remove(index);
                            }}
                            disabled={fields.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => append({ company: "", jobTitle: "" })}
                      className="font-mono text-xs w-full border-dashed"
                    >
                      <Plus className="w-4 h-4 mr-2" /> ADD TARGET
                    </Button>
                  </TabsContent>

                  <TabsContent value="csv" className="space-y-6">
                    <div 
                      className="border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 text-muted-foreground mb-3" />
                      <h3 className="font-medium text-lg mb-1">Upload Targets CSV</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mb-4">
                        Drag and drop or click to select a CSV file containing "company" and "jobTitle" columns.
                      </p>
                      <input 
                        type="file" 
                        accept=".csv" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                      />
                      <Button type="button" variant="secondary" className="font-mono text-xs">
                        SELECT FILE
                      </Button>
                    </div>

                    {csvError && (
                      <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">
                        <AlertCircle className="w-4 h-4" />
                        {csvError}
                      </div>
                    )}

                    {csvItems.length > 0 && !csvError && (
                      <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-500/20 p-2 rounded-full">
                            <Check className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">CSV Loaded Successfully</p>
                            <p className="text-xs opacity-80 font-mono">Found {csvItems.length} valid targets ready for search.</p>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setCsvItems([])} className="text-green-600 hover:text-green-500 hover:bg-green-500/20">
                          Clear
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Need a template?</span>
                      <Button type="button" variant="link" onClick={handleDownloadSample} className="h-auto p-0 font-mono text-primary">
                        Download Sample CSV
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/50">
                  <FormField
                    control={form.control}
                    name="maxResultsPerSearch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex justify-between">
                          <span>Max Results Per Target</span>
                          <span className="text-primary font-mono">{field.value}</span>
                        </FormLabel>
                        <FormControl>
                          <Slider
                            min={1}
                            max={20}
                            step={1}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            className="py-4"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Shared Collapsible / Settings ... */}
                  <div className="space-y-4">
                     <Collapsible open={isKeysOpen} onOpenChange={setIsKeysOpen} className="border border-border/50 rounded-lg bg-background/30">
                        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                            <Zap className="w-4 h-4 text-amber-500" />
                            Boost Search Power (API Keys)
                          </div>
                          <ChevronDown className={cn("w-4 h-4 transition-transform", isKeysOpen && "rotate-180")} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="p-4 pt-0 border-t border-border/50 mt-2">
                          <div className="grid grid-cols-1 gap-4 mt-4 max-h-48 overflow-y-auto pr-2">
                            {["serper", "groq", "exa", "firecrawl", "brave", "jina", "tavily"].map((keyName) => (
                              <FormField
                                key={keyName}
                                control={form.control}
                                name={`apiKeys.${keyName}` as any}
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-4 space-y-0">
                                    <FormLabel className="w-24 text-xs font-mono text-muted-foreground capitalize">{keyName}</FormLabel>
                                    <FormControl className="flex-1">
                                      <Input type="password" placeholder="sk-..." className="h-8 font-mono text-xs bg-background/50" {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    disabled={startBulkSearch.isPending}
                    className="font-mono font-bold tracking-widest min-w-[200px] shadow-lg shadow-primary/20"
                    size="lg"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    LAUNCH BULK SEARCH
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Past Bulk Jobs */}
      <div className="pt-12">
        <h2 className="text-xl font-bold tracking-tight mb-6">Past Batch Operations</h2>
        {listJobsQuery.isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : listJobsQuery.data?.items?.length ? (
          <div className="grid grid-cols-1 gap-4">
            {listJobsQuery.data.items.map((job) => (
              <Card key={job.id} className="bg-card/30 backdrop-blur hover:bg-card/50 transition-colors">
                <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Batch Operation #{job.id}</CardTitle>
                      <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1 font-mono text-xs">
                        <span>{new Date(job.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>{job.totalItems} Targets</span>
                        <span>•</span>
                        <span>{job.totalProfilesFound} Profiles Found</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                      "font-mono text-xs uppercase",
                      job.status === 'done' ? "text-green-500 border-green-500/30" : 
                      job.status === 'failed' ? "text-red-500 border-red-500/30" : 
                      "text-amber-500 border-amber-500/30"
                    )}>
                      {job.status}
                    </Badge>
                    {job.status === "done" && (
                      <Button variant="ghost" size="sm" onClick={() => handleExportBatch(job.id)} className="h-8 text-primary hover:text-primary hover:bg-primary/10">
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteJob(job.id)} className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-12 border border-dashed border-border/50 rounded-xl bg-muted/10">
            <Layers className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-muted-foreground">No past batch operations found.</h3>
          </div>
        )}
      </div>

    </div>
  );
}
