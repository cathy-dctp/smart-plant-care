export interface Plant {
  id: number;
  name: string;
  species: string;
  status: string;
  watering_interval_days: number;
  next_watering_date: string | null;
  latest_moisture: number | null;
  latest_temperature: number | null;
  latest_light_level: number | null;
  custom_temp: number | null;
  image_url?: string | null;
  last_watered_date?: string | null;
  pot_size?: string | null;
  pot_height?: string | null;
  potting_mix?: string | null;
  location?: string | null;
  light_condition?: string | null;
  maturity_stage?: string | null;
  repotted_status?: string | null;
  snoozed_until?: string | null;
  propagation_methods?: string | null;
  fertilizer_guideline?: string | null;
}

export interface TelemetryLog {
  id: number;
  plant_id: number;
  timestamp: string;
  soil_moisture: number;
  temperature: number;
  light_level: number;
}

export interface TreatmentSchedule {
  id: number;
  plant_id: number;
  action: string;
  scheduled_date: string;
  is_completed: boolean;
}

export interface CareLog {
  id: number;
  plant_id: number;
  timestamp: string;
  event_type: string;
  details: string | null;
}

export interface PlantDetail extends Plant {
  treatment_schedules: TreatmentSchedule[];
  care_logs: CareLog[];
}

export interface DiagnosisResult {
  diagnosed_issue: string;
  confidence_score: number;
  short_summary: string;
}

export interface DashboardTask {
  id: string;
  task_type: 'water' | 'treatment';
  plant_id: number;
  plant_name: string;
  plant_species: string;
  action: string;
  severity: 'critical' | 'warning' | 'info';
  target_id?: number;
  scheduled_date?: string;
}
