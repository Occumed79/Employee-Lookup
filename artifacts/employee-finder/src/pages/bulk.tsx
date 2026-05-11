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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Download, Loader2, Plus, Trash2, Upload, FileText, Check, AlertCircle, Play, Users, Building2, Briefcase, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const SOURCES = ["duckduckgo", "jina", "github", "serper", "brave", "company_site", "exa", "tavily", "firecrawl"] as const;

const bulkItemSchema = z.object({
  company: z.string().min(1, "Required"),
  jobTitle: z.string().min(1, "Required"),
});

const searchSchema = z.object({
  items: z.array(bulkItemSchema).min(1, "Add at least one item"),
  maxResultsPerSearch: z.number().min(1).max(20).default(10),
  sources: z.array(z.string()).min(1, "Select at least one source"),
  apiKeys: z.record(z.string()).optional(),
});

type SearchFormValues = z.infer<typeof searchSchema>;

export function Bulk() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
      form.setValue("apiKeys", storedKeys as Record<string, string>);
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
        const parts = line.split(",");
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
      a.download = `bulk-export-${jobId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast({ title: "Export Error", description: "Failed to download export.", variant: "destructive" });
    }
  };

  const isRunning = startBulkSearch.isPending || (currentJobId && currentJobData?.status !== "done" && currentJobData?.status !== "failed");

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Bulk Processing</h1>
        <p className="text-muted-foreground text-lg">Execute multiple organization mapping missions in parallel.</p>
      </div>

      {isRunning ? (
        <Card className="border-border shadow-sm bg-card min-h-[300px] flex flex-col items-center justify-center p-12">
          <div className="flex flex-col items-center gap-6 w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Processing Bulk Job</h3>
              <p className="text-sm text-muted-foreground">
                Mapping {currentJobData?.completedItems || 0} of {currentJobData?.totalItems || 0} organizations
              </p>
            </div>
            <Progress 
              value={currentJobData ? (currentJobData.completedItems / currentJobData.totalItems) * 100 : 0} 
              className="h-2 w-full bg-secondary" 
            />
            <Button variant="outline" onClick={() => setCurrentJobId(null)} className="mt-4">
              View History
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">New Batch Job</CardTitle>
                  <CardDescription>Define target organizations and roles for bulk extraction.</CardDescription>
                </div>
                <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as any)} className="w-auto">
                  <TabsList className="bg-secondary/50">
                    <TabsTrigger value="manual" className="text-xs font-semibold">Manual Entry</TabsTrigger>
                    <TabsTrigger value="csv" className="text-xs font-semibold">CSV Upload</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {inputMode === "manual" ? (
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex gap-4 items-end animate-in fade-in slide-in-from-left-2 duration-300">
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`items.${index}.company`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={cn("text-xs font-bold text-muted-foreground", index > 0 && "sr-only")}>Company</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Company Name" className="h-10 bg-secondary/30" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.jobTitle`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={cn("text-xs font-bold text-muted-foreground", index > 0 && "sr-only")}>Role</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Job Title" className="h-10 bg-secondary/30" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="h-10 w-10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ company: "", jobTitle: "" })}
                        className="mt-2 text-xs font-bold"
                      >
                        <Plus className="w-3.5 h-3.5 mr-2" />
                        Add Another Target
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div 
                        className={cn(
                          "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer",
                          csvItems.length > 0 ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-secondary/30"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept=".csv" 
                          onChange={handleFileUpload} 
                        />
                        {csvItems.length > 0 ? (
                          <>
                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mb-4">
                              <Check className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <h3 className="text-lg font-bold">CSV Ready</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {csvItems.length} valid rows identified.
                            </p>
                            <Button variant="link" className="mt-2 text-xs" onClick={(e) => { e.stopPropagation(); setCsvItems([]); }}>
                              Change File
                            </Button>
                          </>
                        ) : (
                          <>
                            <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-bold">Upload Target List</h3>
                            <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
                              Drag and drop your CSV here, or click to browse. Must contain 'company' and 'jobTitle' columns.
                            </p>
                          </>
                        )}
                      </div>
                      {csvError && (
                        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {csvError}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6 border-t border-border">
                    <div className="flex items-center gap-6">
                      <FormField
                        control={form.control}
                        name="maxResultsPerSearch"
                        render={({ field }) => (
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-muted-foreground">Results per target:</span>
                            <Input type="number" className="w-20 h-9 bg-secondary/30" {...field} />
                          </div>
                        )}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isRunning}
                      className="h-12 px-10 rounded-lg font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Start Batch Processing
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Recent Jobs</h2>
            <div className="grid grid-cols-1 gap-4">
              {listJobsQuery.data?.items.map((job) => (
                <Card key={job.id} className="border-border bg-card hover:border-primary/30 transition-all shadow-sm group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          job.status === "done" ? "bg-green-100 text-green-600" : 
                          job.status === "failed" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {job.status === "done" ? <Check className="w-5 h-5" /> : 
                           job.status === "failed" ? <AlertCircle className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-base">Batch Job #{job.id}</h3>
                          <p className="text-xs text-muted-foreground font-medium">
                            {job.totalItems} targets • {job.totalProfilesFound} profiles found • {new Date(job.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.status === "done" && (
                          <Button variant="outline" size="sm" onClick={() => handleExportBatch(job.id)} className="h-9 rounded-md">
                            <Download className="w-3.5 h-3.5 mr-2" />
                            Export
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => deleteJob.mutate({ id: job.id })} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
