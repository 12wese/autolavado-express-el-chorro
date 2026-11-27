import { z } from 'zod';
import type { RequestHandler } from 'express';
import {
  getAuthenticatedContext,
  resolveActiveBusiness,
} from '../services/business-context.service';
import {
  addonSchema,
  businessSchema,
  createAddon,
  createBusiness,
  findWasherByQrToken,
  getCurrentBusiness,
  inviteWasher,
  listAddons,
  listPrices,
  listWashers,
  removeAddon,
  removePrice,
  removeWasher,
  servicePriceSchema,
  setPrice,
  washerSchema,
} from '../services/catalog.service';

const uuidSchema = z.string().uuid();

export const getBusinessCurrent: RequestHandler = async (req, res) => {
  const { client, user } = getAuthenticatedContext(req);
  res.json(await getCurrentBusiness(client, user, req));
};

export const deleteWasher: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  await removeWasher(client, membership.business_id, uuidSchema.parse(req.params.id));
  res.status(204).end();
};

export const postBusiness: RequestHandler = async (req, res) => {
  const { client, user } = getAuthenticatedContext(req);
  const { name } = businessSchema.parse(req.body);
  res.status(201).json(await createBusiness(client, user.id, name));
};

export const deleteAddon: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  await removeAddon(client, membership.business_id, uuidSchema.parse(req.params.id));
  res.status(204).end();
};

export const getWashers: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  res.json(await listWashers(client, membership.business_id));
};

export const postWasher: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  const { name, email } = washerSchema.parse(req.body);
  res.status(201).json(await inviteWasher(client, membership.business_id, name, email));
};

export const getWasherByToken: RequestHandler = async (req, res) => {
  const { client } = getAuthenticatedContext(req);
  const qrToken = z.string().min(1).max(256).parse(req.params.qrToken);
  const washer = await findWasherByQrToken(client, qrToken);
  res.json(washer);
};

export const getPrices: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  res.json(await listPrices(client, membership.business_id));
};

export const postPrice: RequestHandler = async (req, res) => {
  const { client, user, membership } = await resolveActiveBusiness(req);
  res.json(await setPrice(
    client,
    membership.business_id,
    user.id,
    servicePriceSchema.parse(req.body),
  ));
};

export const deletePrice: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  await removePrice(client, membership.business_id, uuidSchema.parse(req.params.id));
  res.status(204).end();
};

export const getAddons: RequestHandler = async (req, res) => {
  const { client, membership } = await resolveActiveBusiness(req);
  res.json(await listAddons(client, membership.business_id));
};

export const postAddon: RequestHandler = async (req, res) => {
  const { client, user, membership } = await resolveActiveBusiness(req);
  res.status(201).json(await createAddon(
    client,
    membership.business_id,
    user.id,
    addonSchema.parse(req.body),
  ));
};
