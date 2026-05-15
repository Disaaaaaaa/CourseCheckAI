export type SubmissionStatus =
  | "uploaded"
  | "extracting"
  | "analyzing"
  | "ready"
  | "reviewed"
  | "failed";

export type RiskLevel = "low" | "medium" | "high";
export type CriterionLevel = "high" | "medium" | "low" | "missing";
export type Confidence = "low" | "medium" | "high";

export interface Teacher {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  school_name: string | null;
  subject: string;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  teacher_id: string;
  student_full_name: string;
  class_name: string;
  coursework_title: string;
  pdf_file_path: string;
  pdf_file_name: string;
  pdf_file_size: number;
  status: SubmissionStatus;
  word_count: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedDocument {
  id: string;
  submission_id: string;
  full_text: string;
  intro_text: string | null;
  main_text: string | null;
  method_text: string | null;
  evaluation_text: string | null;
  conclusion_text: string | null;
  references_text: string | null;
  detected_language: string;
  extraction_quality: string;
  created_at: string;
}

export interface AiReview {
  id: string;
  submission_id: string;
  model_name: string;
  raw_json: unknown;
  total_ai_score: number;
  bm1_score: number;
  bm2_score: number;
  bm3_score: number;
  summary: string | null;
  student_feedback: string | null;
  teacher_annotation: string | null;
  academic_integrity_risk: RiskLevel;
  created_at: string;
}

export interface CriterionResult {
  id: string;
  ai_review_id: string;
  section: string;
  criterion_code: string;
  criterion_name: string;
  max_score: number;
  ai_score: number;
  teacher_score: number | null;
  level: CriterionLevel;
  evidence: string | null;
  problem: string | null;
  recommendation: string | null;
  confidence: Confidence;
  created_at: string;
}

export interface TeacherFinalReview {
  id: string;
  submission_id: string;
  teacher_id: string;
  final_total_score: number | null;
  final_bm1_score: number | null;
  final_bm2_score: number | null;
  final_bm3_score: number | null;
  final_comment: string | null;
  strengths: string | null;
  needs_improvement: string | null;
  next_revision: string | null;
  is_finalized: boolean;
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestion {
  id: string;
  submission_id: string;
  question: string;
  purpose: string | null;
  risk_area: string | null;
  created_at: string;
}

export interface ExportLog {
  id: string;
  submission_id: string;
  teacher_id: string;
  export_type: "pdf" | "excel" | "csv";
  file_path: string | null;
  created_at: string;
}
