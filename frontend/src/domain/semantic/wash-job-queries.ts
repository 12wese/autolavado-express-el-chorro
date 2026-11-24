import { normalizeLicensePlate } from "@/domain/validators/vehicle-qr.validator";

export const ontologyTriplesQuery = `SELECT ?subject ?predicate ?object
WHERE { ?subject ?predicate ?object }
LIMIT 100`;

export interface WashJobSearchFilters {
  plate?: string;
  customer?: string;
  service?: string;
}

function literal(value: string | undefined): string {
  return JSON.stringify(value?.trim() ?? "");
}

export function washJobsQuery(filters: WashJobSearchFilters = {}): string {
  return `SELECT ?job ?plate ?vehicleType ?serviceType ?totalPrice ?createdAt ?status ?customer
WHERE {
  ?job ?typePredicate ?jobType .
  FILTER(REGEX(STR(?typePredicate), "type$", "i"))
  FILTER(REGEX(STR(?jobType), "TrabajoLavado$", "i"))

  ?job ?vehiclePredicate ?vehicle .
  FILTER(REGEX(STR(?vehiclePredicate), "tieneVehiculo$", "i"))
  ?vehicle ?platePredicate ?plate .
  FILTER(REGEX(STR(?platePredicate), "tienePlaca$", "i"))
  FILTER(CONTAINS(UCASE(STR(?plate)), UCASE(${literal(filters.plate)})))

  ?job ?vehicleTypePredicate ?vehicleTypeResource .
  FILTER(REGEX(STR(?vehicleTypePredicate), "tieneTipoVehiculo$", "i"))
  ?vehicleTypeResource ?vehicleCodePredicate ?vehicleType .
  FILTER(REGEX(STR(?vehicleCodePredicate), "codigoVehiculo$", "i"))

  ?job ?servicePredicate ?service .
  FILTER(REGEX(STR(?servicePredicate), "incluyeServicio$", "i"))
  ?service ?serviceCodePredicate ?serviceType .
  FILTER(REGEX(STR(?serviceCodePredicate), "codigoServicio$", "i"))
  FILTER(CONTAINS(UCASE(STR(?serviceType)), UCASE(${literal(filters.service)})))

  ?job ?statusPredicate ?statusResource .
  FILTER(REGEX(STR(?statusPredicate), "tieneEstado$", "i"))
  ?statusResource ?statusCodePredicate ?status .
  FILTER(REGEX(STR(?statusCodePredicate), "codigoEstado$", "i"))

  ?job ?pricePredicate ?totalPrice .
  FILTER(REGEX(STR(?pricePredicate), "precio$", "i"))
  ?job ?createdAtPredicate ?createdAt .
  FILTER(REGEX(STR(?createdAtPredicate), "fechaCreacion$", "i"))

  OPTIONAL {
    ?job ?customerPredicate ?customerValue .
    FILTER(REGEX(STR(?customerPredicate), "(nombreCliente|cliente)$", "i"))
  }
  BIND(COALESCE(STR(?customerValue), "") AS ?customer)
  FILTER(CONTAINS(UCASE(STR(?customer)), UCASE(${literal(filters.customer)})))
}
ORDER BY DESC(?createdAt)
LIMIT 100`;
}

export const initialCustomQuery = ontologyTriplesQuery;

export function historyByPlateQuery(plate: string): string {
  const normalizedPlate = normalizeLicensePlate(plate);
  if (!normalizedPlate) throw new Error("Vehicle plate is required.");
  return washJobsQuery({ plate: normalizedPlate });
}
