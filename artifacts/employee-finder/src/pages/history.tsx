import { useGetSearchHistory, useClearHistory, useDeleteSearch } from "@workspace/api-client-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Search, Users, ExternalLink, Mail, LinkIcon, Target } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSearchHistoryQueryKey } from "@workspace/api-client-react";

export function History() {
  const { data: history, isLoading } = useGetSearchHistory();
  const clearHistory = useClearHistory();
  const deleteSearch = useDeleteSearch();
  const queryClient = useQueryClient();

  const handleClear = () => {
    clearHistory.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSearchHistoryQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteSearch.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSearchHistoryQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mission Logs</h1>
          <p className="text-muted-foreground text-sm">Review past reconnaissance operations.</p>
        </div>

        {history && history.items.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="font-mono text-xs">
                <Trash2 className="w-4 h-4 mr-2" />
                PURGE LOGS
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-destructive/20">
              <AlertDialogHeader>
                <AlertDialogTitle>Purge all mission logs?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All search history and extracted profiles will be permanently deleted from the server.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-mono text-xs">CANCEL</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono text-xs">
                  PURGE LOGS
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-card/50 rounded-lg animate-pulse border border-border/50" />
          ))}
        </div>
      ) : history?.items.length === 0 ? (
        <Card className="border-dashed border-muted-foreground/30 bg-background/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold text-muted-foreground">No logs found</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">Execute a search to generate mission logs.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history?.items.map((item) => (
            <Collapsible key={item.id} className="border border-border/50 rounded-lg bg-card/30 overflow-hidden">
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <CollapsibleTrigger className="flex-1 flex items-center gap-4 text-left">
                  <div className="p-3 bg-primary/10 rounded-md text-primary">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg leading-none">{item.company}</h3>
                      <Badge variant="outline" className="font-mono text-[10px] py-0 h-5">
                        {item.jobTitle}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                      <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> {item.profileCount} PROFILES</span>
                      <span>•</span>
                      <span>{format(new Date(item.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <div className="flex items-center gap-2 pl-4 border-l border-border/50 ml-4">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <CollapsibleContent className="border-t border-border/50 bg-background/50">
                <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                  {item.profiles.map((profile, i) => (
                    <div key={i} className="flex flex-col md:flex-row bg-card border border-border/50 rounded p-4 gap-4">
                       <div className="md:w-1/3 space-y-2">
                         <div className="flex items-center justify-between">
                            <span className="font-bold">{profile.fullName}</span>
                            <span className={cn(
                              "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                              profile.confidence >= 80 ? "text-green-500 border-green-500/30 bg-green-500/10" : 
                              profile.confidence >= 50 ? "text-amber-500 border-amber-500/30 bg-amber-500/10" : 
                              "text-red-500 border-red-500/30 bg-red-500/10"
                            )}>
                              {profile.confidence}%
                            </span>
                         </div>
                         <p className="text-xs text-primary">{profile.likelyTitle}</p>
                         <p className="text-[10px] font-mono text-muted-foreground">SRC: {profile.source}</p>
                       </div>
                       
                       <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                              <LinkIcon className="w-3 h-3 mr-1" /> Vectors
                            </div>
                            {profile.linkedinVariations.slice(0, 2).map((url, j) => (
                              <a key={j} href={url} target="_blank" rel="noreferrer" className="block text-[10px] font-mono text-blue-400 hover:underline truncate">
                                {url.split('in/')[1]}
                              </a>
                            ))}
                            {profile.linkedinVariations.length === 0 && <span className="text-[10px] text-muted-foreground">None</span>}
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                              <Mail className="w-3 h-3 mr-1" /> Emails
                            </div>
                            {profile.emailVariations.slice(0, 2).map((email, j) => (
                              <div key={j} className="text-[10px] font-mono text-muted-foreground truncate">{email}</div>
                            ))}
                            {profile.emailVariations.length === 0 && <span className="text-[10px] text-muted-foreground">None</span>}
                          </div>
                       </div>
                    </div>
                  ))}
                  {item.profiles.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground font-mono">
                      No profiles extracted during this mission.
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
