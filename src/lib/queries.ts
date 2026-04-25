import { supabase } from './supabaseClient';
import type {
  Equipment,
  MaintenanceLog,
  ServiceRequest,
  Shop,
  Profile,
  TroubleshootEntry,
  RequestStatus,
} from '../types';

// ─── PROFILE ────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'shop_id'>>
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

// ─── SHOPS ──────────────────────────────────────────────────────────────────

export async function getShops(): Promise<Shop[]> {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .order('name');
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function getShop(shopId: string): Promise<Shop | null> {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

// ─── EQUIPMENT ──────────────────────────────────────────────────────────────

export async function getEquipmentByShop(shopId: string): Promise<Equipment[]> {
  const { data, error } = await supabase
    .from('equipment')
    .select('*, shops(name, city)')
    .eq('shop_id', shopId)
    .order('name');
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function getAllEquipment(): Promise<Equipment[]> {
  const { data, error } = await supabase
    .from('equipment')
    .select('*, shops(name, city, state)')
    .order('name');
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
  const { data, error } = await supabase
    .from('equipment')
    .select('*, shops(*)')
    .eq('id', id)
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function updateEquipmentStatus(
  id: string,
  status: Equipment['status'],
  notes?: string
): Promise<boolean> {
  const update: Record<string, unknown> = { status, last_service: new Date().toISOString().slice(0, 10) };
  if (notes !== undefined) update.notes = notes;
  const { error } = await supabase.from('equipment').update(update).eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
}

// ─── MAINTENANCE LOGS ───────────────────────────────────────────────────────

export async function getMaintenanceLogs(equipmentId: string): Promise<MaintenanceLog[]> {
  const { data, error } = await supabase
    .from('maintenance_logs')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('performed_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function insertMaintenanceLog(log: {
  equipment_id: string;
  performed_by: string;
  description: string;
  log_type: MaintenanceLog['log_type'];
}): Promise<MaintenanceLog | null> {
  const { data, error } = await supabase
    .from('maintenance_logs')
    .insert(log)
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

// ─── SERVICE REQUESTS ───────────────────────────────────────────────────────

export async function getServiceRequestsByShop(shopId: string): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*, equipment(name, category, model), shops(name)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return (data ?? []).map(normalizeRequest);
}

export async function getAllServiceRequests(): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*, equipment(name, category, model), shops(name, city)')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return (data ?? []).map(normalizeRequest);
}

export async function getServiceRequestById(id: string): Promise<ServiceRequest | null> {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*, equipment(name, category, model, shop_id), shops(name, city)')
    .eq('id', id)
    .single();
  if (error) { console.error(error); return null; }
  return normalizeRequest(data);
}

// Ensures new columns have defaults even on old rows
function normalizeRequest(r: Record<string, unknown>): ServiceRequest {
  return {
    ...r,
    media_urls:          (r.media_urls as string[])                     ?? [],
    diagnostic_answers:  (r.diagnostic_answers as Record<string,string>) ?? {},
    ai_summary:          (r.ai_summary as string | null)                 ?? null,
    resolution_notes:    (r.resolution_notes as string | null)           ?? null,
    resolved_at:         (r.resolved_at as string | null)                ?? null,
  } as ServiceRequest;
}

export async function insertServiceRequest(req: {
  equipment_id: string;
  shop_id: string;
  requested_by: string | null;
  issue_type: string;
  notes: string;
  priority: ServiceRequest['priority'];
  media_urls?: string[];
  diagnostic_answers?: Record<string, string>;
  ai_summary?: string;
}): Promise<ServiceRequest | null> {
  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      ...req,
      media_urls:         req.media_urls         ?? [],
      diagnostic_answers: req.diagnostic_answers ?? {},
      ai_summary:         req.ai_summary         ?? null,
    })
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return normalizeRequest(data);
}

export async function updateServiceRequestStatus(
  id: string,
  status: ServiceRequest['status'],
  resolutionNotes?: string
): Promise<boolean> {
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (resolutionNotes !== undefined) update.resolution_notes = resolutionNotes;
  const { error } = await supabase.from('service_requests').update(update).eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
}

// ─── MEDIA UPLOAD ───────────────────────────────────────────────────────────

export async function uploadServiceMedia(
  file: File,
  requestId: string
): Promise<string | null> {
  const ext  = file.name.split('.').pop();
  const path = `${requestId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('service-media')
    .upload(path, file, { upsert: false });

  if (error) { console.error('Upload error:', error); return null; }

  // Return a signed URL valid for 7 days (172800s = 48h, 604800s = 7d)
  const { data: signed } = await supabase.storage
    .from('service-media')
    .createSignedUrl(path, 604800);

  return signed?.signedUrl ?? null;
}

// ─── TROUBLESHOOT LIBRARY ───────────────────────────────────────────────────

export async function getTroubleshootEntries(opts?: {
  shopId?: string;
  category?: string;
  search?: string;
}): Promise<TroubleshootEntry[]> {
  let query = supabase
    .from('troubleshoot_library')
    .select('*, equipment(name, category, model), shops(name)')
    .order('created_at', { ascending: false });

  if (opts?.category) query = query.eq('equipment_category', opts.category);
  if (opts?.search) {
    query = query.or(
      `problem_description.ilike.%${opts.search}%,resolution_steps.ilike.%${opts.search}%,issue_type.ilike.%${opts.search}%`
    );
  }

  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function insertTroubleshootEntry(entry: {
  service_request_id?: string;
  equipment_id?: string;
  shop_id?: string;
  issue_type: string;
  equipment_category: string;
  equipment_model?: string;
  problem_description: string;
  resolution_steps: string;
  root_cause?: string;
  parts_replaced?: string;
  is_public?: boolean;
  tags?: string[];
  created_by?: string;
}): Promise<TroubleshootEntry | null> {
  const { data, error } = await supabase
    .from('troubleshoot_library')
    .insert(entry)
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}
