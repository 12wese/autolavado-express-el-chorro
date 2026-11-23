import { normalizeLicensePlate } from "@/domain/validators/vehicle-qr.validator";

const ontologyPrefix = "PREFIX : <https://elchorro.example/ontologia#>";

export const ontologyTriplesQuery = `${ontologyPrefix}
SELECT ?subject ?predicate ?object
WHERE { ?subject ?predicate ?object }
LIMIT 100`;

export const washJobsQuery = `${ontologyPrefix}
SELECT ?job ?plate ?vehicleType ?serviceType ?totalPrice ?createdAt ?status
WHERE {
  ?job a :TrabajoLavado ;
    :tieneVehiculo ?vehicle ;
    :tieneTipoVehiculo ?vehicleTypeResource ;
    :incluyeServicio ?service ;
    :tieneEstado ?statusResource ;
    :precio ?totalPrice ;
    :fechaCreacion ?createdAt .
  ?vehicle :tienePlaca ?plate .
  ?vehicleTypeResource :codigoVehiculo ?vehicleType .
  ?service :codigoServicio ?serviceType .
  ?statusResource :codigoEstado ?status .
}
ORDER BY DESC(?createdAt)
LIMIT 100`;

export function historyByPlateQuery(plate: string): string {
  const normalizedPlate = normalizeLicensePlate(plate);
  if (!normalizedPlate) throw new Error("Vehicle plate is required.");

  return `${ontologyPrefix}
SELECT ?job ?createdAt ?serviceType ?totalPrice ?status
WHERE {
  ?job a :TrabajoLavado ;
    :tieneVehiculo ?vehicle ;
    :incluyeServicio ?service ;
    :tieneEstado ?statusResource ;
    :precio ?totalPrice ;
    :fechaCreacion ?createdAt .
  ?vehicle :tienePlaca ${JSON.stringify(normalizedPlate)} .
  ?service :codigoServicio ?serviceType .
  ?statusResource :codigoEstado ?status .
}
ORDER BY DESC(?createdAt)`;
}

export const initialCustomQuery = ontologyTriplesQuery;
