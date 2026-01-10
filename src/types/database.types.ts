export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      boards: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      columns: {
        Row: {
          id: string
          board_id: string
          title: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          board_id: string
          title: string
          position: number
          created_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          title?: string
          position?: number
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          column_id: string
          subject_id: string | null
          title: string
          description: string | null
          deadline: string | null
          priority: 'low' | 'medium' | 'high'
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          column_id: string
          subject_id?: string | null
          title: string
          description?: string | null
          deadline?: string | null
          priority?: 'low' | 'medium' | 'high'
          position: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          column_id?: string
          subject_id?: string | null
          title?: string
          description?: string | null
          deadline?: string | null
          priority?: 'low' | 'medium' | 'high'
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      priority: 'low' | 'medium' | 'high'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
