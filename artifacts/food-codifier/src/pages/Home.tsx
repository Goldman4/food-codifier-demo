import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, RotateCcw, Send, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

import {
  useListRationRecords,
  getListRationRecordsQueryKey,
  useGetRationStats,
  getGetRationStatsQueryKey,
  useGetCodifierInfo,
  useCodifyAllRecords,
  useCodifyRecord,
  useConfirmRecord,
  useSendToReview,
  useResetRecord,
} from "@workspace/api-client-react";
import type { RationRecord } from "@workspace/api-client-react";
import { formatDateTime, getStatusInfo } from "@/lib/formatters";
import { useDebounce } from "@/hooks/use-debounce";

export default function Workstation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: records = [], isLoading: isLoadingRecords } = useListRationRecords();
  const { data: stats } = useGetRationStats();
  const { data: codifierInfo } = useGetCodifierInfo();

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const codifyAll = useCodifyAllRecords();
  const codifyOne = useCodifyRecord();
  const confirmRecord = useConfirmRecord();
  const sendToReview = useSendToReview();
  const resetRecord = useResetRecord();

  // Selected record
  const selectedRecord = useMemo(() => records.find((r) => r.record_id === selectedRecordId), [records, selectedRecordId]);

  // Auto-select first record on initial load
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  useEffect(() => {
    if (!hasAutoSelected && records.length > 0) {
      setSelectedRecordId(records[0].record_id);
      setHasAutoSelected(true);
    }
  }, [records, hasAutoSelected]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch = r.food_description.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "Ожидание" && r.status === "pending") ||
        (statusFilter === "Кодифицировано" && r.status === "codified") ||
        (statusFilter === "Требует проверки" && r.status === "needs_review") ||
        (statusFilter === "Подтверждено" && r.status === "confirmed") ||
        (statusFilter === "На проверке" && r.status === "sent_to_review");
      return matchesSearch && matchesStatus;
    });
  }, [records, debouncedSearch, statusFilter]);

  const handleCodifyAll = () => {
    codifyAll.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRationRecordsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRationStatsQueryKey() });
        toast({ title: "Успешно", description: "Все записи обработаны." });
      },
      onError: () => {
        toast({ title: "Ошибка", description: "Не удалось кодифицировать записи.", variant: "destructive" });
      },
    });
  };

  const handleCodifyOne = (recordId: string) => {
    codifyOne.mutate({ recordId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRationRecordsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRationStatsQueryKey() });
      },
      onError: () => {
        toast({ title: "Ошибка", description: "Не удалось кодифицировать запись.", variant: "destructive" });
      },
    });
  };

  const handleConfirm = (recordId: string, code: string, name: string) => {
    confirmRecord.mutate({ recordId, data: { code, name } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRationRecordsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRationStatsQueryKey() });
      },
      onError: () => {
        toast({ title: "Ошибка", description: "Не удалось подтвердить код.", variant: "destructive" });
      },
    });
  };

  const handleSendToReview = (recordId: string) => {
    sendToReview.mutate({ recordId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRationRecordsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRationStatsQueryKey() });
      },
      onError: () => {
        toast({ title: "Ошибка", description: "Не удалось отправить на проверку.", variant: "destructive" });
      },
    });
  };

  const handleReset = (recordId: string) => {
    resetRecord.mutate({ recordId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRationRecordsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRationStatsQueryKey() });
      },
      onError: () => {
        toast({ title: "Ошибка", description: "Не удалось сбросить решение.", variant: "destructive" });
      },
    });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Top Bar */}
      <header className="flex-none h-14 border-b border-border bg-card flex items-center justify-between px-4 z-10">
        <h1 className="text-base font-bold text-foreground tracking-tight">
          Интеллектуальная кодификация рациона питания
        </h1>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono bg-muted text-muted-foreground border-transparent px-2.5 py-0.5 shadow-none font-medium">Записей: {stats?.total ?? 0}</Badge>
            <Badge variant="secondary" className="font-mono bg-muted text-muted-foreground border-transparent px-2.5 py-0.5 shadow-none font-medium">Кодификатор: {codifierInfo?.count ?? stats?.codifier_count ?? 0} позиций</Badge>
            <Badge variant="secondary" className="font-mono bg-muted text-muted-foreground border-transparent px-2.5 py-0.5 shadow-none font-medium">Обработано: {stats?.processed ?? 0}</Badge>
            <Badge variant="secondary" className="font-mono bg-muted text-muted-foreground border-transparent px-2.5 py-0.5 shadow-none font-medium">Требует проверки: {stats?.needs_review ?? 0}</Badge>
          </div>

          <Button 
            onClick={handleCodifyAll} 
            disabled={codifyAll.isPending}
            size="sm"
            className="shadow-sm"
          >
            {codifyAll.isPending ? <Spinner size="sm" className="mr-2 text-primary-foreground" /> : null}
            Кодифицировать все записи
          </Button>
        </div>
      </header>

      {/* Main Content Panels */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* LEFT PANEL */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="flex flex-col border-r border-border bg-card/50">
            <div className="p-3 border-b border-border flex flex-col gap-2 bg-card z-10">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Поиск по блюду..." 
                  className="pl-8 h-9 text-sm shadow-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm shadow-none">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="Ожидание">Ожидание</SelectItem>
                  <SelectItem value="Кодифицировано">Кодифицировано</SelectItem>
                  <SelectItem value="Требует проверки">Требует проверки</SelectItem>
                  <SelectItem value="Подтверждено">Подтверждено</SelectItem>
                  <SelectItem value="На проверке">На проверке</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {isLoadingRecords ? (
                <div className="p-3 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex flex-col gap-2 p-2 border border-border rounded-md">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Записи не найдены
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredRecords.map((record) => {
                    const isSelected = record.record_id === selectedRecordId;
                    const statusInfo = getStatusInfo(record);
                    
                    return (
                      <button
                        key={record.record_id}
                        className={`text-left p-3 border-b border-border transition-colors hover:bg-muted/50 ${
                          isSelected ? "bg-accent/50 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                        }`}
                        onClick={() => setSelectedRecordId(record.record_id)}
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {formatDateTime(record.date, record.meal_time)}
                        </div>
                        <div className="text-sm font-medium text-foreground line-clamp-2 leading-tight mb-2">
                          {record.food_description}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {record.status !== "pending" && record.codification?.suggested_code && (
                            <span className="font-mono text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 bg-background">
                              {record.codification.final_code || record.codification.suggested_code}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* CENTER PANEL */}
          <ResizablePanel defaultSize={30} minSize={25} className="flex flex-col border-r border-border bg-background">
            {!selectedRecord ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Выберите запись из списка слева
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-1 leading-snug">
                    {selectedRecord.food_description}
                  </h2>
                  <div className="text-sm text-muted-foreground mb-6">
                    Исходная запись
                  </div>
                  
                  <div className="grid grid-cols-1 gap-y-3 gap-x-4 border-y border-border py-4">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground w-1/3">Идентификатор</span>
                      <span className="font-mono text-foreground font-medium w-2/3">{selectedRecord.record_id}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground w-1/3">Дата</span>
                      <span className="text-foreground w-2/3">{selectedRecord.date}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground w-1/3">Время</span>
                      <span className="text-foreground w-2/3">{selectedRecord.meal_time}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground w-1/3">Место</span>
                      <span className="text-foreground w-2/3">{selectedRecord.place_label} {selectedRecord.place_code ? `(${selectedRecord.place_code})` : ""}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground w-1/3">Приготовление</span>
                      <span className="text-foreground w-2/3">{selectedRecord.preparation_label} {selectedRecord.preparation_code ? `(${selectedRecord.preparation_code})` : ""}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground w-1/3">Количество</span>
                      <span className="text-foreground w-2/3">{selectedRecord.quantity} {selectedRecord.unit}</span>
                    </div>
                  </div>
                </div>

                {selectedRecord.status === "pending" && (
                  <Button 
                    className="w-full"
                    onClick={() => handleCodifyOne(selectedRecord.record_id)}
                    disabled={codifyOne.isPending}
                  >
                    {codifyOne.isPending ? <Spinner size="sm" className="mr-2 text-primary-foreground" /> : null}
                    Кодифицировать запись
                  </Button>
                )}

                <Collapsible className="border border-border rounded-md bg-card shadow-sm">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-sm font-medium hover:bg-muted/50 transition-colors">
                    Исходный JSON
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-3 border-t border-border bg-muted/30">
                    <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify({
                        record_id: selectedRecord.record_id,
                        date: selectedRecord.date,
                        meal_time: selectedRecord.meal_time,
                        place_code: selectedRecord.place_code,
                        place_label: selectedRecord.place_label,
                        food_description: selectedRecord.food_description,
                        preparation_code: selectedRecord.preparation_code,
                        preparation_label: selectedRecord.preparation_label,
                        quantity: selectedRecord.quantity,
                        unit: selectedRecord.unit,
                      }, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* RIGHT PANEL */}
          <ResizablePanel defaultSize={45} minSize={30} className="flex flex-col bg-card">
            {!selectedRecord || !selectedRecord.codification ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Выберите запись для просмотра результата кодификации
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                
                {/* Confidence Block */}
                <div className="flex items-center gap-4 border-b border-border pb-6">
                  <div className={`text-4xl font-bold tracking-tighter ${
                    getStatusInfo(selectedRecord).hex === 'green' ? 'text-green-600 dark:text-green-500' :
                    getStatusInfo(selectedRecord).hex === 'amber' ? 'text-yellow-600 dark:text-yellow-500' :
                    getStatusInfo(selectedRecord).hex === 'red' ? 'text-red-600 dark:text-red-500' :
                    'text-foreground'
                  }`}>
                    {selectedRecord.codification.confidence}%
                  </div>
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusInfo(selectedRecord).color}`}>
                      {selectedRecord.codification.confidence_label}
                    </span>
                    <span className="text-sm text-muted-foreground">Уверенность модели</span>
                  </div>
                </div>

                {/* Main Result */}
                <div className="flex flex-col gap-4">
                  <div className="bg-muted/50 rounded-lg p-5 border border-border shadow-sm">
                    <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold text-[10px]">Предложенный код</div>
                    <div className="font-mono text-2xl font-semibold text-foreground mb-2">
                      {selectedRecord.codification.suggested_code}
                    </div>
                    <div className="text-lg font-medium text-foreground mb-4 leading-snug">
                      {selectedRecord.codification.suggested_name}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 text-sm border-t border-border/50 pt-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold text-[10px]">Раздел</span>
                        <span>{selectedRecord.codification.section}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold text-[10px]">Подгруппа</span>
                        <span>{selectedRecord.codification.subgroup}</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedRecord.codification.explanation && (
                    <div className="text-sm italic text-muted-foreground leading-relaxed pl-4 border-l-2 border-primary/30">
                      {selectedRecord.codification.explanation}
                    </div>
                  )}
                </div>

                {/* Actions or Status Banner */}
                <div className="border-y border-border py-6 flex flex-col gap-3">
                  {selectedRecord.status === "confirmed" && (
                    <>
                      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-md p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
                          <div>
                            <div className="text-green-800 dark:text-green-300 font-medium text-sm">Подтверждено</div>
                            <div className="text-green-700 dark:text-green-400 font-mono text-xs mt-0.5">
                              {selectedRecord.codification.final_code} — {selectedRecord.codification.final_name}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                          Источник: {selectedRecord.codification.decision_source === "specialist" ? "специалист" : "система"}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          variant="ghost" 
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive text-sm h-8"
                          onClick={() => handleReset(selectedRecord.record_id)}
                          disabled={resetRecord.isPending}
                        >
                          {resetRecord.isPending ? <Spinner size="sm" className="mr-2" /> : <RotateCcw className="h-3.5 w-3.5 mr-2" />}
                          Сбросить решение
                        </Button>
                      </div>
                    </>
                  )}

                  {selectedRecord.status === "sent_to_review" && (
                    <>
                      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-md p-4 flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-500" />
                        <div className="text-orange-800 dark:text-orange-300 font-medium text-sm">
                          Отправлено на проверку
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          variant="ghost" 
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive text-sm h-8"
                          onClick={() => handleReset(selectedRecord.record_id)}
                          disabled={resetRecord.isPending}
                        >
                          {resetRecord.isPending ? <Spinner size="sm" className="mr-2" /> : <RotateCcw className="h-3.5 w-3.5 mr-2" />}
                          Сбросить решение
                        </Button>
                      </div>
                    </>
                  )}

                  {(selectedRecord.status === "codified" || selectedRecord.status === "needs_review") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button 
                        onClick={() => handleConfirm(selectedRecord.record_id, selectedRecord.codification!.suggested_code, selectedRecord.codification!.suggested_name)}
                        disabled={confirmRecord.isPending || sendToReview.isPending || resetRecord.isPending}
                        className="w-full flex-1"
                      >
                        {confirmRecord.isPending ? <Spinner size="sm" className="mr-2 text-primary-foreground" /> : <Check className="h-4 w-4 mr-2" />}
                        Подтвердить код
                      </Button>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => handleSendToReview(selectedRecord.record_id)}
                          disabled={confirmRecord.isPending || sendToReview.isPending || resetRecord.isPending}
                          className="flex-1"
                        >
                          {sendToReview.isPending ? <Spinner size="sm" className="mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                          На проверку
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive px-3"
                          onClick={() => handleReset(selectedRecord.record_id)}
                          disabled={confirmRecord.isPending || sendToReview.isPending || resetRecord.isPending}
                          title="Сбросить решение"
                        >
                          {resetRecord.isPending ? <Spinner size="sm" /> : <RotateCcw className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Candidates */}
                {selectedRecord.codification.candidates && selectedRecord.codification.candidates.length > 0 && (
                  <div className="flex flex-col gap-4 pb-8">
                    <h3 className="text-sm font-semibold text-foreground">Альтернативные кандидаты</h3>
                    <div className="flex flex-col gap-3">
                      {selectedRecord.codification.candidates.map((candidate, idx) => (
                        <div 
                          key={`${candidate.code}-${idx}`}
                          className={`flex flex-col gap-3 p-4 rounded-md border ${idx === 0 ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-card border-border shadow-sm'} transition-colors`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-3">
                              <div className={`font-mono font-bold mt-0.5 ${idx === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                                #{idx + 1}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-mono text-sm font-semibold mb-0.5">{candidate.code}</span>
                                <span className="text-sm text-foreground">{candidate.name}</span>
                                {idx === 0 && (
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary mt-1.5">
                                    Предложен системой
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2 w-24 shrink-0">
                              <div className="text-sm font-bold text-foreground">
                                {candidate.score}%
                              </div>
                              <Progress value={candidate.score} className="h-1.5" />
                            </div>
                          </div>
                          
                          {(selectedRecord.status === "codified" || selectedRecord.status === "needs_review") && (
                            <div className="flex justify-end pt-2 border-t border-border/50">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                onClick={() => handleConfirm(selectedRecord.record_id, candidate.code, candidate.name)}
                                disabled={confirmRecord.isPending}
                              >
                                Выбрать этот вариант
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
