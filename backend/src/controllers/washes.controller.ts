import { z } from 'zod';
import type { RequestHandler } from 'express';
import { resolveActiveBusiness } from '../services/business-context.service';
import {
  advanceWashStatus,
  createWash,
  createWashSchema,
  calculateWashStats,
  deleteWash,
  fetchWashById,
  listWashes,
  listWashJobStatusHistory,
  parseWashFilters,
  updateWashStatusSchema,
} from '../services/washes.service';

const uuidSchema = z.string().uuid();
const washJobIdsSchema = z.array(uuidSchema).max(100).refine(
  (ids) => new Set(ids).size === ids.length,
  'Wash job IDs must be unique',
);
const washJobIdsQuerySchema = z.string().max(4000).optional()
  .transform((value) => value ? value.split(',') : [])
  .pipe(washJobIdsSchema);

export const getWashes: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  const filters = parseWashFilters(req.query);
  res.json(await listWashes(client, membership.business_id, filters));
};

export const postWash: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  const input = createWashSchema.parse(req.body);
  res.status(201).json(
    await createWash(client, membership.business_id, input),
  );
};

export const patchWashStatus: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  const { status } = updateWashStatusSchema.parse(req.body);
  const washId = z.string().uuid().parse(req.params.id);
  res.json(await advanceWashStatus(client, membership.business_id, washId, status));
};

export const getWashById: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  const washId = uuidSchema.parse(req.params.id);
  res.json(await fetchWashById(client, membership.business_id, washId));
};

export const getWashStatusHistory: RequestHandler = async (req, res) => {
  const { client } = await resolveActiveBusiness(req);
  const ids = washJobIdsQuerySchema.parse(req.query.ids);
  res.json(await listWashJobStatusHistory(client, ids));
};

export const deleteWashById: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  const washId = uuidSchema.parse(req.params.id);
  await deleteWash(client, membership.business_id, washId);
  res.status(204).end();
};

export const getWashStats: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  const filters = parseWashFilters(req.query);
  res.json(await calculateWashStats(client, membership.business_id, filters));
};
