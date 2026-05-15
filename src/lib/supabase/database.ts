/**
 * Loose Database stub used while explicit generated types are not in place.
 * Regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.ts
 * once a real Supabase project is connected.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* eslint-disable @typescript-eslint/no-explicit-any */
type GenericTable = {
  Row: any;
  Insert: any;
  Update: any;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      teachers: GenericTable;
      submissions: GenericTable;
      extracted_documents: GenericTable;
      ai_reviews: GenericTable;
      criterion_results: GenericTable;
      teacher_final_reviews: GenericTable;
      interview_questions: GenericTable;
      export_logs: GenericTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
