"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Trash2, Plus, GripVertical } from "lucide-react";

interface QuestionDraft {
  questionText: string;
  questionType: string;
  isRequired: boolean;
  options: string[];
  helpText: string;
}

const questionTypeLabels: Record<string, string> = {
  TEXT: "Short Text",
  TEXTAREA: "Long Text",
  NUMBER: "Number",
  DATE: "Date",
  SINGLE_CHOICE: "Single Choice",
  MULTIPLE_CHOICE: "Multiple Choice",
  SCALE: "Scale (1-10)",
  LOCATION: "Location",
  BOOLEAN: "Yes / No",
};

const emptyQuestion: QuestionDraft = {
  questionText: "",
  questionType: "TEXT",
  isRequired: false,
  options: [],
  helpText: "",
};

export function CreateTemplateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("RAPID_ASSESSMENT");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { ...emptyQuestion },
  ]);
  const [error, setError] = useState<string | null>(null);

  const createTemplate = api.survey.createTemplate.useMutation({
    onSuccess: (data) => {
      router.push(`/surveys/${data.id}`);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  function updateQuestion(index: number, updates: Partial<QuestionDraft>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...updates } : q)),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, { ...emptyQuestion }]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function addOption(qIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: [...q.options, ""] } : q,
      ),
    );
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((o, j) => (j === oIndex ? value : o)),
            }
          : q,
      ),
    );
  }

  function removeOption(qIndex: number, oIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.filter((_, j) => j !== oIndex) }
          : q,
      ),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validQuestions = questions.filter((q) => q.questionText.trim());
    if (validQuestions.length === 0) {
      setError("Add at least one question.");
      return;
    }

    createTemplate.mutate({
      name,
      description: description || undefined,
      category: category as "RAPID_ASSESSMENT",
      estimatedDuration: estimatedDuration
        ? parseInt(estimatedDuration)
        : undefined,
      questions: validQuestions.map((q) => ({
        questionText: q.questionText,
        questionType: q.questionType as "TEXT",
        isRequired: q.isRequired,
        options:
          ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(q.questionType) &&
          q.options.length > 0
            ? q.options.filter(Boolean)
            : undefined,
        helpText: q.helpText || undefined,
      })),
    });
  }

  const needsOptions = (type: string) =>
    ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(type);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Details */}
      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., Protection Rapid Assessment"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RAPID_ASSESSMENT">Rapid Assessment</SelectItem>
                  <SelectItem value="MONITORING">Monitoring</SelectItem>
                  <SelectItem value="EVALUATION">Evaluation</SelectItem>
                  <SelectItem value="FEEDBACK">Feedback</SelectItem>
                  <SelectItem value="REGISTRATION">Registration</SelectItem>
                  <SelectItem value="NEEDS_ASSESSMENT">Needs Assessment</SelectItem>
                  <SelectItem value="POST_DISTRIBUTION">Post-Distribution</SelectItem>
                  <SelectItem value="BASELINE">Baseline</SelectItem>
                  <SelectItem value="ENDLINE">Endline</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this survey template..."
              rows={2}
            />
          </div>
          <div className="w-48 space-y-2">
            <Label htmlFor="duration">Estimated Duration (min)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
              placeholder="15"
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Questions ({questions.length})
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="mr-1 h-4 w-4" />
            Add Question
          </Button>
        </div>

        {questions.map((q, qIndex) => (
          <Card key={qIndex}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="mt-2 text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Q{qIndex + 1}</Badge>
                    <Select
                      value={q.questionType}
                      onValueChange={(v) =>
                        updateQuestion(qIndex, { questionType: v })
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(questionTypeLabels).map(
                          ([val, label]) => (
                            <SelectItem key={val} value={val}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <label className="ml-auto flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={q.isRequired}
                        onChange={(e) =>
                          updateQuestion(qIndex, {
                            isRequired: e.target.checked,
                          })
                        }
                      />
                      Required
                    </label>
                    {questions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(qIndex)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <Input
                    value={q.questionText}
                    onChange={(e) =>
                      updateQuestion(qIndex, { questionText: e.target.value })
                    }
                    placeholder="Enter your question..."
                    required
                  />

                  <Input
                    value={q.helpText}
                    onChange={(e) =>
                      updateQuestion(qIndex, { helpText: e.target.value })
                    }
                    placeholder="Help text (optional)"
                    className="text-sm"
                  />

                  {/* Options for choice questions */}
                  {needsOptions(q.questionType) && (
                    <div className="space-y-2 pl-4">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {oIndex + 1}.
                          </span>
                          <Input
                            value={opt}
                            onChange={(e) =>
                              updateOption(qIndex, oIndex, e.target.value)
                            }
                            placeholder={`Option ${oIndex + 1}`}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(qIndex, oIndex)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addOption(qIndex)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add Option
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={createTemplate.isPending}>
          {createTemplate.isPending ? "Creating..." : "Create Template"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
