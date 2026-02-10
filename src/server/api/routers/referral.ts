import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  encryptBeneficiaryData,
  decryptBeneficiaryData,
} from "~/server/services/secure-referral";

export const referralRouter = createTRPCRouter({
  // ── List referrals (sent or received by user's org context) ──────────
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum([
          "DRAFT", "SENT", "RECEIVED", "ACCEPTED", "IN_PROGRESS_REFERRAL",
          "COMPLETED", "REJECTED", "CANCELLED", "EXPIRED",
        ]).optional(),
        urgency: z.enum(["ROUTINE", "PRIORITY", "URGENT", "EMERGENCY"]).optional(),
        type: z.enum([
          "INDIVIDUAL_CASE", "FAMILY_CASE", "GROUP_REFERRAL",
          "EMERGENCY_TRANSFER", "INFORMATION_SHARING",
        ]).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).default({}),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status && { status: input.status }),
        ...(input.urgency && { urgency: input.urgency }),
        ...(input.type && { referralType: input.type }),
        ...(input.search && {
          OR: [
            { serviceRequested: { contains: input.search, mode: "insensitive" as const } },
            { notes: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const items = await ctx.db.referral.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
        include: {
          fromOrganization: { select: { id: true, name: true, organizationType: true } },
          toOrganization: { select: { id: true, name: true, organizationType: true } },
          sentBy: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true } },
          _count: { select: { consents: true } },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  // ── Get referral by ID (without decrypted data) ─────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const referral = await ctx.db.referral.findUnique({
        where: { id: input.id },
        include: {
          fromOrganization: true,
          toOrganization: true,
          sentBy: { select: { id: true, name: true, email: true } },
          receivedBy: { select: { id: true, name: true, email: true } },
          consents: true,
        },
      });

      if (!referral) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Referral not found" });
      }

      return referral;
    }),

  // ── Decrypt beneficiary data (separate procedure for access control) ─
  decryptData: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const referral = await ctx.db.referral.findUnique({
        where: { id: input.id },
        select: {
          beneficiaryData: true,
          encryptionIv: true,
          encryptionSalt: true,
          encryptionTag: true,
        },
      });

      if (!referral) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Referral not found" });
      }

      try {
        const decrypted = decryptBeneficiaryData({
          ciphertext: referral.beneficiaryData,
          iv: referral.encryptionIv,
          salt: referral.encryptionSalt,
          tag: referral.encryptionTag,
        });
        return decrypted;
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to decrypt beneficiary data. The encryption key may have changed.",
        });
      }
    }),

  // ── Create referral with encrypted beneficiary data ──────────────────
  create: protectedProcedure
    .input(
      z.object({
        referralType: z.enum([
          "INDIVIDUAL_CASE", "FAMILY_CASE", "GROUP_REFERRAL",
          "EMERGENCY_TRANSFER", "INFORMATION_SHARING",
        ]),
        urgency: z.enum(["ROUTINE", "PRIORITY", "URGENT", "EMERGENCY"]).default("ROUTINE"),
        fromOrganizationId: z.string(),
        toOrganizationId: z.string(),
        serviceRequested: z.string().min(1),
        beneficiaryData: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
        notes: z.string().optional(),
        expiresAt: z.string().datetime().optional(),
        consents: z.array(z.object({
          consentType: z.enum(["DATA_SHARING", "SERVICE_PROVISION", "CROSS_BORDER_TRANSFER", "THIRD_PARTY_DISCLOSURE"]),
          isGranted: z.boolean(),
          grantedBy: z.string().optional(),
          consentText: z.string().optional(),
        })).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const encrypted = encryptBeneficiaryData(input.beneficiaryData);

      const referral = await ctx.db.referral.create({
        data: {
          referralType: input.referralType,
          urgency: input.urgency,
          fromOrganizationId: input.fromOrganizationId,
          toOrganizationId: input.toOrganizationId,
          serviceRequested: input.serviceRequested,
          beneficiaryData: encrypted.ciphertext,
          encryptionIv: encrypted.iv,
          encryptionSalt: encrypted.salt,
          encryptionTag: encrypted.tag,
          notes: input.notes,
          sentById: ctx.session.user.id,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
          consents: input.consents
            ? {
                create: input.consents.map((c) => ({
                  ...c,
                  grantedAt: c.isGranted ? new Date() : undefined,
                })),
              }
            : undefined,
        },
        include: {
          fromOrganization: { select: { id: true, name: true } },
          toOrganization: { select: { id: true, name: true } },
        },
      });

      return referral;
    }),

  // ── Update referral status ──────────────────────────────────────────
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          "SENT", "RECEIVED", "ACCEPTED", "IN_PROGRESS_REFERRAL",
          "COMPLETED", "REJECTED", "CANCELLED",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const referral = await ctx.db.referral.findUnique({
        where: { id: input.id },
      });
      if (!referral) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Referral not found" });
      }

      const data: Record<string, unknown> = { status: input.status };
      if (input.status === "SENT") data.sentAt = new Date();
      if (input.status === "RECEIVED") {
        data.receivedAt = new Date();
        data.receivedById = ctx.session.user.id;
      }
      if (input.status === "COMPLETED") data.completedAt = new Date();

      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
      return ctx.db.referral.update({
        where: { id: input.id },
        data: data as any,
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
    }),

  // ── Partner organizations ───────────────────────────────────────────
  listPartners: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          "UN_AGENCY", "INGO", "LOCAL_NGO", "GOVERNMENT",
          "RED_CROSS_CRESCENT", "COMMUNITY_BASED", "PRIVATE_SECTOR", "OTHER_ORG",
        ]).optional(),
        activeOnly: z.boolean().default(true),
        search: z.string().optional(),
      }).default({}),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.partnerOrganization.findMany({
        where: {
          ...(input.activeOnly && { isActive: true }),
          ...(input.type && { organizationType: input.type }),
          ...(input.search && {
            name: { contains: input.search, mode: "insensitive" as const },
          }),
        },
        orderBy: { name: "asc" },
      });
    }),

  createPartner: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        organizationType: z.enum([
          "UN_AGENCY", "INGO", "LOCAL_NGO", "GOVERNMENT",
          "RED_CROSS_CRESCENT", "COMMUNITY_BASED", "PRIVATE_SECTOR", "OTHER_ORG",
        ]),
        sector: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        serviceTypes: z.array(z.string()).default([]),
        operationalAreas: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.partnerOrganization.create({
        data: {
          name: input.name,
          organizationType: input.organizationType,
          sector: input.sector,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          serviceTypes: input.serviceTypes,
          operationalAreas: input.operationalAreas,
        },
      });
    }),

  // ── Stats ───────────────────────────────────────────────────────────
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [total, byStatus, byUrgency, partners] = await Promise.all([
      ctx.db.referral.count(),
      ctx.db.referral.groupBy({ by: ["status"], _count: true }),
      ctx.db.referral.groupBy({ by: ["urgency"], _count: true }),
      ctx.db.partnerOrganization.count({ where: { isActive: true } }),
    ]);

    return { total, byStatus, byUrgency, partners };
  }),
});
