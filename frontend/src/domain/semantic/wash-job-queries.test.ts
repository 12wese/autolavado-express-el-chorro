import { describe, expect, it } from "vitest";
import {
  historyByPlateQuery,
  ontologyTriplesQuery,
  washJobsQuery,
} from "./wash-job-queries";

describe("semantic graph SPARQL queries", () => {
  it("finds ontology triples without requiring a namespace prefix", () => {
    expect(ontologyTriplesQuery).not.toContain("PREFIX");
    expect(ontologyTriplesQuery).toContain("?subject ?predicate ?object");
  });

  it("matches wash job vocabulary by predicate and type suffixes", () => {
    const query = washJobsQuery();

    expect(query).not.toContain("PREFIX");
    expect(query).toContain('REGEX(STR(?jobType), "TrabajoLavado$", "i")');
    expect(query).toContain('REGEX(STR(?platePredicate), "tienePlaca$", "i")');
    expect(query).toContain('REGEX(STR(?serviceCodePredicate), "codigoServicio$", "i")');
  });

  it("uses case-insensitive contains filters for plate, customer and service", () => {
    const query = washJobsQuery({
      plate: "abC123",
      customer: "Ana",
      service: "lavada",
    });

    expect(query).toContain('CONTAINS(UCASE(STR(?plate)), UCASE("abC123"))');
    expect(query).toContain('CONTAINS(UCASE(STR(?customer)), UCASE("Ana"))');
    expect(query).toContain('CONTAINS(UCASE(STR(?serviceType)), UCASE("lavada"))');
  });

  it("normalizes the plate filter and keeps it case-insensitive", () => {
    const query = historyByPlateQuery("abc-123");

    expect(query).toContain('CONTAINS(UCASE(STR(?plate)), UCASE("ABC123"))');
  });
});
