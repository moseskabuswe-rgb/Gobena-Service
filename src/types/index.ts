// ─── Core Entity Types ───────────────────────────────────────────────────────

export type ShopStatus = 'pending' | 'approved' | 'suspended';
export type EquipmentStatus = 'operational' | 'needs_attention' | 'out_of_service';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type UserRole = 'admin' | 'partner';
export type ChecklistType = 'opening' | 'closing' | 'weekly';

export interface Shop {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  status: ShopStatus;
  approved_at: string | null;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Equipment {
  id: string;
  shop_id: string;
  name: string;
  brand: string;
  model: string;
  serial_number: string | null;
  install_date: string | null;
  last_service_date: string | null;
  next_service_date: string | null;
  status: EquipmentStatus;
  notes: string | null;
  created_at: string;
  shops?: { name: string; city: string } | null;
}

export interface Issue {
  id: string;
  equipment_id: string;
  shop_id: string;
  reported_by: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  equipment?: { name: string; brand: string; model: string } | null;
  shops?: { name: string } | null;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
}

export interface ChecklistCompletion {
  id: string;
  shop_id: string;
  completed_by: string;
  checklist_type: ChecklistType;
  items: ChecklistItem[];
  date: string;
  created_at: string;
}

export interface MaintenanceLog {
  id: string;
  equipment_id: string;
  shop_id: string;
  logged_by: string;
  type: 'routine' | 'repair' | 'inspection' | 'cleaning';
  description: string;
  performed_by: string;
  performed_at: string;
  next_service_date: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  shop_id: string | null;
  role: UserRole;
  full_name: string;
  created_at: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthContextType {
  user: import('@supabase/supabase-js').User | null;
  profile: Profile | null;
  shop: Shop | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
