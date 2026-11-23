import { describe, expect, it } from "vitest";
import { mapWashJobToSparqlUpdate } from "./wash-job-rdf.mapper";

const washJob = {
  id: "job-123",
  plate: "abc-123",
  vehicleType: "Automóvil",
  serviceType: "Lavada General, Lavada + Polichada",
  totalPrice: 35000,
  createdAt: "2026-11-20T15:00:00.000Z",
  status: "completed",
};

describe("mapWashJobToSparqlUpdate", () => {
  it("maps a wash job and its vehicle using the ontology vocabulary", () => {
    const update = mapWashJobToSparqlUpdate(washJob);

    expect(update).toContain("PREFIX : <https://elchorro.example/ontologia#>");
    expect(update).toContain("a :TrabajoLavado");
    expect(update).toContain(":tieneVehiculo");
    expect(update).toContain("a :Vehiculo");
    expect(update).toContain(':tienePlaca "ABC123"');
    expect(update).toContain(":tieneTipoVehiculo :Automovil");
    expect(update).toContain(":incluyeServicio :LavadaGeneral, :LavadaPolichada");
    expect(update).toContain(":tieneEstado :Completado");
    expect(update).toContain('"35000.00"^^xsd:decimal');
    expect(update).toContain('"2026-11-20T15:00:00.000Z"^^xsd:dateTime');
  });

  it("escapes dynamic ontology literals and assigns unknown catalog values", () => {
    const update = mapWashJobToSparqlUpdate({
      ...washJob,
      vehicleType: 'SUV "XL"',
      serviceType: 'Servicio "Especial"',
      status: "paused",
    });

    expect(update).toContain(':codigoVehiculo "SUV \\"XL\\""');
    expect(update).toContain(':codigoServicio "Servicio \\"Especial\\""');
    expect(update).toContain(':codigoEstado "paused"');
  });

  it("rejects invalid records rather than emitting malformed RDF", () => {
    expect(() => mapWashJobToSparqlUpdate({ ...washJob, totalPrice: Number.NaN }))
      .toThrow("Wash job total price must be a non-negative number.");
    expect(() => mapWashJobToSparqlUpdate({ ...washJob, createdAt: "invalid" }))
      .toThrow("Wash job creation date must be valid.");
  });
});
