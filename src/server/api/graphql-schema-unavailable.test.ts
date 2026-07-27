import { describe, expect, it } from "vitest";
import { isGraphqlSchemaUnavailable } from "./graphql-schema-unavailable";

describe("isGraphqlSchemaUnavailable", () => {
  it("detects missing GraphQL fields", () => {
    expect(
      isGraphqlSchemaUnavailable(
        new Error('Cannot query field "locationChallenge" on type "Signal".'),
      ),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isGraphqlSchemaUnavailable(new Error("must be logged in"))).toBe(false);
  });
});
