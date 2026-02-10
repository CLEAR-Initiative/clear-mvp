import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import * as kobo from "~/server/services/kobotoolbox";

export const koboRouter = createTRPCRouter({
  // ── Test connection ─────────────────────────────────────────────────
  validateConnection: protectedProcedure.query(async () => {
    try {
      return await kobo.validateConnection();
    } catch {
      return { connected: false, serverUrl: "" };
    }
  }),

  // ── List KoBo forms ─────────────────────────────────────────────────
  listAssets: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).default({}),
    )
    .query(async ({ input }) => {
      return kobo.listAssets(input.limit, input.offset);
    }),

  // ── Export CLEAR survey to KoBo ─────────────────────────────────────
  exportSurvey: protectedProcedure
    .input(z.object({ surveyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Find the deployed survey and its template questions
      const survey = await ctx.db.survey.findUnique({
        where: { id: input.surveyId },
        include: {
          template: {
            include: {
              questions: { orderBy: { questionNumber: "asc" } },
            },
          },
        },
      });

      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Survey not found" });
      }

      // Export to KoBo
      const result = await kobo.exportSurvey({
        title: survey.title,
        questions: survey.template.questions.map((q) => ({
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          questionType: q.questionType,
          isRequired: q.isRequired,
          options: q.options,
        })),
      });

      // Deploy the asset on KoBo
      await kobo.deployAsset(result.uid);

      // Track the deployment in our DB
      const deployment = await ctx.db.koboDeployment.create({
        data: {
          surveyId: input.surveyId,
          koboAssetUid: result.uid,
          koboFormTitle: result.name,
          deploymentUrl: result.url,
          syncStatus: "PENDING",
        },
      });

      return deployment;
    }),

  // ── Sync responses from KoBo into CLEAR ─────────────────────────────
  syncResponses: protectedProcedure
    .input(z.object({ deploymentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deployment = await ctx.db.koboDeployment.findUnique({
        where: { id: input.deploymentId },
        include: {
          survey: {
            include: {
              template: {
                include: { questions: { orderBy: { questionNumber: "asc" } } },
              },
            },
          },
        },
      });

      if (!deployment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
      }

      // Update sync status
      await ctx.db.koboDeployment.update({
        where: { id: input.deploymentId },
        data: { syncStatus: "SYNCING" },
      });

      try {
        // Fetch submissions from KoBo (since last sync)
        const submissions = await kobo.getSubmissions(
          deployment.koboAssetUid,
          {
            sinceDate: deployment.lastSyncedAt?.toISOString(),
          },
        );

        const questions = deployment.survey.template.questions;
        let imported = 0;

        for (const sub of submissions.results) {
          // Create a SurveySubmission for each KoBo submission
          const geo = sub._geolocation;
          const submission = await ctx.db.surveySubmission.create({
            data: {
              surveyId: deployment.surveyId,
              respondentId: sub._id ? String(sub._id) : undefined,
              status: "COMPLETED",
              isComplete: true,
              submittedAt: sub._submission_time
                ? new Date(sub._submission_time)
                : new Date(),
              latitude: geo?.[0] ?? undefined,
              longitude: geo?.[1] ?? undefined,
            },
          });

          // Map KoBo answers to SurveyResponse records
          for (const q of questions) {
            const koboKey = `q${q.questionNumber}`;
            const answer = sub[koboKey];
            if (answer === undefined || answer === null) continue;

            const responseBase = {
              surveyId: deployment.surveyId,
              submissionId: submission.id,
              questionId: q.id,
            };

            if (q.questionType === "NUMBER" || q.questionType === "SCALE") {
              await ctx.db.surveyResponse.create({
                data: { ...responseBase, responseNumber: Number(answer) },
              });
            } else if (q.questionType === "MULTIPLE_CHOICE") {
              const jsonVal = typeof answer === "string" ? answer.split(" ") : [answer];
              await ctx.db.surveyResponse.create({
                data: { ...responseBase, responseJson: jsonVal },
              });
            } else {
              await ctx.db.surveyResponse.create({
                data: {
                  ...responseBase,
                  responseText: typeof answer === "string" ? answer : JSON.stringify(answer),
                },
              });
            }
          }

          imported++;
        }

        // Update deployment status
        await ctx.db.koboDeployment.update({
          where: { id: input.deploymentId },
          data: {
            syncStatus: "SYNCED",
            lastSyncedAt: new Date(),
            submissionCount: { increment: imported },
            syncError: null,
          },
        });

        return { imported, total: submissions.count };
      } catch (err) {
        await ctx.db.koboDeployment.update({
          where: { id: input.deploymentId },
          data: {
            syncStatus: "FAILED",
            syncError: err instanceof Error ? err.message : "Unknown error",
          },
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync KoBo responses",
        });
      }
    }),

  // ── List deployments for a survey ───────────────────────────────────
  listDeployments: protectedProcedure
    .input(z.object({ surveyId: z.string().optional() }).default({}))
    .query(async ({ ctx, input }) => {
      return ctx.db.koboDeployment.findMany({
        where: input.surveyId ? { surveyId: input.surveyId } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          survey: { select: { id: true, title: true } },
        },
      });
    }),
});
