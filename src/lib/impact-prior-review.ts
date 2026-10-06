/**
 * Impact prior review (clear-api ADR-0010, V2): what the client mirrors of
 * clear-api's `decideImpactPrior` rules. The server is the gate; these
 * only let the UI say no before a round trip.
 */

/** clear-api's cap on a decision rationale. */
export const MAX_RATIONALE_LENGTH = 4000;
