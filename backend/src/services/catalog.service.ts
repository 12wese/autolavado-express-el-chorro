import { z } from 'zod';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { HttpError } from '../lib/http-error';
import {
  fetchCurrentBusinessMemberships,
  getRequestedBusinessId,
} from './business-context.service';
import type { Request } from 'express';

export const businessSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const washerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
});

export const servicePriceSchema = z.object({
  car_type: z.string().trim().min(1).max(100),
  wash_type: z.string().trim().min(1).max(200),
  price: z.number().finite().min(0).max(1_000_000),
});

export const addonSchema = z.object({
  name: z.string().trim().min(1).max(100),
  price: z.number().finite().min(0).max(1_000_000),
});

export async function getCurrentBusiness(client: SupabaseClient, user: User, req: Request) {
  const { error: acceptError } = await client.rpc('accept_pending_business_memberships');
  if (acceptError) throw acceptError;

  const memberships = await fetchCurrentBusinessMemberships(client, user.id);
  const requestedId = getRequestedBusinessId(req);
  if (requestedId && !memberships.some((membership) => membership.business_id === requestedId)) {
    throw new HttpError(403, 'The user is not an active member of this business');
  }
  const active = requestedId
    ? memberships.find((membership) => membership.business_id === requestedId) ?? null
    : memberships[0] ?? null;
  return { memberships, active };
}

export async function createBusiness(client: SupabaseClient, userId: string, name: string) {
  const { data: businessId, error } = await client.rpc('create_business_for_current_user', {
    p_name: name,
  });
  if (error) throw error;
  if (typeof businessId !== 'string') {
    throw new Error('Database did not return the created business ID');
  }

  const memberships = await fetchCurrentBusinessMemberships(client, userId);
  const membership = memberships.find((item) => item.business_id === businessId);
  if (!membership) throw new Error('Created business membership could not be retrieved');
  return membership;
}

export async function listWashers(client: SupabaseClient, businessId: string) {
  const { data, error } = await client
    .from('washers')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findWasherByQrToken(
  client: SupabaseClient,
  qrToken: string,
) {
  const { data, error } = await client
    .from('washers')
    .select('*')
    .eq('qr_token', qrToken)
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function removeWasher(
  client: SupabaseClient,
  businessId: string,
  id: string,
) {
  const { data, error } = await client
    .from('washers')
    .delete()
    .eq('business_id', businessId)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Washer was not found');
}

export async function inviteWasher(
  client: SupabaseClient,
  businessId: string,
  name: string,
  email: string,
) {
  const { data: washerId, error } = await client.rpc('invite_business_washer', {
    p_business_id: businessId,
    p_name: name,
    p_email: email,
  });
  if (error) throw error;
  if (typeof washerId !== 'string') throw new Error('Database did not return the washer ID');

  const { data, error: fetchError } = await client
    .from('washers')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', washerId)
    .single();
  if (fetchError) throw fetchError;
  return data;
}

export async function listPrices(client: SupabaseClient, businessId: string) {
  const { data, error } = await client
    .from('service_prices')
    .select('*')
    .eq('business_id', businessId)
    .order('car_type', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function setPrice(
  client: SupabaseClient,
  businessId: string,
  userId: string,
  input: z.infer<typeof servicePriceSchema>,
) {
  const { data, error } = await client
    .from('service_prices')
    .upsert(
      {
        business_id: businessId,
        created_by_user_id: userId,
        user_id: userId,
        ...input,
      },
      { onConflict: 'business_id,car_type,wash_type' },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removePrice(client: SupabaseClient, businessId: string, id: string) {
  const { data, error } = await client
    .from('service_prices')
    .delete()
    .eq('business_id', businessId)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Service price was not found');
}

export async function listAddons(client: SupabaseClient, businessId: string) {
  const { data, error } = await client
    .from('addons')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createAddon(
  client: SupabaseClient,
  businessId: string,
  userId: string,
  input: z.infer<typeof addonSchema>,
) {
  const { data, error } = await client
    .from('addons')
    .insert({
      business_id: businessId,
      created_by_user_id: userId,
      user_id: userId,
      ...input,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeAddon(client: SupabaseClient, businessId: string, id: string) {
  const { data, error } = await client
    .from('addons')
    .delete()
    .eq('business_id', businessId)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Addon was not found');
}
