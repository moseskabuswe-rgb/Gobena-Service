import { supabase } from './supabaseClient';
import type {
  Equipment,
  MaintenanceLog,
  ServiceRequest,
  Shop,
  Profile,
} from '../types';

// ─── PROFILE ─────────────────────────────────────────────────

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

// ─── SHOPS ───────────────────────────────────────────────────

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

// ─── EQUIPMENT ───────────────────────────────────────────────

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
  status: Equipment['status']
): Promise<boolean> {
  const { error } = await supabase
    .from('equipment')
    .update({ status })
    .eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
}

// ─── MAINTENANCE LOGS ────────────────────────────────────────

export async function getMaintenanceLogs(
  equipmentId: string
): Promise<MaintenanceLog[]> {
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

// ─── SERVICE REQUESTS ────────────────────────────────────────

export async function getServiceRequestsByShop(
  shopId: string
): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*, equipment(name, category), shops(name)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function getAllServiceRequests(): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*, equipment(name, category, model), shops(name, city)')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function insertServiceRequest(req: {
  equipment_id: string;
  shop_id: string;
  requested_by: string | null;
  issue_type: string;
  notes: string;
  priority: ServiceRequest['priority'];
}): Promise<ServiceRequest | null> {
  const { data, error } = await supabase
    .from('service_requests')
    .insert(req)
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function updateServiceRequestStatus(
  id: string,
  status: ServiceRequest['status']
): Promise<boolean> {
  const { error } = await supabase
    .from('service_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
}
