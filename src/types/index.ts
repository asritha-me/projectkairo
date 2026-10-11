export type DocumentType =
  | 'lab_report'
  | 'prescription'
  | 'discharge_summary'
  | 'doctor_note'
  | 'medical_history'
  | 'other';

export type ProcessingStatus =
  | 'waiting'
  | 'uploading'
  | 'processing'
  | 'text_extracted'
  | 'ai_summary_ready'
  | 'needs_review'
  | 'failed';

export type TimelineEventType =
  | 'lab_report'
  | 'prescription'
  | 'discharge'
  | 'diagnosis'
  | 'procedure'
  | 'doctor_note'
  | 'other';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'pending';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  phone: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  known_allergies: string[];
  current_medications: string[];
  medical_history: string[];
  existing_conditions: string[];
  previous_procedures: string[];
  blood_type: string;
  height_cm: number | null;
  weight_kg: number | null;
  updated_at: string;
}

export interface MedicalDocument {
  id: string;
  user_id: string;
  title: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  source_organization: string;
  report_date: string | null;
  processing_status: ProcessingStatus;
  extracted_text: string;
  ai_summary: string;
  ai_explanation: string;
  questions_for_clinician: string[];
  extraction_confidence: number;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface LabResult {
  id: string;
  user_id: string;
  document_id: string;
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  is_out_of_range: boolean;
  flag: string;
  report_date: string | null;
  created_at: string;
}

export interface Medication {
  id: string;
  user_id: string;
  document_id: string | null;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescribing_clinician: string;
  source_document_name: string;
  prescription_date: string | null;
  is_current: boolean;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  user_id: string;
  document_id: string | null;
  event_date: string;
  event_type: TimelineEventType;
  title: string;
  description: string;
  source_document_name: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Array<{ documentName: string; date: string }> | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  title: string;
  doctor_name: string;
  hospital_name: string;
  appointment_date: string | null;
  appointment_time: string;
  status: AppointmentStatus;
  notes: string;
  created_at: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  lab_report: 'Laboratory Report',
  prescription: 'Prescription',
  discharge_summary: 'Discharge Summary',
  doctor_note: 'Doctor Note',
  medical_history: 'Medical History',
  other: 'Other',
};

export const PROCESSING_STATUS_LABELS: Record<ProcessingStatus, string> = {
  waiting: 'Waiting',
  uploading: 'Uploading',
  processing: 'Processing',
  text_extracted: 'Text Extracted',
  ai_summary_ready: 'AI Summary Ready',
  needs_review: 'Needs Review',
  failed: 'Failed',
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending: 'Pending',
};
