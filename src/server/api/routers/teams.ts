import { z } from "zod";
import { createTRPCRouter, protectedProcedure, orgAdminProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type {
  Organisation,
  OrgMember,
  Team,
  TeamMember,
  TeamLocation,
} from "~/lib/types/teams";

// ── Query fragments ────────────────────────────────────────

const MY_ORGANISATIONS_QUERY = `
  query MyOrganisations {
    myOrganisations {
      id name slug isActive
      teams { id name slug }
    }
  }
`;

const MY_TEAMS_QUERY = `
  query MyTeams {
    myTeams {
      id name slug description
      organisation { id name }
      locations { id name level }
    }
  }
`;

const ORGANISATION_QUERY = `
  query Organisation($id: String!) {
    organisation(id: $id) {
      id name slug isActive
      teams { id name slug description }
      members {
        id
        user { id name email }
        role
        createdAt
      }
    }
  }
`;

const TEAM_QUERY = `
  query Team($id: String!) {
    team(id: $id) {
      id name slug description
      organisation { id name }
      members {
        id
        user { id name email }
        role
        createdAt
      }
      locations { id name level }
    }
  }
`;

const LOCATIONS_QUERY = `
  query Locations($level: Int) {
    locations(level: $level) {
      id name level
      children { id name level }
    }
  }
`;

// ── Mutation fragments ─────────────────────────────────────

const CREATE_ORGANISATION = `
  mutation CreateOrganisation($input: CreateOrganisationInput!) {
    createOrganisation(input: $input) { id name slug }
  }
`;

const UPDATE_ORGANISATION = `
  mutation UpdateOrganisation($id: String!, $input: UpdateOrganisationInput!) {
    updateOrganisation(id: $id, input: $input) { id name slug isActive }
  }
`;

const DELETE_ORGANISATION = `
  mutation DeleteOrganisation($id: String!) {
    deleteOrganisation(id: $id)
  }
`;

const ADD_ORG_MEMBER = `
  mutation AddOrgMember($orgId: String!, $userId: String!, $role: OrgMemberRole) {
    addOrgMember(orgId: $orgId, userId: $userId, role: $role) {
      id user { id name email } role
    }
  }
`;

const REMOVE_ORG_MEMBER = `
  mutation RemoveOrgMember($orgId: String!, $userId: String!) {
    removeOrgMember(orgId: $orgId, userId: $userId)
  }
`;

const CREATE_TEAM = `
  mutation CreateTeam($input: CreateTeamInput!) {
    createTeam(input: $input) { id name slug }
  }
`;

const UPDATE_TEAM = `
  mutation UpdateTeam($id: String!, $input: UpdateTeamInput!) {
    updateTeam(id: $id, input: $input) { id name slug description }
  }
`;

const DELETE_TEAM = `
  mutation DeleteTeam($id: String!) {
    deleteTeam(id: $id)
  }
`;

const ADD_TEAM_MEMBER = `
  mutation AddTeamMember($teamId: String!, $userId: String!, $role: String) {
    addTeamMember(teamId: $teamId, userId: $userId, role: $role) {
      id user { id name email } role
    }
  }
`;

const REMOVE_TEAM_MEMBER = `
  mutation RemoveTeamMember($teamId: String!, $userId: String!) {
    removeTeamMember(teamId: $teamId, userId: $userId)
  }
`;

const UPDATE_TEAM_MEMBER_ROLE = `
  mutation UpdateTeamMemberRole($teamId: String!, $userId: String!, $role: String!) {
    updateTeamMemberRole(teamId: $teamId, userId: $userId, role: $role) { id role }
  }
`;

const SET_TEAM_LOCATIONS = `
  mutation SetTeamLocations($teamId: String!, $locationIds: [String!]!) {
    setTeamLocations(teamId: $teamId, locationIds: $locationIds) {
      id locations { id name level }
    }
  }
`;

const SET_DEFAULT_TEAM = `
  mutation SetDefaultTeam($teamId: String!) {
    setDefaultTeam(teamId: $teamId) { id name }
  }
`;

// ── Router ─────────────────────────────────────────────────

export const teamsRouter = createTRPCRouter({
  // ── Queries ──────────────────────────────────────────────

  myOrganisations: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ myOrganisations: Organisation[] }>(
      MY_ORGANISATIONS_QUERY,
      {},
      cookieHeaders(ctx),
    );
    return data.myOrganisations;
  }),

  myTeams: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ myTeams: Team[] }>(
      MY_TEAMS_QUERY,
      {},
      cookieHeaders(ctx),
    );
    return data.myTeams;
  }),

  organisation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ organisation: Organisation }>(
        ORGANISATION_QUERY,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.organisation;
    }),

  team: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ team: Team }>(
        TEAM_QUERY,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.team;
    }),

  locations: protectedProcedure
    .input(z.object({ level: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ locations: TeamLocation[] }>(
        LOCATIONS_QUERY,
        { level: input?.level },
        cookieHeaders(ctx),
      );
      return data.locations;
    }),

  // ── Mutations ────────────────────────────────────────────

  createOrganisation: orgAdminProcedure
    .input(z.object({ name: z.string(), slug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ createOrganisation: Organisation }>(
        CREATE_ORGANISATION,
        { input },
        cookieHeaders(ctx),
      );
      return data.createOrganisation;
    }),

  updateOrganisation: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), slug: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      const data = await graphqlFetch<{ updateOrganisation: Organisation }>(
        UPDATE_ORGANISATION,
        { id, input: fields },
        cookieHeaders(ctx),
      );
      return data.updateOrganisation;
    }),

  deleteOrganisation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ deleteOrganisation: boolean }>(
        DELETE_ORGANISATION,
        input,
        cookieHeaders(ctx),
      );
      return data.deleteOrganisation;
    }),

  addOrgMember: protectedProcedure
    .input(z.object({ orgId: z.string(), userId: z.string(), role: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ addOrgMember: OrgMember }>(
        ADD_ORG_MEMBER,
        input,
        cookieHeaders(ctx),
      );
      return data.addOrgMember;
    }),

  removeOrgMember: protectedProcedure
    .input(z.object({ orgId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ removeOrgMember: boolean }>(
        REMOVE_ORG_MEMBER,
        input,
        cookieHeaders(ctx),
      );
      return data.removeOrgMember;
    }),

  createTeam: protectedProcedure
    .input(z.object({
      organisationId: z.string(),
      name: z.string(),
      slug: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ createTeam: Team }>(
        CREATE_TEAM,
        { input },
        cookieHeaders(ctx),
      );
      return data.createTeam;
    }),

  updateTeam: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      const data = await graphqlFetch<{ updateTeam: Team }>(
        UPDATE_TEAM,
        { id, input: fields },
        cookieHeaders(ctx),
      );
      return data.updateTeam;
    }),

  deleteTeam: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ deleteTeam: boolean }>(
        DELETE_TEAM,
        input,
        cookieHeaders(ctx),
      );
      return data.deleteTeam;
    }),

  addTeamMember: protectedProcedure
    .input(z.object({ teamId: z.string(), userId: z.string(), role: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ addTeamMember: TeamMember }>(
        ADD_TEAM_MEMBER,
        input,
        cookieHeaders(ctx),
      );
      return data.addTeamMember;
    }),

  removeTeamMember: protectedProcedure
    .input(z.object({ teamId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ removeTeamMember: boolean }>(
        REMOVE_TEAM_MEMBER,
        input,
        cookieHeaders(ctx),
      );
      return data.removeTeamMember;
    }),

  updateTeamMemberRole: protectedProcedure
    .input(z.object({ teamId: z.string(), userId: z.string(), role: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ updateTeamMemberRole: TeamMember }>(
        UPDATE_TEAM_MEMBER_ROLE,
        input,
        cookieHeaders(ctx),
      );
      return data.updateTeamMemberRole;
    }),

  setTeamLocations: protectedProcedure
    .input(z.object({ teamId: z.string(), locationIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ setTeamLocations: Team }>(
        SET_TEAM_LOCATIONS,
        input,
        cookieHeaders(ctx),
      );
      return data.setTeamLocations;
    }),

  setDefaultTeam: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ setDefaultTeam: Team }>(
        SET_DEFAULT_TEAM,
        input,
        cookieHeaders(ctx),
      );
      return data.setDefaultTeam;
    }),
});
