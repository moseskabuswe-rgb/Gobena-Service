export type UserRole = 'admin' | 'partner';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  shop_id: string | null;
  created_at: string;
}

export interface Shop {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
}

export type EquipmentStatus   = 'good' | 'needs_attention' | 'urgent';
export type EquipmentCategory =
  | 'Espresso Machine'
  | 'Grinder'
  | 'Brewer'
  | 'Refrigeration'
  | 'Water System'
  | 'Other';

export interface Equipment {
  id: string;
  shop_id: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  category: EquipmentCategory;
  status: EquipmentStatus;
  install_date: string | null;
  last_service: string | null;
  notes: string | null;
  created_at: string;
  shops?: Shop;
}

export type LogType = 'maintenance' | 'repair' | 'inspection' | 'install';

export interface MaintenanceLog {
  id: string;
  equipment_id: string;
  performed_by: string;
  description: string;
  log_type: LogType;
  performed_at: string;
  created_at: string;
}

export type RequestStatus   = 'open' | 'in_progress' | 'resolved' | 'closed';
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ServiceRequest {
  id: string;
  equipment_id: string;
  shop_id: string;
  requested_by: string | null;
  issue_type: string;
  notes: string | null;
  status: RequestStatus;
  priority: RequestPriority;
  // New fields
  media_urls: string[];
  diagnostic_answers: Record<string, string>;
  ai_summary: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  equipment?: Equipment;
  shops?: Shop;
}

export interface TroubleshootEntry {
  id: string;
  service_request_id: string | null;
  equipment_id: string | null;
  shop_id: string | null;
  issue_type: string;
  equipment_category: string;
  equipment_model: string | null;
  problem_description: string;
  resolution_steps: string;
  root_cause: string | null;
  parts_replaced: string | null;
  is_public: boolean;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  equipment?: Equipment;
  shops?: Shop;
}
