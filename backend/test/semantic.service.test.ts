import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSelectQuery } from '../src/services/semantic.service';

test('allows SERVICE-like variable names, literals, and comments', () => {
  const allowedQueries = [
    'SELECT ?serviceType WHERE { ?s ?p ?serviceType }',
    'SELECT ?service WHERE { ?s ?p ?o FILTER(?service < 3) }',
    'SELECT ?label WHERE { BIND("serviceType$ SERVICE <fake> DROP ALL" AS ?label) }',
    'SELECT * WHERE { ?s ?p ?o } # SERVICE <comment> DROP ALL',
  ];

  for (const query of allowedQueries) {
    assert.doesNotThrow(() => validateSelectQuery(query));
  }
});

test('blocks federated SERVICE clauses', () => {
  const serviceQueries = [
    'SELECT * WHERE { SERVICE <http://example.test/sparql> { ?s ?p ?o } }',
    'SELECT * WHERE { SERVICE SILENT <http://example.test/sparql> { ?s ?p ?o } }',
  ];

  for (const query of serviceQueries) {
    assert.throws(() => validateSelectQuery(query), { status: 400 });
  }
});

test('blocks destructive operations and multiple statements in read queries', () => {
  const destructiveQueries = [
    'SELECT * WHERE { ?s ?p ?o } DROP ALL',
    'SELECT * WHERE { ?s ?p ?o } CLEAR GRAPH <urn:g>',
    'SELECT * WHERE { ?s ?p ?o } LOAD <urn:g>',
    'SELECT * WHERE { ?s ?p ?o } CREATE GRAPH <urn:g>',
    'SELECT * WHERE { ?s ?p ?o }; DROP ALL',
  ];

  for (const query of destructiveQueries) {
    assert.throws(() => validateSelectQuery(query), { status: 400 });
  }
});
