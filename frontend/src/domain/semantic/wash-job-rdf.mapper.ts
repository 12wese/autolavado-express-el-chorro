import { normalizeLicensePlate } from "@/domain/validators/vehicle-qr.validator";

const ontologyNamespace = "https://elchorro.example/ontologia#";

export interface WashJobRdfInput {
  id: string;
  plate: string;
  vehicleType: string;
  serviceType: string;
  totalPrice: number;
  createdAt: string;
  status: string;
}

interface OntologyIndividual {
  term: string;
  declaration: string | null;
}

const vehicleTypeIndividuals: Record<string, string> = {
  automovil: "Automovil",
  camioneta: "Camioneta",
  moto: "Moto",
  suv: "SUV",
  pickup: "Pickup",
  van: "Van",
};

const serviceIndividuals: Record<string, string> = {
  lavadageneral: "LavadaGeneral",
  lavadasencilla: "LavadaSencilla",
  latazo: "Latazo",
  quitadadeasfalto: "QuitadaDeAsfalto",
  lavada: "Lavada",
  lavadadesengrasada: "LavadaDesengrasada",
  lavadapolichada: "LavadaPolichada",
};

const statusIndividuals: Record<string, string> = {
  pending: "Pendiente",
  pendiente: "Pendiente",
  inprogress: "EnProceso",
  enproceso: "EnProceso",
  completed: "Completado",
  completado: "Completado",
  delivered: "Entregado",
  entregado: "Entregado",
};

function normalizeCode(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function encodeLocalName(value: string): string {
  return Array.from(new TextEncoder().encode(value), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function toLiteral(value: string): string {
  return JSON.stringify(value);
}

function getIndividual(
  value: string,
  knownIndividuals: Record<string, string>,
  generatedPrefix: string,
  className: string,
  codeProperty: string,
): OntologyIndividual {
  const normalizedValue = value.trim();
  const knownIndividual = knownIndividuals[normalizeCode(normalizedValue)];
  if (knownIndividual) {
    return { term: `:${knownIndividual}`, declaration: null };
  }

  const individual = `${generatedPrefix}_${encodeLocalName(normalizedValue)}`;
  return {
    term: `:${individual}`,
    declaration: `:${individual} a :${className} ;
    :${codeProperty} ${toLiteral(normalizedValue)} ;
    rdfs:label ${toLiteral(normalizedValue)}@es .`,
  };
}

export function mapWashJobToSparqlUpdate(washJob: WashJobRdfInput): string {
  if (!washJob.id.trim()) throw new Error("Wash job ID is required.");
  if (!washJob.plate.trim()) throw new Error("Vehicle plate is required.");
  if (!washJob.vehicleType.trim()) throw new Error("Vehicle type is required.");
  if (!washJob.serviceType.trim()) throw new Error("Service type is required.");
  if (!washJob.status.trim()) throw new Error("Wash status is required.");
  if (!Number.isFinite(washJob.totalPrice) || washJob.totalPrice < 0) {
    throw new Error("Wash job total price must be a non-negative number.");
  }

  const plate = normalizeLicensePlate(washJob.plate);
  if (!plate) throw new Error("Vehicle plate is required.");
  const createdAt = new Date(washJob.createdAt);
  if (!Number.isFinite(createdAt.getTime())) {
    throw new Error("Wash job creation date must be valid.");
  }

  const vehicleType = getIndividual(
    washJob.vehicleType,
    vehicleTypeIndividuals,
    "TipoVehiculo",
    "TipoVehiculo",
    "codigoVehiculo",
  );
  const serviceTypes = washJob.serviceType.split(",").map((service) => service.trim()).filter(Boolean);
  if (serviceTypes.length === 0) throw new Error("At least one service is required.");
  const services = serviceTypes.map((service) =>
    getIndividual(service, serviceIndividuals, "Servicio", "Servicio", "codigoServicio")
  );
  const status = getIndividual(
    washJob.status,
    statusIndividuals,
    "Estado",
    "EstadoLavado",
    "codigoEstado",
  );

  const jobIri = `<${ontologyNamespace}TrabajoLavado_${encodeLocalName(washJob.id)}>`;
  const vehicleIri = `<${ontologyNamespace}Vehiculo_${encodeLocalName(plate)}>`;
  const serviceTerms = services.map((service) => service.term).join(", ");
  const customIndividuals = [
    vehicleType.declaration,
    ...services.map((service) => service.declaration),
    status.declaration,
  ].filter((declaration): declaration is string => declaration !== null);
  const customIndividualTriples = customIndividuals.length > 0
    ? `\n  ${customIndividuals.join("\n  ")}`
    : "";

  return `PREFIX : <${ontologyNamespace}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
  ${jobIri} a :TrabajoLavado ;
    :tieneVehiculo ${vehicleIri} ;
    :tieneTipoVehiculo ${vehicleType.term} ;
    :incluyeServicio ${serviceTerms} ;
    :tieneEstado ${status.term} ;
    :precio "${washJob.totalPrice.toFixed(2)}"^^xsd:decimal ;
    :fechaCreacion "${createdAt.toISOString()}"^^xsd:dateTime .

  ${vehicleIri} a :Vehiculo ;
    :tienePlaca ${toLiteral(plate)} .${customIndividualTriples}
}`;
}
