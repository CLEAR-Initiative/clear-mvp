import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

const questionInput = z.object({
  questionText: z.string().min(1),
  questionType: z.enum([
    "TEXT", "TEXTAREA", "NUMBER", "DATE",
    "SINGLE_CHOICE", "MULTIPLE_CHOICE", "SCALE", "LOCATION", "BOOLEAN",
  ]),
  isRequired: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  validationRules: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  helpText: z.string().optional(),
});

export const surveyRouter = createTRPCRouter({
  // ---- TEMPLATES ----

  templates: protectedProcedure
    .input(
      z.object({
        category: z.enum([
          "RAPID_ASSESSMENT", "MONITORING", "EVALUATION", "FEEDBACK",
          "REGISTRATION", "NEEDS_ASSESSMENT", "POST_DISTRIBUTION",
          "BASELINE", "ENDLINE", "OTHER",
        ]).optional(),
        isActive: z.boolean().optional(),
      }).default({}),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.surveyTemplate.findMany({
        where: {
          ...(input.category && { category: input.category }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { questions: true, surveys: true } },
          createdBy: { select: { name: true } },
        },
      });
    }),

  templateById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.surveyTemplate.findUnique({
        where: { id: input.id },
        include: {
          questions: { orderBy: { questionNumber: "asc" } },
          surveys: {
            orderBy: { createdAt: "desc" },
            include: { _count: { select: { submissions: true } } },
          },
          createdBy: { select: { name: true } },
        },
      });

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      return template;
    }),

  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(5000).optional(),
        category: z.enum([
          "RAPID_ASSESSMENT", "MONITORING", "EVALUATION", "FEEDBACK",
          "REGISTRATION", "NEEDS_ASSESSMENT", "POST_DISTRIBUTION",
          "BASELINE", "ENDLINE", "OTHER",
        ]),
        estimatedDuration: z.number().int().min(1).optional(),
        questions: z.array(questionInput).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { questions, ...templateData } = input;

      return ctx.db.surveyTemplate.create({
        data: {
          ...templateData,
          createdById: ctx.session.user.id,
          questions: {
            create: questions.map((q, i) => {
              const question: {
                questionNumber: number;
                questionText: string;
                questionType: typeof q.questionType;
                isRequired: boolean;
                options?: string[];
                validationRules?: Record<string, unknown>;
                helpText?: string;
              } = {
                questionNumber: i + 1,
                questionText: q.questionText,
                questionType: q.questionType,
                isRequired: q.isRequired,
                helpText: q.helpText,
              };
              if (q.options) question.options = q.options;
              if (q.validationRules) question.validationRules = q.validationRules;
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
              return question as any;
            }),
          },
        },
        include: {
          questions: { orderBy: { questionNumber: "asc" } },
        },
      });
    }),

  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).nullable().optional(),
        category: z.enum([
          "RAPID_ASSESSMENT", "MONITORING", "EVALUATION", "FEEDBACK",
          "REGISTRATION", "NEEDS_ASSESSMENT", "POST_DISTRIBUTION",
          "BASELINE", "ENDLINE", "OTHER",
        ]).optional(),
        estimatedDuration: z.number().int().min(1).nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.surveyTemplate.update({ where: { id }, data });
    }),

  // ---- QUESTIONS (manage within a template) ----

  addQuestion: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        ...questionInput.shape,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { templateId, ...questionData } = input;

      // Get next question number
      const lastQuestion = await ctx.db.surveyQuestion.findFirst({
        where: { templateId },
        orderBy: { questionNumber: "desc" },
      });

      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
      return ctx.db.surveyQuestion.create({
        data: {
          templateId,
          questionNumber: (lastQuestion?.questionNumber ?? 0) + 1,
          questionText: questionData.questionText,
          questionType: questionData.questionType,
          isRequired: questionData.isRequired,
          options: questionData.options ?? undefined,
          validationRules: questionData.validationRules ?? undefined,
          helpText: questionData.helpText,
        } as any,
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
    }),

  updateQuestion: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        questionText: z.string().min(1).optional(),
        questionType: z.enum([
          "TEXT", "TEXTAREA", "NUMBER", "DATE",
          "SINGLE_CHOICE", "MULTIPLE_CHOICE", "SCALE", "LOCATION", "BOOLEAN",
        ]).optional(),
        isRequired: z.boolean().optional(),
        options: z.array(z.string()).nullable().optional(),
        validationRules: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).nullable().optional(),
        helpText: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      return ctx.db.surveyQuestion.update({ where: { id }, data: data as any });
    }),

  deleteQuestion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.surveyQuestion.delete({ where: { id: input.id } });
    }),

  // ---- SURVEYS (deployed instances) ----

  surveys: protectedProcedure
    .input(
      z.object({
        status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
        crisisId: z.string().optional(),
      }).default({}),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.survey.findMany({
        where: {
          ...(input.status && { status: input.status }),
          ...(input.crisisId && { crisisId: input.crisisId }),
        },
        orderBy: { createdAt: "desc" },
        include: {
          template: { select: { name: true, category: true } },
          crisis: { select: { id: true, title: true } },
          _count: { select: { submissions: true } },
          createdBy: { select: { name: true } },
        },
      });
    }),

  deploySurvey: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        title: z.string().min(1).max(200),
        description: z.string().max(5000).optional(),
        crisisId: z.string().optional(),
        targetResponses: z.number().int().min(1).optional(),
        isAnonymous: z.boolean().default(true),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify template exists
      const template = await ctx.db.surveyTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      return ctx.db.survey.create({
        data: {
          ...input,
          status: "ACTIVE",
          deployedAt: new Date(),
          createdById: ctx.session.user.id,
        },
      });
    }),

  updateSurveyStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.survey.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === "COMPLETED" && { completedAt: new Date() }),
        },
      });
    }),

  // ---- SUBMISSIONS & RESPONSES ----

  submitResponse: protectedProcedure
    .input(
      z.object({
        surveyId: z.string(),
        responses: z.array(
          z.object({
            questionId: z.string(),
            responseText: z.string().optional(),
            responseNumber: z.number().optional(),
            responseBoolean: z.boolean().optional(),
            responseDate: z.date().optional(),
            responseJson: z.unknown().optional(),
            isSkipped: z.boolean().default(false),
          }),
        ),
        location: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const survey = await ctx.db.survey.findUnique({
        where: { id: input.surveyId },
      });
      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Survey not found" });
      }
      if (survey.status !== "ACTIVE") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Survey is not active" });
      }

      return ctx.db.surveySubmission.create({
        data: {
          surveyId: input.surveyId,
          respondentId: ctx.session.user.id,
          status: "COMPLETED",
          submittedAt: new Date(),
          isComplete: true,
          location: input.location,
          latitude: input.latitude,
          longitude: input.longitude,
          responses: {
            create: input.responses.map((r) => ({
              surveyId: input.surveyId,
              questionId: r.questionId,
              responseText: r.responseText,
              responseNumber: r.responseNumber,
              responseBoolean: r.responseBoolean,
              responseDate: r.responseDate,
              responseJson: r.responseJson ?? undefined,
              isSkipped: r.isSkipped,
            })),
          },
        },
        include: { responses: true },
      });
    }),

  surveyResponses: protectedProcedure
    .input(z.object({ surveyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const survey = await ctx.db.survey.findUnique({
        where: { id: input.surveyId },
        include: {
          template: {
            include: { questions: { orderBy: { questionNumber: "asc" } } },
          },
          submissions: {
            where: { isComplete: true },
            orderBy: { submittedAt: "desc" },
            include: { responses: true },
          },
        },
      });

      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Survey not found" });
      }

      return survey;
    }),
});
