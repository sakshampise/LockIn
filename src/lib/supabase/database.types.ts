export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      focus_presets: {
        Row: {
          break_count: number;
          break_duration_minutes: number;
          created_at: string;
          focus_duration_minutes: number;
          id: string;
          is_default: boolean;
          long_break_duration_minutes: number;
          name: string;
          sessions_before_long_break: number;
          sort_order: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          break_count?: number;
          break_duration_minutes?: number;
          created_at?: string;
          focus_duration_minutes: number;
          id?: string;
          is_default?: boolean;
          long_break_duration_minutes?: number;
          name: string;
          sessions_before_long_break?: number;
          sort_order?: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          break_count?: number;
          break_duration_minutes?: number;
          created_at?: string;
          focus_duration_minutes?: number;
          id?: string;
          is_default?: boolean;
          long_break_duration_minutes?: number;
          name?: string;
          sessions_before_long_break?: number;
          sort_order?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      focus_sessions: {
        Row: {
          actual_duration_seconds: number | null;
          completed: boolean;
          created_at: string;
          duration_minutes: number;
          ended_at: string | null;
          id: string;
          interruption_count: number;
          interrupted: boolean;
          planned_duration_minutes: number | null;
          preset_id: string | null;
          started_at: string;
          status: Database['public']['Enums']['lockin_focus_session_status'];
          target_page_id: string | null;
          target_task_id: string | null;
          target_title: string;
          target_type: Database['public']['Enums']['lockin_focus_target_type'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          actual_duration_seconds?: number | null;
          completed?: boolean;
          created_at?: string;
          duration_minutes: number;
          ended_at?: string | null;
          id?: string;
          interruption_count?: number;
          interrupted?: boolean;
          planned_duration_minutes?: number | null;
          preset_id?: string | null;
          started_at?: string;
          status?: Database['public']['Enums']['lockin_focus_session_status'];
          target_page_id?: string | null;
          target_task_id?: string | null;
          target_title: string;
          target_type: Database['public']['Enums']['lockin_focus_target_type'];
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          actual_duration_seconds?: number | null;
          completed?: boolean;
          created_at?: string;
          duration_minutes?: number;
          ended_at?: string | null;
          id?: string;
          interruption_count?: number;
          interrupted?: boolean;
          planned_duration_minutes?: number | null;
          preset_id?: string | null;
          started_at?: string;
          status?: Database['public']['Enums']['lockin_focus_session_status'];
          target_page_id?: string | null;
          target_task_id?: string | null;
          target_title?: string;
          target_type?: Database['public']['Enums']['lockin_focus_target_type'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'focus_sessions_page_owner_fk';
            columns: ['user_id', 'target_page_id'];
            isOneToOne: false;
            referencedRelation: 'pages';
            referencedColumns: ['user_id', 'id'];
          },
          {
            foreignKeyName: 'focus_sessions_preset_owner_fk';
            columns: ['user_id', 'preset_id'];
            isOneToOne: false;
            referencedRelation: 'focus_presets';
            referencedColumns: ['user_id', 'id'];
          },
          {
            foreignKeyName: 'focus_sessions_task_owner_fk';
            columns: ['user_id', 'target_task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['user_id', 'id'];
          },
        ];
      };
      import_items: {
        Row: {
          created_at: string;
          id: string;
          item_type: Database['public']['Enums']['lockin_import_item_type'];
          job_id: string;
          mapped_page_id: string | null;
          mapped_task_id: string | null;
          payload: Json;
          source_id: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_type: Database['public']['Enums']['lockin_import_item_type'];
          job_id: string;
          mapped_page_id?: string | null;
          mapped_task_id?: string | null;
          payload?: Json;
          source_id?: string | null;
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_type?: Database['public']['Enums']['lockin_import_item_type'];
          job_id?: string;
          mapped_page_id?: string | null;
          mapped_task_id?: string | null;
          payload?: Json;
          source_id?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'import_items_job_owner_fk';
            columns: ['user_id', 'job_id'];
            isOneToOne: false;
            referencedRelation: 'import_jobs';
            referencedColumns: ['user_id', 'id'];
          },
          {
            foreignKeyName: 'import_items_page_owner_fk';
            columns: ['user_id', 'mapped_page_id'];
            isOneToOne: false;
            referencedRelation: 'pages';
            referencedColumns: ['user_id', 'id'];
          },
          {
            foreignKeyName: 'import_items_task_owner_fk';
            columns: ['user_id', 'mapped_task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['user_id', 'id'];
          },
        ];
      };
      import_jobs: {
        Row: {
          completed_at: string | null;
          created_at: string;
          detected_pages: number;
          detected_tasks: number;
          error_message: string | null;
          file_name: string | null;
          file_size_bytes: number | null;
          id: string;
          mapped_pages: number;
          mapped_tasks: number;
          metadata: Json;
          source: Database['public']['Enums']['lockin_import_source'];
          status: Database['public']['Enums']['lockin_import_status'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          detected_pages?: number;
          detected_tasks?: number;
          error_message?: string | null;
          file_name?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          mapped_pages?: number;
          mapped_tasks?: number;
          metadata?: Json;
          source?: Database['public']['Enums']['lockin_import_source'];
          status?: Database['public']['Enums']['lockin_import_status'];
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          detected_pages?: number;
          detected_tasks?: number;
          error_message?: string | null;
          file_name?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          mapped_pages?: number;
          mapped_tasks?: number;
          metadata?: Json;
          source?: Database['public']['Enums']['lockin_import_source'];
          status?: Database['public']['Enums']['lockin_import_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      interruptions: {
        Row: {
          created_at: string;
          id: string;
          occurred_at: string;
          reason: string | null;
          session_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          occurred_at?: string;
          reason?: string | null;
          session_id: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          occurred_at?: string;
          reason?: string | null;
          session_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'interruptions_session_owner_fk';
            columns: ['user_id', 'session_id'];
            isOneToOne: false;
            referencedRelation: 'focus_sessions';
            referencedColumns: ['user_id', 'id'];
          },
        ];
      };
      pages: {
        Row: {
          content: string;
          created_at: string;
          icon: string | null;
          id: string;
          metadata: Json;
          parent_id: string | null;
          sort_order: number;
          tag_id: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content?: string;
          created_at?: string;
          icon?: string | null;
          id?: string;
          metadata?: Json;
          parent_id?: string | null;
          sort_order?: number;
          tag_id?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          icon?: string | null;
          id?: string;
          metadata?: Json;
          parent_id?: string | null;
          sort_order?: number;
          tag_id?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pages_parent_owner_fk';
            columns: ['user_id', 'parent_id'];
            isOneToOne: false;
            referencedRelation: 'pages';
            referencedColumns: ['user_id', 'id'];
          },
          {
            foreignKeyName: 'pages_tag_owner_fk';
            columns: ['user_id', 'tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['user_id', 'id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          daily_focus_goal_minutes: number;
          default_session_minutes: number;
          display_name: string;
          id: string;
          theme: Database['public']['Enums']['lockin_theme'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          daily_focus_goal_minutes?: number;
          default_session_minutes?: number;
          display_name?: string;
          id: string;
          theme?: Database['public']['Enums']['lockin_theme'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          daily_focus_goal_minutes?: number;
          default_session_minutes?: number;
          display_name?: string;
          id?: string;
          theme?: Database['public']['Enums']['lockin_theme'];
          updated_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          color: string | null;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          completed_at: string | null;
          created_at: string;
          description: string | null;
          done: boolean;
          due_date: string | null;
          id: string;
          page_id: string | null;
          priority: Database['public']['Enums']['lockin_task_priority'];
          recurrence: Database['public']['Enums']['lockin_recurrence'];
          sort_order: number;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          done?: boolean;
          due_date?: string | null;
          id?: string;
          page_id?: string | null;
          priority?: Database['public']['Enums']['lockin_task_priority'];
          recurrence?: Database['public']['Enums']['lockin_recurrence'];
          sort_order?: number;
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          done?: boolean;
          due_date?: string | null;
          id?: string;
          page_id?: string | null;
          priority?: Database['public']['Enums']['lockin_task_priority'];
          recurrence?: Database['public']['Enums']['lockin_recurrence'];
          sort_order?: number;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_page_owner_fk';
            columns: ['user_id', 'page_id'];
            isOneToOne: false;
            referencedRelation: 'pages';
            referencedColumns: ['user_id', 'id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      set_updated_at: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      handle_new_user: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
    };
    Enums: {
      lockin_focus_session_status: 'active' | 'completed' | 'interrupted' | 'cancelled';
      lockin_focus_target_type: 'page' | 'task';
      lockin_import_item_type: 'page' | 'task';
      lockin_import_source: 'notion';
      lockin_import_status: 'uploaded' | 'mapping' | 'review' | 'importing' | 'completed' | 'failed' | 'cancelled';
      lockin_recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
      lockin_task_priority: 'low' | 'medium' | 'high' | 'urgent';
      lockin_theme: 'dark' | 'light';
    };
    CompositeTypes: Record<string, never>;
  };
};
