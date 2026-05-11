import { useGetSearchHistory, useClearHistory, useDeleteSearch } from "@workspace/api-client-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Search, Users, Mail, Linkedin, Calendar, ChevronDown, ChevronUp } from "lucide-react";
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
import { useState } from "react";

export function History() {
  const { data: history, isLoading } = useGetSearchHistory();
  const clearHistory = useClearHistory();
  const deleteSearch = useDeleteSearch();
  const queryClient = useQueryClient();
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});

  const toggleItem = (id: number) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    <div className="space-y-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Search History</h1>
          <p className="text-muted-foreground text-lg">Review and manage your past organization mapping missions.</p>
        </div>

        {history && history.items.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/20 rounded-lg">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All History
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all past search results and extracted profiles. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">
                  Clear Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-secondary/50 rounded-xl animate-pulse border border-border" />
          ))}
        </div>
      ) : history?.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-2xl bg-secondary/20">
          <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-bold text-foreground">No history yet</h3>
          <p className="text-muted-foreground mt-2 max-w-xs">Start a new search to see your mission logs here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history?.items.map((item) => (
            <Collapsible 
              key={item.id} 
              open={openItems[item.id]} 
              onOpenChange={() => toggleItem(item.id)}
              className="border border-border rounded-xl bg-card overflow-hidden shadow-sm transition-all"
            >
              <div className="flex items-center justify-between p-5">
                <CollapsibleTrigger className="flex-1 flex items-center gap-5 text-left">
                  <div className="w-12 h-12 rounded-lg bg-primary/5 flex items-center justify-center text-primary shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg truncate">{item.company}</h3>
                      <Badge variant="secondary" className="bg-secondary/80 text-foreground font-semibold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                        {item.jobTitle}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
                      <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {item.profileCount} profiles</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mr-4">
                    {openItems[item.id] ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </CollapsibleTrigger>
                
                <div className="flex items-center gap-2 pl-5 border-l border-border">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-10 w-10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <CollapsibleContent className="border-t border-border bg-secondary/10">
                <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                  {item.profiles.map((profile, i) => (
                    <div key={i} className="flex flex-col md:flex-row bg-card border border-border rounded-lg p-5 gap-6 shadow-sm">
                       <div className="md:w-1/3 space-y-3">
                         <div className="flex items-start justify-between">
                            <h4 className="font-bold text-base leading-tight">{profile.fullName}</h4>
                            <Badge variant="outline" className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                              profile.confidence >= 80 ? "text-green-600 border-green-600/20 bg-green-50" : 
                              profile.confidence >= 50 ? "text-amber-600 border-amber-600/20 bg-amber-50" : 
                              "text-red-600 border-red-600/20 bg-red-50"
                            )}>
                              {profile.confidence}% Match
                            </Badge>
                         </div>
                         <div className="space-y-1">
                           <p className="text-sm font-semibold text-primary">{profile.likelyTitle}</p>
                           <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Source: {profile.source}</p>
                         </div>
                       </div>
                       
                       <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                              <Linkedin className="w-3 h-3" /> Profiles
                            </span>
                            <div className="space-y-1.5">
                              {profile.linkedinVariations.slice(0, 2).map((url, j) => (
                                <a key={j} href={url} target="_blank" rel="noreferrer" className="block text-xs font-medium text-blue-600 hover:underline truncate">
                                  {url.replace('https://www.linkedin.com/in/', '')}
                                </a>
                              ))}
                              {profile.linkedinVariations.length === 0 && <span className="text-xs text-muted-foreground italic">No links found</span>}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                              <Mail className="w-3 h-3" /> Predicted Emails
                            </span>
                            <div className="space-y-1.5">
                              {profile.emailVariations.slice(0, 2).map((email, j) => (
                                <div key={j} className="text-xs font-medium text-foreground truncate">{email}</div>
                              ))}
                              {profile.emailVariations.length === 0 && <span className="text-xs text-muted-foreground italic">No emails predicted</span>}
                            </div>
                          </div>
                       </div>
                    </div>
                  ))}
                  {item.profiles.length === 0 && (
                    <div className="text-center py-10 bg-card border border-border rounded-lg">
                      <p className="text-sm text-muted-foreground italic">No profiles were extracted during this mission.</p>
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
