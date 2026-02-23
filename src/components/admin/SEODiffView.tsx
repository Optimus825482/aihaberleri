"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Eye, Code2, ShieldCheck, ShieldAlert, Tag } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export interface SEODiff {
  field: string;
  label: string;
  before: string;
  after: string;
  type: "text" | "content" | "info" | "keywords" | "html" | "meta";
  improvements?: string[];
  guardrailPassed?: boolean;
  guardrailNote?: string;
}

interface SEODiffViewProps {
  diffs: SEODiff[];
  onApply: (selectedFields: string[]) => Promise<void>;
  onReject: () => void;
  loading?: boolean;
}

// Non-selectable diff types (info cards, not actual changes to apply)
const NON_SELECTABLE_TYPES = new Set(["info"]);

/**
 * SEO Diff View Component
 * Displays before/after comparison with selective application
 */
export function SEODiffView({
  diffs,
  onApply,
  onReject,
  loading = false,
}: SEODiffViewProps) {
  const selectableDiffs = diffs.filter((d) => !NON_SELECTABLE_TYPES.has(d.type));
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(selectableDiffs.map((d) => d.field)),
  );
  const [previewMode, setPreviewMode] = useState<"split" | "unified">("split");
  const [applying, setApplying] = useState(false);

  const toggleField = useCallback((field: string) => {
    setSelectedFields((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(field)) {
        newSet.delete(field);
      } else {
        newSet.add(field);
      }
      return newSet;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedFields.size === selectableDiffs.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(selectableDiffs.map((d) => d.field)));
    }
  }, [selectableDiffs, selectedFields.size]);

  const handleApply = async () => {
    if (selectedFields.size === 0) {
      alert("Lütfen en az bir değişiklik seçin");
      return;
    }

    setApplying(true);
    try {
      await onApply(Array.from(selectedFields));
    } finally {
      setApplying(false);
    }
  };

  const renderContent = (content: string, type: SEODiff["type"]) => {
    if (type === "html" || type === "meta" || type === "content") {
      return (
        <SyntaxHighlighter
          language="html"
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            maxHeight: "200px",
          }}
          wrapLongLines
        >
          {content}
        </SyntaxHighlighter>
      );
    }

    if (type === "keywords") {
      const keywords = content.split(",").map((k) => k.trim()).filter(Boolean);
      return (
        <div className="flex flex-wrap gap-1.5 p-3 bg-muted/30 rounded-lg">
          {keywords.map((kw, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {kw}
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <div className="p-3 bg-muted/30 rounded-lg text-sm font-mono whitespace-pre-wrap break-words">
        {content}
      </div>
    );
  };

  const renderInfoCard = (diff: SEODiff) => (
    <div className="border rounded-lg p-4 bg-blue-500/5 border-blue-500/20">
      <h4 className="font-semibold text-sm mb-2">{diff.label}</h4>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">{diff.before}</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-semibold">{diff.after}</span>
      </div>
    </div>
  );

  const allSelected = selectedFields.size === selectableDiffs.length;
  const someSelected =
    selectedFields.size > 0 && selectedFields.size < selectableDiffs.length;

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            SEO Değişiklikleri ({selectableDiffs.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPreviewMode(previewMode === "split" ? "unified" : "split")
              }
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode === "split" ? "Yan Yana" : "Birleşik"}
            </Button>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                className="data-[state=indeterminate]:bg-primary"
                {...(someSelected && { "data-state": "indeterminate" })}
              />
              <span className="text-sm text-muted-foreground">Tümünü Seç</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {diffs.map((diff) => {
              // Info type: non-selectable display card
              if (diff.type === "info") {
                return <div key={diff.field}>{renderInfoCard(diff)}</div>;
              }

              const isSelected = selectedFields.has(diff.field);
              const isSelectable = !NON_SELECTABLE_TYPES.has(diff.type);

              return (
                <div
                  key={diff.field}
                  className={`border rounded-lg p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    {isSelectable && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleField(diff.field)}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{diff.label}</h4>
                        <Badge variant="outline" className="text-xs">
                          {diff.type}
                        </Badge>
                        {/* Guardrail indicator */}
                        {diff.guardrailPassed !== undefined && (
                          diff.guardrailPassed ? (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Geçti
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400">
                              <ShieldAlert className="h-3 w-3 mr-1" />
                              Uyarı
                            </Badge>
                          )
                        )}
                      </div>
                      {diff.guardrailNote && (
                        <p className="text-xs text-muted-foreground mt-1">{diff.guardrailNote}</p>
                      )}
                    </div>
                  </div>

                  {/* Improvements list */}
                  {diff.improvements && diff.improvements.length > 0 && (
                    <div className="mb-3 px-3 py-2 bg-green-500/5 border border-green-500/10 rounded-md">
                      <ul className="text-xs text-green-700 dark:text-green-400 space-y-0.5">
                        {diff.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Content Comparison */}
                  {previewMode === "split" ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                          <X className="h-4 w-4" />
                          Önce
                        </div>
                        {renderContent(diff.before, diff.type)}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          Sonra
                        </div>
                        {renderContent(diff.after, diff.type)}
                      </div>
                    </div>
                  ) : (
                      <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                          <X className="h-4 w-4" />
                          Önce
                        </div>
                        {renderContent(diff.before, diff.type)}
                        </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          Sonra
                        </div>
                        {renderContent(diff.after, diff.type)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedFields.size} / {selectableDiffs.length} değişiklik seçildi
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onReject}
              disabled={loading || applying}
            >
              <X className="h-4 w-4 mr-2" />
              İptal
            </Button>
            <Button
              onClick={handleApply}
              disabled={loading || applying || selectedFields.size === 0}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <Check className="h-4 w-4 mr-2" />
              {applying
                ? "Uygulanıyor..."
                : `${selectedFields.size} Değişikliği Uygula`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
