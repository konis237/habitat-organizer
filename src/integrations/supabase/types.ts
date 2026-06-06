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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contrats: {
        Row: {
          created_at: string
          date_debut: string
          date_fin: string | null
          eau_mensuelle: number
          id: string
          locataire_id: string
          loyer_mensuel: number
          mois_payes_avance: number
          premier_mois_paye: boolean
          prochaine_echeance: string
          propriete_id: string
          statut: string
        }
        Insert: {
          created_at?: string
          date_debut: string
          date_fin?: string | null
          eau_mensuelle?: number
          id?: string
          locataire_id: string
          loyer_mensuel: number
          mois_payes_avance?: number
          premier_mois_paye?: boolean
          prochaine_echeance: string
          propriete_id: string
          statut?: string
        }
        Update: {
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          eau_mensuelle?: number
          id?: string
          locataire_id?: string
          loyer_mensuel?: number
          mois_payes_avance?: number
          premier_mois_paye?: boolean
          prochaine_echeance?: string
          propriete_id?: string
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrats_locataire_id_fkey"
            columns: ["locataire_id"]
            isOneToOne: false
            referencedRelation: "locataires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_propriete_id_fkey"
            columns: ["propriete_id"]
            isOneToOne: false
            referencedRelation: "proprietes"
            referencedColumns: ["id"]
          },
        ]
      }
      factures_eau: {
        Row: {
          contrat_id: string
          created_at: string
          date_echeance: string
          id: string
          montant: number
          montant_paye: number
          periode: string
          reste: number | null
          statut: string
        }
        Insert: {
          contrat_id: string
          created_at?: string
          date_echeance: string
          id?: string
          montant: number
          montant_paye?: number
          periode: string
          reste?: number | null
          statut?: string
        }
        Update: {
          contrat_id?: string
          created_at?: string
          date_echeance?: string
          id?: string
          montant?: number
          montant_paye?: number
          periode?: string
          reste?: number | null
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_eau_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "contrats"
            referencedColumns: ["id"]
          },
        ]
      }
      locataires: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nom: string
          numero_cni: string | null
          prenom: string
          telephone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nom: string
          numero_cni?: string | null
          prenom: string
          telephone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          numero_cni?: string | null
          prenom?: string
          telephone?: string | null
        }
        Relationships: []
      }
      loyers: {
        Row: {
          contrat_id: string
          created_at: string
          date_echeance: string
          id: string
          montant: number
          montant_paye: number
          periode: string
          reste: number | null
          statut: string
        }
        Insert: {
          contrat_id: string
          created_at?: string
          date_echeance: string
          id?: string
          montant: number
          montant_paye?: number
          periode: string
          reste?: number | null
          statut?: string
        }
        Update: {
          contrat_id?: string
          created_at?: string
          date_echeance?: string
          id?: string
          montant?: number
          montant_paye?: number
          periode?: string
          reste?: number | null
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyers_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "contrats"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          created_at: string
          date_paiement: string
          document_id: string
          id: string
          montant: number
          observation: string | null
          type_document: string
        }
        Insert: {
          created_at?: string
          date_paiement?: string
          document_id: string
          id?: string
          montant: number
          observation?: string | null
          type_document: string
        }
        Update: {
          created_at?: string
          date_paiement?: string
          document_id?: string
          id?: string
          montant?: number
          observation?: string | null
          type_document?: string
        }
        Relationships: []
      }
      proprietes: {
        Row: {
          adresse: string
          created_at: string
          id: string
          montant_loyer: number
          nom: string
          statut: string
        }
        Insert: {
          adresse: string
          created_at?: string
          id?: string
          montant_loyer?: number
          nom: string
          statut?: string
        }
        Update: {
          adresse?: string
          created_at?: string
          id?: string
          montant_loyer?: number
          nom?: string
          statut?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
