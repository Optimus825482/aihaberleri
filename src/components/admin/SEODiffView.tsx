"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Eye, Code2 } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export interface SEODiff {
  field: string;
  label: string;
  before: string;
  after: string;
  type: "text" | "html" | "meta";
}

interface SEODiffViewProps {
  diffs: SEODiff[];
  onApply: (selectedFields: string[]) => Promise<void>;
  onReject: () => void;
  loading?: boolean;
}

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
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(diffs.map((d) => d.field)),
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
    if (selectedFields.size === diffs.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(diffs.map((d) => d.field)));
    }
  }, [diffs, selectedFields.size]);

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
    if (type === "html" || type === "meta") {
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

    return (
      <div className="p-3 bg-muted/30 rounded-lg text-sm font-mono whitespace-pre-wrap break-words">
        {content}
      </div>
    );
  };

  const allSelected = selectedFields.size === diffs.length;
  const someSelected =
    selectedFields.size > 0 && selectedFields.size < diffs.length;

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            SEO Değişiklikleri ({diffs.length})
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
              const isSelected = selectedFields.has(diff.field);

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
                  <div className="flex items-center gap-3 mb-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleField(diff.field)}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{diff.label}</h4>
                      <Badge variant="outline" className="mt-1">
                        {diff.type}
                      </Badge>
                    </div>
                  </div>

                  {/* Content Comparison */}
                  {previewMode === "split" ? (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Before */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                          <X className="h-4 w-4" />
                          Önce
                        </div>
                        {renderContent(diff.before, diff.type)}
                      </div>

                      {/* After */}
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
                      {/* Before */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                          <X className="h-4 w-4" />
                          Önce
                        </div>
                        {renderContent(diff.before, diff.type)}
                      </div>

                      {/* After */}
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
            {selectedFields.size} / {diffs.length} değişiklik seçildi
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
