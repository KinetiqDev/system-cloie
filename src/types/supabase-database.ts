export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      academic_period_readiness_snapshots: {
        Row: {
          contexts: Json
          created_at: string
          id: string
          period_id: string
          program_totals: Json
        }
        Insert: {
          contexts: Json
          created_at?: string
          id?: string
          period_id: string
          program_totals: Json
        }
        Update: {
          contexts?: Json
          created_at?: string
          id?: string
          period_id?: string
          program_totals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "academic_period_readiness_snapshots_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: true
            referencedRelation: "academic_term_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_term_instances: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          school_year_id: string
          semester: Database["public"]["Enums"]["academic_semester"]
          start_date: string | null
          status: Database["public"]["Enums"]["academic_period_status"]
          term: Database["public"]["Enums"]["academic_term"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          school_year_id: string
          semester: Database["public"]["Enums"]["academic_semester"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["academic_period_status"]
          term?: Database["public"]["Enums"]["academic_term"] | null
          updated_at: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          school_year_id?: string
          semester?: Database["public"]["Enums"]["academic_semester"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["academic_period_status"]
          term?: Database["public"]["Enums"]["academic_term"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_term_instances_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_profiles: {
        Row: {
          created_at: string
          graduation_year: number
          id: string
          major_id: string | null
          program_id: string
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          created_at?: string
          graduation_year: number
          id?: string
          major_id?: string | null
          program_id: string
          updated_at: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          created_at?: string
          graduation_year?: number
          id?: string
          major_id?: string | null
          program_id?: string
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "alumni_profiles_major_id_program_id_fkey"
            columns: ["major_id", "program_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id", "program_id"]
          },
          {
            foreignKeyName: "alumni_profiles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      central_deployments: {
        Row: {
          activation_at: string | null
          created_at: string
          deadline_at: string | null
          deployment_name: string
          id: string
          instrument_version_id: string
          major_id: string | null
          program_id: string | null
          status: Database["public"]["Enums"]["DeploymentStatus"]
          target_stakeholder: Database["public"]["Enums"]["TargetStakeholder"]
          term: Database["public"]["Enums"]["academic_term"] | null
          term_instance_id: string
          updated_at: string
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Insert: {
          activation_at?: string | null
          created_at?: string
          deadline_at?: string | null
          deployment_name: string
          id?: string
          instrument_version_id: string
          major_id?: string | null
          program_id?: string | null
          status: Database["public"]["Enums"]["DeploymentStatus"]
          target_stakeholder: Database["public"]["Enums"]["TargetStakeholder"]
          term?: Database["public"]["Enums"]["academic_term"] | null
          term_instance_id: string
          updated_at: string
          year_level?: Database["public"]["Enums"]["year_level"] | null
        }
        Update: {
          activation_at?: string | null
          created_at?: string
          deadline_at?: string | null
          deployment_name?: string
          id?: string
          instrument_version_id?: string
          major_id?: string | null
          program_id?: string | null
          status?: Database["public"]["Enums"]["DeploymentStatus"]
          target_stakeholder?: Database["public"]["Enums"]["TargetStakeholder"]
          term?: Database["public"]["Enums"]["academic_term"] | null
          term_instance_id?: string
          updated_at?: string
          year_level?: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "central_deployments_instrument_version_id_fkey"
            columns: ["instrument_version_id"]
            isOneToOne: false
            referencedRelation: "instrument_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "central_deployments_major_id_fkey"
            columns: ["major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "central_deployments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "central_deployments_term_instance_id_fkey"
            columns: ["term_instance_id"]
            isOneToOne: false
            referencedRelation: "academic_term_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      cilo_mappings: {
        Row: {
          cilo_id: string
          created_at: string
          go_id: string
          id: string
        }
        Insert: {
          cilo_id: string
          created_at?: string
          go_id: string
          id?: string
        }
        Update: {
          cilo_id?: string
          created_at?: string
          go_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cilo_mappings_cilo_id_fkey"
            columns: ["cilo_id"]
            isOneToOne: false
            referencedRelation: "cilos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cilo_mappings_go_id_fkey"
            columns: ["go_id"]
            isOneToOne: false
            referencedRelation: "gos"
            referencedColumns: ["id"]
          },
        ]
      }
      cilos: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          description: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          is_active?: boolean
          updated_at: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cilos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cilos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_assignment_memberships: {
        Row: {
          course_assignment_id: string
          course_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          program_id: string
          removed_at: string | null
          removed_by: string | null
          student_user_id: string
          term_instance_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          course_assignment_id: string
          course_id: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          program_id: string
          removed_at?: string | null
          removed_by?: string | null
          student_user_id: string
          term_instance_id: string
          updated_at: string
          updated_by: string
        }
        Update: {
          course_assignment_id?: string
          course_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          program_id?: string
          removed_at?: string | null
          removed_by?: string | null
          student_user_id?: string
          term_instance_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_assignment_memberships_course_assignment_id_course__fkey"
            columns: [
              "course_assignment_id",
              "course_id",
              "term_instance_id",
              "program_id",
            ]
            isOneToOne: false
            referencedRelation: "course_assignments"
            referencedColumns: [
              "id",
              "course_id",
              "term_instance_id",
              "program_id",
            ]
          },
          {
            foreignKeyName: "course_assignment_memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignment_memberships_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignment_memberships_student_user_id_fkey"
            columns: ["student_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignment_memberships_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_assignments: {
        Row: {
          assigned_by: string | null
          course_id: string
          created_at: string
          curriculum_course_id: string | null
          faculty_id: string
          id: string
          is_active: boolean
          program_id: string
          section: Database["public"]["Enums"]["student_section"]
          term_instance_id: string
          updated_at: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Insert: {
          assigned_by?: string | null
          course_id: string
          created_at?: string
          curriculum_course_id?: string | null
          faculty_id: string
          id?: string
          is_active?: boolean
          program_id: string
          section: Database["public"]["Enums"]["student_section"]
          term_instance_id: string
          updated_at: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Update: {
          assigned_by?: string | null
          course_id?: string
          created_at?: string
          curriculum_course_id?: string | null
          faculty_id?: string
          id?: string
          is_active?: boolean
          program_id?: string
          section?: Database["public"]["Enums"]["student_section"]
          term_instance_id?: string
          updated_at?: string
          year_level?: Database["public"]["Enums"]["year_level"]
        }
        Relationships: [
          {
            foreignKeyName: "course_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_curriculum_course_id_fkey"
            columns: ["curriculum_course_id"]
            isOneToOne: false
            referencedRelation: "curriculum_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_term_instance_id_fkey"
            columns: ["term_instance_id"]
            isOneToOne: false
            referencedRelation: "academic_term_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      course_bound_cilo_question_bindings: {
        Row: {
          cilo_description_snapshot: string
          cilo_id: string | null
          course_bound_evaluation_id: string
          created_at: string
          id: string
          item_key: string
          question_prompt_snapshot: string
          section_key: string
          updated_at: string
        }
        Insert: {
          cilo_description_snapshot: string
          cilo_id?: string | null
          course_bound_evaluation_id: string
          created_at?: string
          id?: string
          item_key: string
          question_prompt_snapshot: string
          section_key: string
          updated_at: string
        }
        Update: {
          cilo_description_snapshot?: string
          cilo_id?: string | null
          course_bound_evaluation_id?: string
          created_at?: string
          id?: string
          item_key?: string
          question_prompt_snapshot?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_bound_cilo_question_bindings_cilo_id_fkey"
            columns: ["cilo_id"]
            isOneToOne: false
            referencedRelation: "cilos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_bound_cilo_question_bindings_course_bound_evaluation_id_"
            columns: ["course_bound_evaluation_id"]
            isOneToOne: false
            referencedRelation: "course_bound_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_bound_evaluation_exclusions: {
        Row: {
          category: Database["public"]["Enums"]["CourseBoundEvaluationExclusionCategory"]
          course_assignment_id: string
          course_assignment_membership_id: string
          course_bound_evaluation_id: string
          excluded_at: string
          excluded_by: string
          id: string
          other_explanation: string | null
          reversal_category:
            | Database["public"]["Enums"]["CourseBoundEvaluationExclusionReversalCategory"]
            | null
          reversal_other_explanation: string | null
          reversed_at: string | null
          reversed_by: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["CourseBoundEvaluationExclusionCategory"]
          course_assignment_id: string
          course_assignment_membership_id: string
          course_bound_evaluation_id: string
          excluded_at?: string
          excluded_by: string
          id?: string
          other_explanation?: string | null
          reversal_category?:
            | Database["public"]["Enums"]["CourseBoundEvaluationExclusionReversalCategory"]
            | null
          reversal_other_explanation?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["CourseBoundEvaluationExclusionCategory"]
          course_assignment_id?: string
          course_assignment_membership_id?: string
          course_bound_evaluation_id?: string
          excluded_at?: string
          excluded_by?: string
          id?: string
          other_explanation?: string | null
          reversal_category?:
            | Database["public"]["Enums"]["CourseBoundEvaluationExclusionReversalCategory"]
            | null
          reversal_other_explanation?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_bound_evaluation_exclusions_actor_fkey"
            columns: ["excluded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_bound_evaluation_exclusions_evaluation_fkey"
            columns: ["course_bound_evaluation_id", "course_assignment_id"]
            isOneToOne: false
            referencedRelation: "course_bound_evaluations"
            referencedColumns: ["id", "course_assignment_id"]
          },
          {
            foreignKeyName: "course_bound_evaluation_exclusions_membership_fkey"
            columns: ["course_assignment_membership_id", "course_assignment_id"]
            isOneToOne: false
            referencedRelation: "course_assignment_memberships"
            referencedColumns: ["id", "course_assignment_id"]
          },
          {
            foreignKeyName: "course_bound_evaluation_exclusions_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_bound_evaluation_targets: {
        Row: {
          course_bound_evaluation_id: string
          created_at: string
          id: string
          program_id: string
          updated_at: string
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Insert: {
          course_bound_evaluation_id: string
          created_at?: string
          id?: string
          program_id: string
          updated_at: string
          year_level?: Database["public"]["Enums"]["year_level"] | null
        }
        Update: {
          course_bound_evaluation_id?: string
          created_at?: string
          id?: string
          program_id?: string
          updated_at?: string
          year_level?: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "course_bound_evaluation_targets_course_bound_evaluation_id_fkey"
            columns: ["course_bound_evaluation_id"]
            isOneToOne: false
            referencedRelation: "course_bound_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_bound_evaluation_targets_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      course_bound_evaluations: {
        Row: {
          activation_at: string | null
          cilos_snapshot: Json
          course_assignment_id: string
          course_info_snapshot: Json
          created_at: string
          deadline_at: string | null
          deployed_by: string | null
          deployment_name: string
          id: string
          instrument_version_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["DeploymentStatus"]
          term_instance_id: string
          updated_at: string
        }
        Insert: {
          activation_at?: string | null
          cilos_snapshot: Json
          course_assignment_id: string
          course_info_snapshot: Json
          created_at?: string
          deadline_at?: string | null
          deployed_by?: string | null
          deployment_name: string
          id?: string
          instrument_version_id: string
          published_at?: string | null
          status: Database["public"]["Enums"]["DeploymentStatus"]
          term_instance_id: string
          updated_at: string
        }
        Update: {
          activation_at?: string | null
          cilos_snapshot?: Json
          course_assignment_id?: string
          course_info_snapshot?: Json
          created_at?: string
          deadline_at?: string | null
          deployed_by?: string | null
          deployment_name?: string
          id?: string
          instrument_version_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["DeploymentStatus"]
          term_instance_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_bound_evaluations_course_assignment_id_fkey"
            columns: ["course_assignment_id"]
            isOneToOne: false
            referencedRelation: "course_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_bound_evaluations_deployed_by_fkey"
            columns: ["deployed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_bound_evaluations_instrument_version_id_fkey"
            columns: ["instrument_version_id"]
            isOneToOne: false
            referencedRelation: "instrument_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_bound_evaluations_term_instance_id_fkey"
            columns: ["term_instance_id"]
            isOneToOne: false
            referencedRelation: "academic_term_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          course_scope: Database["public"]["Enums"]["CourseScope"]
          created_at: string
          default_semester:
            | Database["public"]["Enums"]["academic_semester"]
            | null
          default_term: Database["public"]["Enums"]["academic_term"] | null
          default_year_level: Database["public"]["Enums"]["year_level"] | null
          description: string | null
          id: string
          is_active: boolean
          major_id: string | null
          program_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          course_scope?: Database["public"]["Enums"]["CourseScope"]
          created_at?: string
          default_semester?:
            | Database["public"]["Enums"]["academic_semester"]
            | null
          default_term?: Database["public"]["Enums"]["academic_term"] | null
          default_year_level?: Database["public"]["Enums"]["year_level"] | null
          description?: string | null
          id?: string
          is_active?: boolean
          major_id?: string | null
          program_id?: string | null
          title: string
          updated_at: string
        }
        Update: {
          code?: string
          course_scope?: Database["public"]["Enums"]["CourseScope"]
          created_at?: string
          default_semester?:
            | Database["public"]["Enums"]["academic_semester"]
            | null
          default_term?: Database["public"]["Enums"]["academic_term"] | null
          default_year_level?: Database["public"]["Enums"]["year_level"] | null
          description?: string | null
          id?: string
          is_active?: boolean
          major_id?: string | null
          program_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_major_id_fkey"
            columns: ["major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_courses: {
        Row: {
          course_code_snapshot: string
          course_id: string
          course_title_snapshot: string
          created_at: string
          curriculum_version_id: string
          id: string
          semester: Database["public"]["Enums"]["academic_semester"]
          term: Database["public"]["Enums"]["academic_term"] | null
          updated_at: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Insert: {
          course_code_snapshot: string
          course_id: string
          course_title_snapshot: string
          created_at?: string
          curriculum_version_id: string
          id?: string
          semester: Database["public"]["Enums"]["academic_semester"]
          term?: Database["public"]["Enums"]["academic_term"] | null
          updated_at: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Update: {
          course_code_snapshot?: string
          course_id?: string
          course_title_snapshot?: string
          created_at?: string
          curriculum_version_id?: string
          id?: string
          semester?: Database["public"]["Enums"]["academic_semester"]
          term?: Database["public"]["Enums"]["academic_term"] | null
          updated_at?: string
          year_level?: Database["public"]["Enums"]["year_level"]
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_courses_curriculum_version_id_fkey"
            columns: ["curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_versions: {
        Row: {
          code: string
          created_at: string
          effective_from_school_year_id: string | null
          id: string
          major_id: string | null
          name: string | null
          program_id: string
          published_at: string | null
          published_by: string | null
          status: Database["public"]["Enums"]["curriculum_version_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          effective_from_school_year_id?: string | null
          id?: string
          major_id?: string | null
          name?: string | null
          program_id: string
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["curriculum_version_status"]
          updated_at: string
        }
        Update: {
          code?: string
          created_at?: string
          effective_from_school_year_id?: string | null
          id?: string
          major_id?: string | null
          name?: string | null
          program_id?: string
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["curriculum_version_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_versions_effective_from_school_year_id_fkey"
            columns: ["effective_from_school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_versions_major_id_program_id_fkey"
            columns: ["major_id", "program_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id", "program_id"]
          },
          {
            foreignKeyName: "curriculum_versions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_assignments: {
        Row: {
          assigned_at: string
          central_deployment_id: string | null
          course_bound_id: string | null
          id: string
          respondent_id: string
        }
        Insert: {
          assigned_at?: string
          central_deployment_id?: string | null
          course_bound_id?: string | null
          id?: string
          respondent_id: string
        }
        Update: {
          assigned_at?: string
          central_deployment_id?: string | null
          course_bound_id?: string | null
          id?: string
          respondent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_assignments_central_deployment_id_fkey"
            columns: ["central_deployment_id"]
            isOneToOne: false
            referencedRelation: "central_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_assignments_course_bound_id_fkey"
            columns: ["course_bound_id"]
            isOneToOne: false
            referencedRelation: "course_bound_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_assignments_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      external_stakeholder_invites: {
        Row: {
          accepted_at: string | null
          company_name: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          invitee_name: string | null
          note: string | null
          program_id: string | null
          role: Database["public"]["Enums"]["SystemRole"]
          sent_at: string | null
          status: Database["public"]["Enums"]["InviteStatus"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          invitee_name?: string | null
          note?: string | null
          program_id?: string | null
          role: Database["public"]["Enums"]["SystemRole"]
          sent_at?: string | null
          status?: Database["public"]["Enums"]["InviteStatus"]
          updated_at: string
        }
        Update: {
          accepted_at?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          invitee_name?: string | null
          note?: string | null
          program_id?: string | null
          role?: Database["public"]["Enums"]["SystemRole"]
          sent_at?: string | null
          status?: Database["public"]["Enums"]["InviteStatus"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_stakeholder_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_stakeholder_invites_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_program_affiliations: {
        Row: {
          created_at: string
          faculty_id: string
          id: string
          is_active: boolean
          is_primary: boolean
          program_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          faculty_id: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          program_id: string
          updated_at: string
        }
        Update: {
          created_at?: string
          faculty_id?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_program_affiliations_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_program_affiliations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      gos: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          order: number
          program_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          order: number
          program_id: string
          updated_at: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          order?: number
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gos_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_partner_profiles: {
        Row: {
          company_name: string
          created_at: string
          id: string
          position: string | null
          program_id: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          position?: string | null
          program_id?: string | null
          updated_at: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          position?: string | null
          program_id?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "industry_partner_profiles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industry_partner_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      instrument_template_cilo_question_bindings: {
        Row: {
          cilo_description_snapshot: string
          cilo_id: string | null
          created_at: string
          id: string
          item_key: string
          question_prompt_snapshot: string
          section_key: string
          template_id: string
          updated_at: string
        }
        Insert: {
          cilo_description_snapshot: string
          cilo_id?: string | null
          created_at?: string
          id?: string
          item_key: string
          question_prompt_snapshot: string
          section_key: string
          template_id: string
          updated_at: string
        }
        Update: {
          cilo_description_snapshot?: string
          cilo_id?: string | null
          created_at?: string
          id?: string
          item_key?: string
          question_prompt_snapshot?: string
          section_key?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instrument_template_cilo_question_bindings_cilo_id_fkey"
            columns: ["cilo_id"]
            isOneToOne: false
            referencedRelation: "cilos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrument_template_cilo_question_bindings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "instrument_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      instrument_templates: {
        Row: {
          bound_course_id: string | null
          bound_major_id: string | null
          bound_program_id: string | null
          code: string
          created_at: string
          description: string | null
          faculty_owner_id: string | null
          id: string
          is_active: boolean
          is_faculty_accessible: boolean
          name: string
          program_id: string | null
          source_template_id: string | null
          structure: Json
          template_type: Database["public"]["Enums"]["EvaluationTemplateType"]
          updated_at: string
        }
        Insert: {
          bound_course_id?: string | null
          bound_major_id?: string | null
          bound_program_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          faculty_owner_id?: string | null
          id?: string
          is_active?: boolean
          is_faculty_accessible?: boolean
          name: string
          program_id?: string | null
          source_template_id?: string | null
          structure: Json
          template_type?: Database["public"]["Enums"]["EvaluationTemplateType"]
          updated_at: string
        }
        Update: {
          bound_course_id?: string | null
          bound_major_id?: string | null
          bound_program_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          faculty_owner_id?: string | null
          id?: string
          is_active?: boolean
          is_faculty_accessible?: boolean
          name?: string
          program_id?: string | null
          source_template_id?: string | null
          structure?: Json
          template_type?: Database["public"]["Enums"]["EvaluationTemplateType"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instrument_templates_bound_course_id_fkey"
            columns: ["bound_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrument_templates_bound_major_id_fkey"
            columns: ["bound_major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrument_templates_bound_program_id_fkey"
            columns: ["bound_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrument_templates_faculty_owner_id_fkey"
            columns: ["faculty_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrument_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrument_templates_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "instrument_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      instrument_versions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          structure_snapshot: Json
          template_id: string
          updated_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          structure_snapshot: Json
          template_id: string
          updated_at: string
          version_number: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          structure_snapshot?: Json
          template_id?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "instrument_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "instrument_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      majors: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          program_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          program_id: string
          updated_at: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "majors_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_head_assignments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          program_head_id: string
          program_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          program_head_id: string
          program_id: string
          updated_at: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          program_head_id?: string
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_head_assignments_program_head_id_fkey"
            columns: ["program_head_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_head_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      qualitative_response_items: {
        Row: {
          created_at: string
          id: string
          prompt_key: string
          response_id: string
          section_key: string
          text_content: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt_key: string
          response_id: string
          section_key: string
          text_content: string
          updated_at: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt_key?: string
          response_id?: string
          section_key?: string
          text_content?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualitative_response_items_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      quantitative_response_items: {
        Row: {
          cilo_question_binding_id: string | null
          created_at: string
          id: string
          item_key: string
          rating_value: number
          response_id: string
          section_key: string
          updated_at: string
        }
        Insert: {
          cilo_question_binding_id?: string | null
          created_at?: string
          id?: string
          item_key: string
          rating_value: number
          response_id: string
          section_key: string
          updated_at: string
        }
        Update: {
          cilo_question_binding_id?: string | null
          created_at?: string
          id?: string
          item_key?: string
          rating_value?: number
          response_id?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quantitative_response_items_cilo_question_binding_id_fkey"
            columns: ["cilo_question_binding_id"]
            isOneToOne: false
            referencedRelation: "course_bound_cilo_question_bindings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quantitative_response_items_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          assignment_id: string
          created_at: string
          deployment_id: string
          deployment_type: Database["public"]["Enums"]["DeploymentType"]
          id: string
          respondent_id: string
          status: Database["public"]["Enums"]["ResponseStatus"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          deployment_id: string
          deployment_type: Database["public"]["Enums"]["DeploymentType"]
          id?: string
          respondent_id: string
          status: Database["public"]["Enums"]["ResponseStatus"]
          submitted_at?: string | null
          updated_at: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          deployment_id?: string
          deployment_type?: Database["public"]["Enums"]["DeploymentType"]
          id?: string
          respondent_id?: string
          status?: Database["public"]["Enums"]["ResponseStatus"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "evaluation_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      school_years: {
        Row: {
          active_semester:
            | Database["public"]["Enums"]["academic_semester"]
            | null
          active_semester_activated_at: string | null
          active_semester_activated_by: string | null
          archived_at: string | null
          archived_by: string | null
          code: string
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          is_archived: boolean
          start_date: string | null
          updated_at: string
        }
        Insert: {
          active_semester?:
            | Database["public"]["Enums"]["academic_semester"]
            | null
          active_semester_activated_at?: string | null
          active_semester_activated_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
          code: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          start_date?: string | null
          updated_at: string
        }
        Update: {
          active_semester?:
            | Database["public"]["Enums"]["academic_semester"]
            | null
          active_semester_activated_at?: string | null
          active_semester_activated_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
          code?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_years_active_semester_activated_by_fkey"
            columns: ["active_semester_activated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_years_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_academic_profiles: {
        Row: {
          created_at: string
          id: string
          major_id: string | null
          program_id: string
          student_id_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          major_id?: string | null
          program_id: string
          student_id_number?: string | null
          updated_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          major_id?: string | null
          program_id?: string
          student_id_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_academic_profiles_major_id_fkey"
            columns: ["major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_academic_profiles_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_academic_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_enrollments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          major_id: string | null
          program_id: string
          section: Database["public"]["Enums"]["student_section"] | null
          source: Database["public"]["Enums"]["enrollment_source"]
          student_user_id: string
          term_instance_id: string
          updated_at: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          major_id?: string | null
          program_id: string
          section?: Database["public"]["Enums"]["student_section"] | null
          source: Database["public"]["Enums"]["enrollment_source"]
          student_user_id: string
          term_instance_id: string
          updated_at: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          major_id?: string | null
          program_id?: string
          section?: Database["public"]["Enums"]["student_section"] | null
          source?: Database["public"]["Enums"]["enrollment_source"]
          student_user_id?: string
          term_instance_id?: string
          updated_at?: string
          year_level?: Database["public"]["Enums"]["year_level"]
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_major_id_fkey"
            columns: ["major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_user_id_fkey"
            columns: ["student_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_term_instance_id_fkey"
            columns: ["term_instance_id"]
            isOneToOne: false
            referencedRelation: "academic_term_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          id: string
          role: Database["public"]["Enums"]["SystemRole"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          role: Database["public"]["Enums"]["SystemRole"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          role?: Database["public"]["Enums"]["SystemRole"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          updated_at: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      academic_period_status: "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED"
      academic_semester: "1ST" | "2ND" | "SUMMER"
      academic_term: "FIRST_TERM" | "SECOND_TERM"
      CourseBoundEvaluationExclusionCategory:
        | "APPROVED_ACCOMMODATION"
        | "NOT_TAKING_ASSESSMENT"
        | "ADMINISTRATIVE_EXCEPTION"
        | "OTHER"
      CourseBoundEvaluationExclusionReversalCategory:
        | "EXCLUDED_IN_ERROR"
        | "ELIGIBILITY_CORRECTED"
        | "APPROVED_LATE_PARTICIPATION"
        | "OTHER"
      CourseScope: "GENERAL_EDUCATION" | "PROGRAM_SPECIFIC"
      curriculum_version_status: "DRAFT" | "PUBLISHED" | "RETIRED"
      DeploymentStatus: "DRAFT" | "SCHEDULED" | "ACTIVE" | "CLOSED" | "ARCHIVED"
      DeploymentType: "COURSE_BOUND" | "CENTRAL"
      enrollment_source: "ONBOARDING" | "ROLLOVER" | "SECRETARY"
      EvaluationTemplateType: "PROGRAM_WIDE" | "COURSE_BOUND"
      InviteStatus: "DRAFT" | "SENT" | "ACCEPTED" | "REVOKED"
      ResponseStatus: "IN_PROGRESS" | "SUBMITTED"
      student_section: "MORNING" | "AFTERNOON" | "EVENING"
      SystemRole:
        | "SECRETARY"
        | "DEAN"
        | "PROGRAM_HEAD"
        | "FACULTY"
        | "STUDENT"
        | "ALUMNI"
        | "INDUSTRY_PARTNER"
      TargetStakeholder: "STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER"
      verification_status: "PENDING" | "APPROVED" | "REJECTED"
      year_level: "FIRST_YEAR" | "SECOND_YEAR" | "THIRD_YEAR" | "FOURTH_YEAR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      academic_period_status: ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"],
      academic_semester: ["1ST", "2ND", "SUMMER"],
      academic_term: ["FIRST_TERM", "SECOND_TERM"],
      CourseBoundEvaluationExclusionCategory: [
        "APPROVED_ACCOMMODATION",
        "NOT_TAKING_ASSESSMENT",
        "ADMINISTRATIVE_EXCEPTION",
        "OTHER",
      ],
      CourseBoundEvaluationExclusionReversalCategory: [
        "EXCLUDED_IN_ERROR",
        "ELIGIBILITY_CORRECTED",
        "APPROVED_LATE_PARTICIPATION",
        "OTHER",
      ],
      CourseScope: ["GENERAL_EDUCATION", "PROGRAM_SPECIFIC"],
      curriculum_version_status: ["DRAFT", "PUBLISHED", "RETIRED"],
      DeploymentStatus: ["DRAFT", "SCHEDULED", "ACTIVE", "CLOSED", "ARCHIVED"],
      DeploymentType: ["COURSE_BOUND", "CENTRAL"],
      enrollment_source: ["ONBOARDING", "ROLLOVER", "SECRETARY"],
      EvaluationTemplateType: ["PROGRAM_WIDE", "COURSE_BOUND"],
      InviteStatus: ["DRAFT", "SENT", "ACCEPTED", "REVOKED"],
      ResponseStatus: ["IN_PROGRESS", "SUBMITTED"],
      student_section: ["MORNING", "AFTERNOON", "EVENING"],
      SystemRole: [
        "SECRETARY",
        "DEAN",
        "PROGRAM_HEAD",
        "FACULTY",
        "STUDENT",
        "ALUMNI",
        "INDUSTRY_PARTNER",
      ],
      TargetStakeholder: ["STUDENT", "ALUMNI", "INDUSTRY_PARTNER"],
      verification_status: ["PENDING", "APPROVED", "REJECTED"],
      year_level: ["FIRST_YEAR", "SECOND_YEAR", "THIRD_YEAR", "FOURTH_YEAR"],
    },
  },
} as const
