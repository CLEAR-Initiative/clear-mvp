"use client";

import { useState } from "react";
import {
  Box, Text, TextInput, Textarea, Button, Stack, Group,
  SimpleGrid, Tooltip, UnstyledButton,
} from "@mantine/core";
import { IconArrowLeft, IconArrowRight, IconCheck, IconPrinter } from "@tabler/icons-react";
import {
  CRITERIA, MODS, GRADES, GRADE_COLORS, GRADE_LABELS, RATIONALE,
  DELIVERY_TYPE, MARKET_APPROACH,
  type GradeKey, type ModCode,
} from "../_data/mct-criteria";

/* ── Types ────────────────────────────────────────────────────────── */

type Screen = "intro" | "survey" | "report";

interface ProjectDetails {
  name: string;
  country: string;
  donor: string;
  duration: string;
  description: string;
  team: string;
}

type CriterionAnswers = Partial<Record<ModCode, GradeKey>>;
type AllAnswers = Record<number, CriterionAnswers>;
type AllNotes = Record<number, string>;

/* ── Score helpers ────────────────────────────────────────────────── */

function computeScores(ans: AllAnswers) {
  const totals: Record<string, { pts: number; cnt: number; pct: number }> = {};
  MODS.forEach((m) => { totals[m.n] = { pts: 0, cnt: 0, pct: 0 }; });
  CRITERIA.forEach((c) => {
    const a = ans[c.id] ?? {};
    MODS.forEach((m) => {
      const g = a[m.c];
      if (g) {
        const gr = GRADES.find((x) => x.k === g);
        if (gr) { totals[m.n].pts += gr.sc; totals[m.n].cnt++; }
      }
    });
  });
  Object.values(totals).forEach((t) => {
    t.pct = t.cnt > 0 ? Math.round((t.pts / (t.cnt * 3)) * 100) : 0;
  });
  return totals;
}

function getSortedModalities(ans: AllAnswers) {
  const sc = computeScores(ans);
  return MODS.map((m) => ({ ...m, ...sc[m.n] })).sort((a, b) => {
    const d = b.pts - a.pts;
    return d !== 0 ? d : b.pct - a.pct;
  });
}

function answeredCount(ans: AllAnswers) {
  return CRITERIA.filter((c) => {
    const a = ans[c.id] ?? {};
    return Object.values(a).some((v) => v);
  }).length;
}

/* ── Grade pill ───────────────────────────────────────────────────── */

function GradePill({
  gradeKey,
  selected,
  optionText,
  onClick,
}: {
  gradeKey: GradeKey;
  selected: boolean;
  optionText: string;
  onClick: () => void;
}) {
  const col = GRADE_COLORS[gradeKey];
  return (
    <Tooltip
      label={
        <Box>
          <Text size="xs" fw={700} mb={4} style={{ color: col.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {GRADE_LABELS[gradeKey]}
          </Text>
          <Text size="xs" style={{ color: "#e5e7eb", lineHeight: 1.55 }}>
            {optionText}
          </Text>
        </Box>
      }
      multiline
      maw={300}
      position="top"
      styles={{ tooltip: { background: "#1a1a18", padding: "10px 12px" } }}
    >
      <UnstyledButton
        onClick={onClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 11px",
          borderRadius: 999,
          border: `1.5px solid ${selected ? col.border : "#E5E5E5"}`,
          background: selected ? col.bg : "#FFF",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          color: selected ? col.color : "#737373",
          whiteSpace: "nowrap",
          transition: "all 0.12s",
        }}
      >
        <Box
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: selected ? col.color : "#D4D4D4",
            flexShrink: 0,
          }}
        />
        {GRADE_LABELS[gradeKey]}
      </UnstyledButton>
    </Tooltip>
  );
}

/* ── Step navigation ──────────────────────────────────────────────── */

function StepNav({
  screen,
  ci,
  ans,
  onGoIntro,
  onGoStep,
  onGoReport,
}: {
  screen: Screen;
  ci: number;
  ans: AllAnswers;
  onGoIntro: () => void;
  onGoStep: (i: number) => void;
  onGoReport: () => void;
}) {
  const count = answeredCount(ans);

  const stepBtn = (
    label: string,
    isActive: boolean,
    isDone: boolean,
    num: React.ReactNode,
    onClick: () => void,
  ) => (
    <UnstyledButton
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 5,
        background: isActive ? "#FFF4EF" : "transparent",
        color: isActive ? "#E85D3D" : "#525252",
        fontWeight: isActive ? 600 : 400,
        fontSize: 12,
        width: "100%",
        transition: "background 0.1s",
      }}
      className="hover:bg-[#F5F5F5]"
    >
      <Box
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: isDone ? "none" : `1px solid ${isActive ? "#E85D3D" : "#D4D4D4"}`,
          background: isDone ? "#16a34a" : isActive ? "#E85D3D" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          fontWeight: 700,
          color: isDone || isActive ? "#FFF" : "#A3A3A3",
          flexShrink: 0,
        }}
      >
        {isDone ? <IconCheck size={10} /> : num}
      </Box>
      {label}
    </UnstyledButton>
  );

  return (
    <Box
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: "1px solid #E5E5E5",
        background: "#FAFAFA",
        overflowY: "auto",
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.07em", padding: "4px 12px 6px" }}>
        Setup
      </Text>
      {stepBtn("Project details", screen === "intro", false, "·", onGoIntro)}

      <Text style={{ fontSize: 10, fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.07em", padding: "10px 12px 6px" }}>
        Assessment
      </Text>
      {CRITERIA.map((c, i) => {
        const isDone = !!(ans[c.id] && Object.values(ans[c.id]).some((v) => v));
        const isActive = screen === "survey" && ci === i;
        return stepBtn(c.label, isActive, isDone, c.id, () => onGoStep(i));
      })}

      <Text style={{ fontSize: 10, fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.07em", padding: "10px 12px 6px" }}>
        Output
      </Text>
      {stepBtn(
        "Report",
        screen === "report",
        false,
        "▤",
        () => { if (count > 0) onGoReport(); },
      )}

      <Box mt="auto" pt={16} px={12}>
        <Box style={{ height: 3, background: "#F5F5F5", borderRadius: 2, overflow: "hidden" }}>
          <Box style={{ height: "100%", width: `${Math.round((count / CRITERIA.length) * 100)}%`, background: "#E85D3D", borderRadius: 2, transition: "width 0.4s ease" }} />
        </Box>
        <Text style={{ fontSize: 11, color: "#A3A3A3", marginTop: 6 }}>
          {count} of {CRITERIA.length} complete
        </Text>
      </Box>
    </Box>
  );
}

/* ── Intro screen ─────────────────────────────────────────────────── */

function IntroScreen({
  proj,
  hasAnswers,
  onStart,
  onViewReport,
}: {
  proj: ProjectDetails;
  hasAnswers: boolean;
  onStart: (p: ProjectDetails) => void;
  onViewReport: () => void;
}) {
  const [form, setForm] = useState<ProjectDetails>(proj);
  const set = (k: keyof ProjectDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Box p={32} style={{ maxWidth: 720 }}>
      <Text style={{ fontSize: 22, fontWeight: 700, color: "#171717", letterSpacing: "-0.02em", marginBottom: 6 }}>
        Modality Choice Tool
      </Text>
      <Text style={{ fontSize: 14, color: "#374151", lineHeight: 1.65, marginBottom: 28, maxWidth: 500 }}>
        A streamlined assessment across 7 criteria to identify the most appropriate assistance modality for your programme. Takes around 10 minutes.
      </Text>

      <SimpleGrid cols={2} spacing={12} mb={12}>
        <Box>
          <Text style={{ fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4 }}>Project name</Text>
          <TextInput size="sm" placeholder="e.g. Emergency Response — North Kordofan" value={form.name} onChange={set("name")} styles={{ input: { fontSize: 13 } }} />
        </Box>
        <Box>
          <Text style={{ fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4 }}>Country</Text>
          <TextInput size="sm" placeholder="e.g. Sudan" value={form.country} onChange={set("country")} styles={{ input: { fontSize: 13 } }} />
        </Box>
        <Box>
          <Text style={{ fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4 }}>Donor</Text>
          <TextInput size="sm" placeholder="e.g. ECHO" value={form.donor} onChange={set("donor")} styles={{ input: { fontSize: 13 } }} />
        </Box>
        <Box>
          <Text style={{ fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4 }}>Duration</Text>
          <TextInput size="sm" placeholder="e.g. 12 months, Jan–Dec 2026" value={form.duration} onChange={set("duration")} styles={{ input: { fontSize: 13 } }} />
        </Box>
        <Box>
          <Text style={{ fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4 }}>Review team</Text>
          <TextInput size="sm" placeholder="e.g. Area Manager, Cash Specialist" value={form.team} onChange={set("team")} styles={{ input: { fontSize: 13 } }} />
        </Box>
      </SimpleGrid>
      <Box mb={24}>
        <Text style={{ fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4 }}>Project description & target population</Text>
        <Textarea size="sm" placeholder="Summarise objectives and the population you are reaching…" value={form.description} onChange={set("description")} minRows={3} styles={{ input: { fontSize: 13 } }} />
      </Box>

      <Group gap={10}>
        <Button
          size="sm"
          rightSection={<IconArrowRight size={14} />}
          style={{ background: "#E85D3D", border: "none", fontSize: 13 }}
          onClick={() => onStart(form)}
        >
          Begin assessment
        </Button>
        {hasAnswers && (
          <Button variant="default" size="sm" style={{ fontSize: 13 }} onClick={onViewReport}>
            View report
          </Button>
        )}
      </Group>
    </Box>
  );
}

/* ── Criterion screen ─────────────────────────────────────────────── */

function CriterionScreen({
  criterionIndex,
  ans,
  notes,
  onSetGrade,
  onSetNote,
  onBack,
  onNext,
  onSkip,
}: {
  criterionIndex: number;
  ans: AllAnswers;
  notes: AllNotes;
  onSetGrade: (criterionId: number, modCode: ModCode, grade: GradeKey) => void;
  onSetNote: (criterionId: number, note: string) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const c = CRITERIA[criterionIndex]!;
  const a = ans[c.id] ?? {};
  const scored = MODS.filter((m) => a[m.c]).length;
  const isLast = criterionIndex === CRITERIA.length - 1;

  return (
    <Box p={32} style={{ maxWidth: 800 }}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: "#E85D3D", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>
        {c.section} · criterion {c.id} of {CRITERIA.length}
      </Text>
      <Text style={{ fontSize: 20, fontWeight: 700, color: "#171717", lineHeight: 1.35, marginBottom: 6 }}>
        {c.question}
      </Text>
      <Text style={{ fontSize: 13, color: "#374151", lineHeight: 1.55, marginBottom: 24 }}>
        {c.sub}
      </Text>

      {/* Modality rating card */}
      <Box style={{ border: "1px solid #E5E5E5", borderRadius: 8, background: "#FFF", marginBottom: 20 }}>
        <Box px={16} py={10} style={{ borderBottom: "1px solid #E5E5E5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Rate each modality
          </Text>
          <Box
            style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
              background: scored === 5 ? "#dcfce7" : "#F5F5F5",
              color: scored === 5 ? "#16a34a" : "#737373",
            }}
          >
            {scored} / 5 rated
          </Box>
        </Box>

        {c.modalities.map((mod, mi) => (
          <Box
            key={mod.code}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 16px",
              borderBottom: mi < c.modalities.length - 1 ? "1px solid #F5F5F5" : "none",
              gap: 12,
            }}
          >
            <Text style={{ width: 90, flexShrink: 0, fontSize: 12, fontWeight: 600, color: "#171717" }}>
              {mod.name}
            </Text>
            <Group gap={6} wrap="wrap">
              {GRADES.map((g, gi) => (
                <GradePill
                  key={g.k}
                  gradeKey={g.k}
                  selected={a[mod.code] === g.k}
                  optionText={mod.options[gi]}
                  onClick={() => onSetGrade(c.id, mod.code, g.k)}
                />
              ))}
            </Group>
          </Box>
        ))}
      </Box>

      {/* Notes */}
      <Box mb={24}>
        <Text style={{ fontSize: 11, fontWeight: 600, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
          Additional notes / follow-up points
        </Text>
        <Textarea
          placeholder="Document discussion findings, data sources, or aspects requiring follow-up…"
          value={notes[c.id] ?? ""}
          onChange={(e) => onSetNote(c.id, e.currentTarget.value)}
          minRows={2}
          styles={{ input: { fontSize: 12 } }}
        />
      </Box>

      {/* Navigation */}
      <Box style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid #F5F5F5" }}>
        <Group gap={10}>
          {criterionIndex > 0 && (
            <Button variant="default" size="sm" leftSection={<IconArrowLeft size={13} />} style={{ fontSize: 12 }} onClick={onBack}>
              Back
            </Button>
          )}
          <Text style={{ fontSize: 12, color: "#A3A3A3" }}>
            <b style={{ color: "#525252" }}>{scored}</b> / 5 rated
          </Text>
        </Group>
        <Group gap={10}>
          <UnstyledButton onClick={onSkip} style={{ fontSize: 12, color: "#A3A3A3", textDecoration: "underline" }}>
            Skip
          </UnstyledButton>
          <Button
            size="sm"
            rightSection={<IconArrowRight size={13} />}
            style={{ background: "#E85D3D", border: "none", fontSize: 12 }}
            onClick={onNext}
          >
            {isLast ? "View report" : "Next"}
          </Button>
        </Group>
      </Box>
    </Box>
  );
}

/* ── Report screen ────────────────────────────────────────────────── */

function ReportScreen({
  proj,
  ans,
  notes,
  onBack,
}: {
  proj: ProjectDetails;
  ans: AllAnswers;
  notes: AllNotes;
  onBack: () => void;
}) {
  const sorted = getSortedModalities(ans);
  const winner = sorted[0]!;
  const n = answeredCount(ans);
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const delivType = DELIVERY_TYPE[winner.n] ?? "Direct";
  const mktApproach = MARKET_APPROACH[winner.n] ?? "Use Markets";

  const scoreRow = (entry: typeof sorted[0], isWinner: boolean) => (
    <Box key={entry.n} style={{ display: "grid", gridTemplateColumns: "140px 1fr 80px", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F5F5F5" }}>
      <Group gap={6}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: "#171717" }}>{entry.n}</Text>
        {isWinner && (
          <Box style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: "#FFF4EF", color: "#E85D3D", border: "1px solid #E85D3D40" }}>
            Recommended
          </Box>
        )}
      </Group>
      <Box style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Box style={{ flex: 1, height: 5, background: "#F5F5F5", borderRadius: 3, overflow: "hidden" }}>
          <Box style={{ height: "100%", width: `${entry.pct}%`, background: isWinner ? "#E85D3D" : "#D4D4D4", borderRadius: 3, transition: "width 0.8s ease" }} />
        </Box>
        <Text style={{ fontSize: 12, fontWeight: 700, width: 32, textAlign: "right", color: isWinner ? "#E85D3D" : "#737373" }}>
          {entry.pct}%
        </Text>
      </Box>
      <Text style={{ fontSize: 11, color: "#A3A3A3", textAlign: "right" }}>{entry.pts} / {CRITERIA.length * 3} pts</Text>
    </Box>
  );

  return (
    <Box p={32} style={{ maxWidth: 820 }}>
      <Group gap={8} mb={24}>
        <Button variant="default" size="sm" leftSection={<IconArrowLeft size={13} />} style={{ fontSize: 12 }} onClick={onBack}>
          Back to assessment
        </Button>
        <Button variant="default" size="sm" leftSection={<IconPrinter size={13} />} style={{ fontSize: 12 }} onClick={() => window.print()}>
          Print / save as PDF
        </Button>
      </Group>

      {/* Report page */}
      <Box style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: 8, padding: "32px 40px" }}>
        {/* Masthead */}
        <Box mb={24} pb={16} style={{ borderBottom: "2px solid #E85D3D" }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: "#171717" }}>Modality Choice Tool — Assessment Report</Text>
          <Text style={{ fontSize: 11, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 3 }}>
            Norwegian Refugee Council · CLEAR · {today}
          </Text>
        </Box>

        {/* Meta grid */}
        <Box mb={24} style={{ border: "1px solid #E5E5E5", borderRadius: 6, overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {[
            ["Project name", proj.name || "—"],
            ["Country", proj.country || "—"],
            ["Donor", proj.donor || "—"],
            ["Duration", proj.duration || "—"],
            ["Review team", proj.team || "—"],
            ["Criteria assessed", `${n} of ${CRITERIA.length}`],
          ].map(([label, value], i) => (
            <Box key={label} style={{ padding: "8px 14px", borderRight: i % 2 === 0 ? "1px solid #E5E5E5" : "none", borderBottom: i < 4 ? "1px solid #E5E5E5" : "none" }}>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</Text>
              <Text style={{ fontSize: 13, fontWeight: 600, color: "#171717" }}>{value}</Text>
            </Box>
          ))}
        </Box>

        {/* Project description */}
        {proj.description && (
          <Box mb={24}>
            <Box style={{ fontSize: 13, fontWeight: 700, background: "#F5F5F5", padding: "8px 12px", borderRadius: 4, borderLeft: "3px solid #E85D3D", marginBottom: 10 }}>
              Project description
            </Box>
            <Text style={{ fontSize: 13, color: "#374151", lineHeight: 1.65 }}>{proj.description}</Text>
          </Box>
        )}

        {/* Summary recommendation */}
        <Box mb={24}>
          <Box style={{ fontSize: 13, fontWeight: 700, background: "#F5F5F5", padding: "8px 12px", borderRadius: 4, borderLeft: "3px solid #E85D3D", marginBottom: 12 }}>
            Summary recommendation
          </Box>
          <Box mb={16} style={{ border: "1px solid #E85D3D40", background: "#FFF4EF", borderRadius: 6, padding: "12px 16px", fontSize: 13, color: "#7A3A10", lineHeight: 1.6 }}>
            Based on assessment across <b>{n} of {CRITERIA.length}</b> criteria, the recommended modality is{" "}
            <b style={{ color: "#E85D3D" }}>{winner.n}</b>. {RATIONALE[winner.n]}
          </Box>

          <Text style={{ fontSize: 11, fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Type of delivery</Text>
          <SimpleGrid cols={3} spacing={8} mb={16}>
            {["Direct", "Indirect", "Facilitative"].map((d) => (
              <Box key={d} style={{ border: `1px solid ${d === delivType ? "#E85D3D" : "#E5E5E5"}`, background: d === delivType ? "#FFF4EF" : "#FFF", borderRadius: 6, padding: "10px 12px", textAlign: "center" }}>
                <Text style={{ fontSize: 10, color: "#A3A3A3", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{d}</Text>
                <Text style={{ fontSize: 13, fontWeight: 700, color: d === delivType ? "#E85D3D" : "#D4D4D4" }}>{d === delivType ? "✓ Recommended" : "—"}</Text>
              </Box>
            ))}
          </SimpleGrid>

          <Text style={{ fontSize: 11, fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Market approach</Text>
          <SimpleGrid cols={3} spacing={8}>
            {["Use Markets", "Support Markets", "Change Markets"].map((a) => (
              <Box key={a} style={{ border: `1px solid ${a === mktApproach ? "#E85D3D" : "#E5E5E5"}`, background: a === mktApproach ? "#FFF4EF" : "#FFF", borderRadius: 6, padding: "10px 12px", textAlign: "center" }}>
                <Text style={{ fontSize: 10, color: "#A3A3A3", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{a}</Text>
                <Text style={{ fontSize: 13, fontWeight: 700, color: a === mktApproach ? "#E85D3D" : "#D4D4D4" }}>{a === mktApproach ? "✓ Recommended" : "—"}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        {/* Modality scores */}
        <Box mb={24}>
          <Box style={{ fontSize: 13, fontWeight: 700, background: "#F5F5F5", padding: "8px 12px", borderRadius: 4, borderLeft: "3px solid #E85D3D", marginBottom: 12 }}>
            Modality scores
          </Box>
          <Box style={{ border: "1px solid #E5E5E5", borderRadius: 6, padding: "4px 16px" }}>
            <Box style={{ display: "grid", gridTemplateColumns: "140px 1fr 80px", padding: "6px 0 8px", borderBottom: "1px solid #E5E5E5" }}>
              {["Modality", "Score", "Points"].map((h) => (
                <Text key={h} style={{ fontSize: 11, fontWeight: 700, color: "#A3A3A3", letterSpacing: "0.03em" }}>{h}</Text>
              ))}
            </Box>
            {sorted.map((e, i) => scoreRow(e, i === 0))}
          </Box>
        </Box>

        {/* Criterion-by-criterion */}
        <Box>
          <Box style={{ fontSize: 13, fontWeight: 700, background: "#F5F5F5", padding: "8px 12px", borderRadius: 4, borderLeft: "3px solid #E85D3D", marginBottom: 12 }}>
            Criterion-by-criterion assessment
          </Box>
          <Stack gap={10}>
            {CRITERIA.map((c) => {
              const a = ans[c.id] ?? {};
              const note = notes[c.id] ?? "";
              const para = c.modalities
                .map((mod) => {
                  const g = a[mod.code];
                  const gi = g ? ["A", "B", "C", "D"].indexOf(g) : -1;
                  return gi >= 0 ? mod.options[gi] : "";
                })
                .filter(Boolean)
                .join(" ");

              return (
                <Box key={c.id} style={{ border: "1px solid #E5E5E5", borderRadius: 6, overflow: "hidden" }}>
                  <Box style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F9FAFB", borderBottom: "1px solid #E5E5E5" }}>
                    <Box style={{ width: 20, height: 20, borderRadius: "50%", background: "#E85D3D", color: "#FFF", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {c.id}
                    </Box>
                    <Text style={{ fontSize: 13, fontWeight: 700, color: "#171717" }}>{c.label}</Text>
                  </Box>

                  {/* Per-modality ratings */}
                  <Box style={{ padding: "10px 12px", borderBottom: "1px solid #F5F5F5" }}>
                    <Stack gap={6}>
                      {MODS.map((m) => {
                        const g = a[m.c] as GradeKey | undefined;
                        const col = g ? GRADE_COLORS[g] : null;
                        return (
                          <Group key={m.c} gap={8}>
                            <Text style={{ fontSize: 11, fontWeight: 700, color: "#525252", width: 72, flexShrink: 0 }}>{m.n}</Text>
                            {g && col ? (
                              <Box style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, border: `1.5px solid ${col.border}`, background: col.bg, fontSize: 11, fontWeight: 600, color: col.color }}>
                                <Box style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                                {GRADE_LABELS[g]}
                              </Box>
                            ) : (
                              <Box style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, border: "1.5px solid #E5E5E5", background: "#F5F5F5", fontSize: 11, fontWeight: 600, color: "#A3A3A3" }}>
                                Not rated
                              </Box>
                            )}
                          </Group>
                        );
                      })}
                    </Stack>
                  </Box>

                  {para && (
                    <Box style={{ padding: "10px 12px", borderBottom: "1px solid #F5F5F5" }}>
                      <Text style={{ fontSize: 12, color: "#374151", lineHeight: 1.65 }}>{para}</Text>
                    </Box>
                  )}

                  <Box style={{ padding: "8px 12px", background: "#F9FAFB" }}>
                    <Text style={{ fontSize: 10, fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>Notes</Text>
                    <Text style={{ fontSize: 12, color: "#737373", fontStyle: note ? "normal" : "italic" }}>
                      {note || "No notes recorded."}
                    </Text>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

/* ── Main component ───────────────────────────────────────────────── */

export function ModalityChoiceTool() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [ci, setCi] = useState(0);
  const [proj, setProj] = useState<ProjectDetails>({ name: "", country: "", donor: "", duration: "", description: "", team: "" });
  const [ans, setAns] = useState<AllAnswers>({});
  const [notes, setNotes] = useState<AllNotes>({});

  const setGrade = (criterionId: number, modCode: ModCode, grade: GradeKey) => {
    setAns((prev) => {
      const existing = prev[criterionId]?.[modCode];
      return {
        ...prev,
        [criterionId]: {
          ...(prev[criterionId] ?? {}),
          [modCode]: existing === grade ? undefined : grade,
        },
      };
    });
  };

  const setNote = (criterionId: number, note: string) => {
    setNotes((prev) => ({ ...prev, [criterionId]: note }));
  };

  const goNext = () => {
    if (ci < CRITERIA.length - 1) { setCi(ci + 1); setScreen("survey"); }
    else setScreen("report");
  };

  const goBack = () => {
    if (ci > 0) { setCi(ci - 1); setScreen("survey"); }
  };

  return (
    <Box style={{ display: "flex", height: "calc(100vh - 130px)", border: "1px solid #E5E5E5", borderRadius: 8, overflow: "hidden" }}>
      <StepNav
        screen={screen}
        ci={ci}
        ans={ans}
        onGoIntro={() => setScreen("intro")}
        onGoStep={(i) => { setCi(i); setScreen("survey"); }}
        onGoReport={() => setScreen("report")}
      />
      <Box style={{ flex: 1, overflowY: "auto", background: "#FFF" }}>
        {screen === "intro" && (
          <IntroScreen
            proj={proj}
            hasAnswers={answeredCount(ans) > 0}
            onStart={(p) => { setProj(p); setCi(0); setScreen("survey"); }}
            onViewReport={() => setScreen("report")}
          />
        )}
        {screen === "survey" && (
          <CriterionScreen
            criterionIndex={ci}
            ans={ans}
            notes={notes}
            onSetGrade={setGrade}
            onSetNote={setNote}
            onBack={goBack}
            onNext={goNext}
            onSkip={goNext}
          />
        )}
        {screen === "report" && (
          <ReportScreen
            proj={proj}
            ans={ans}
            notes={notes}
            onBack={() => setScreen("survey")}
          />
        )}
      </Box>
    </Box>
  );
}
