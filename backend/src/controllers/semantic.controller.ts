import type { RequestHandler } from 'express';
import { resolveActiveBusiness } from '../services/business-context.service';
import {
  checkSemanticHealth,
  parseInsertRequest,
  parseSelectRequest,
  runInsertData,
  runSelectQuery,
} from '../services/semantic.service';

export const getSemanticHealth: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  res.json(await checkSemanticHealth(client, membership.business_id));
};

export const postSemanticQuery: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  const query = parseSelectRequest(req.body);
  res.json(await runSelectQuery(client, membership.business_id, query));
};

export const postSemanticUpdate: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  const update = parseInsertRequest(req.body);
  res.json(await runInsertData(client, membership.business_id, update));
};
