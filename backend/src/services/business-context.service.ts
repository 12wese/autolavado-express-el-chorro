import type { Request } from 'express';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { HttpError } from '../lib/http-error';

export interface ActiveBusinessMembership {
  id: string;
  business_id: string;
  user_id: string;
  invited_email: string | null;
  role: string;
  status: string;
  invited_by_user_id: string | null;
  created_at: string;
  business: {
    id: string;
    name: string;
    created_by_user_id: string;
    legacy_owner_user_id: string | null;
    status: string;
    created_at: string;
  };
  washer_id: string | null;
}

export function getAuthenticatedContext(req: Request): { client: SupabaseClient; user: User } {
  if (!req.supabase || !req.user) {
    throw new HttpError(401, 'Authentication required');
  }
  return { client: req.supabase, user: req.user };
}

export function getRequestedBusinessId(req: Request): string | undefined {
  const headerId = req.header('X-Business-Id')?.trim();
  const queryValue = req.query.businessId;
  const queryId = typeof queryValue === 'string' ? queryValue.trim() : undefined;
  const body = req.body as { businessId?: unknown } | undefined;
  const bodyId = typeof body?.businessId === 'string' ? body.businessId.trim() : undefined;
  const candidates = [headerId, queryId, bodyId].filter(
    (value): value is string => Boolean(value),
  );
  if (new Set(candidates).size > 1) {
    throw new HttpError(400, 'Provide one consistent business ID');
  }
  return candidates[0];
}

export async function fetchCurrentBusinessMemberships(
  client: SupabaseClient,
  userId: string,
): Promise<ActiveBusinessMembership[]> {
  const { data: membershipRows, error: membershipError } = await client
    .from('business_memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (membershipError) throw membershipError;
  const memberships = membershipRows ?? [];
  if (memberships.length === 0) return [];

  const businessIds = [...new Set(memberships.map((membership) => membership.business_id))];
  const { data: businessRows, error: businessError } = await client
    .from('businesses')
    .select('*')
    .in('id', businessIds)
    .eq('status', 'active');
  if (businessError) throw businessError;

  const { data: washerRows, error: washerError } = await client
    .from('washers')
    .select('id,membership_id,business_id')
    .in('membership_id', memberships.map((membership) => membership.id));
  if (washerError) throw washerError;

  const businessesById = new Map(
    (businessRows ?? []).map((business) => [business.id, business]),
  );
  const washersByMembershipId = new Map(
    (washerRows ?? []).flatMap((washer) => (
      washer.membership_id ? [[washer.membership_id, washer.id] as const] : []
    )),
  );

  return memberships.flatMap((membership) => {
    const business = businessesById.get(membership.business_id);
    if (!business || !membership.user_id) return [];
    return [{
      ...membership,
      business,
      washer_id: washersByMembershipId.get(membership.id) ?? null,
    }];
  });
}

export async function resolveActiveBusiness(req: Request): Promise<{
  client: SupabaseClient;
  user: User;
  membership: ActiveBusinessMembership;
}> {
  const { client, user } = getAuthenticatedContext(req);
  const memberships = await fetchCurrentBusinessMemberships(client, user.id);
  const requestedId = getRequestedBusinessId(req);

  if (memberships.length === 0) {
    throw new HttpError(409, 'No active business membership is available');
  }
  if (!requestedId && memberships.length > 1) {
    throw new HttpError(400, 'X-Business-Id is required when the user has multiple businesses');
  }

  const membership = requestedId
    ? memberships.find((item) => item.business_id === requestedId)
    : memberships[0];
  if (!membership) {
    throw new HttpError(403, 'The user is not an active member of this business');
  }

  return { client, user, membership };
}
