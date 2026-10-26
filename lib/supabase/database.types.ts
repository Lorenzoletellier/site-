// Généré depuis Supabase (generate_typescript_types), relations simplifiées. Régénérer après chaque migration.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Rel<FK extends string, Col extends string, Ref extends string, RefCol extends string> = {
  foreignKeyName: FK; columns: [Col]; isOneToOne: false; referencedRelation: Ref; referencedColumns: [RefCol]
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" }
  public: {
    Tables: {
      cart_items: {
        Row: { added_at: string; price_cents_at_add: number | null; product_id: number; quantity: number; user_id: string }
        Insert: { added_at?: string; price_cents_at_add?: number | null; product_id: number; quantity: number; user_id: string }
        Update: { added_at?: string; product_id?: number; quantity?: number; user_id?: string }
        Relationships: [Rel<"cart_items_product_id_fkey", "product_id", "products", "id">]
      }
      packs: {
        Row: {
          compare_at_price_cents: number | null; created_at: string; id: number; is_customizable: boolean; name: string
          price_cents: number; product_id: number | null; size: number; slug: string; status: Database["public"]["Enums"]["product_status"]
        }
        Insert: {
          compare_at_price_cents?: number | null; created_at?: string; id?: never; is_customizable?: boolean; name: string
          price_cents: number; product_id?: number | null; size: number; slug: string; status?: Database["public"]["Enums"]["product_status"]
        }
        Update: {
          compare_at_price_cents?: number | null; created_at?: string; id?: never; is_customizable?: boolean; name?: string
          price_cents?: number; product_id?: number | null; size?: number; slug?: string; status?: Database["public"]["Enums"]["product_status"]
        }
        Relationships: []
      }
      cart_packs: {
        Row: { added_at: string; id: number; pack_id: number; price_cents_at_add: number | null; quantity: number; selections: Json; user_id: string }
        Insert: { added_at?: string; id?: never; pack_id: number; price_cents_at_add?: number | null; quantity: number; selections: Json; user_id: string }
        Update: { added_at?: string; id?: never; pack_id?: number; price_cents_at_add?: number | null; quantity?: number; selections?: Json; user_id?: string }
        Relationships: [Rel<"cart_packs_pack_id_fkey", "pack_id", "packs", "id">]
      }
      stock_movements: {
        Row: {
          created_at: string; created_by: string | null; delta: number; id: number; note: string | null; order_id: number | null
          product_id: number; reason: Database["public"]["Enums"]["stock_reason"]
        }
        Insert: {
          created_at?: string; created_by?: string | null; delta: number; id?: never; note?: string | null; order_id?: number | null
          product_id: number; reason: Database["public"]["Enums"]["stock_reason"]
        }
        Update: {
          created_at?: string; created_by?: string | null; delta?: number; id?: never; note?: string | null; order_id?: number | null
          product_id?: number; reason?: Database["public"]["Enums"]["stock_reason"]
        }
        Relationships: [Rel<"stock_movements_product_id_fkey", "product_id", "products", "id">]
      }
      categories: {
        Row: { description: string | null; id: number; name: string; slug: string }
        Insert: { description?: string | null; id?: never; name: string; slug: string }
        Update: { description?: string | null; id?: never; name?: string; slug?: string }
        Relationships: []
      }
      contact_messages: {
        Row: { created_at: string; email: string; first_name: string; id: number; is_handled: boolean; message: string; subject: string }
        Insert: { created_at?: string; email: string; first_name: string; id?: never; is_handled?: boolean; message: string; subject: string }
        Update: { created_at?: string; email?: string; first_name?: string; id?: never; is_handled?: boolean; message?: string; subject?: string }
        Relationships: []
      }
      coupons: {
        Row: { code: string; expires_at: string | null; is_active: boolean; percent_off: number }
        Insert: { code: string; expires_at?: string | null; is_active?: boolean; percent_off: number }
        Update: { code?: string; expires_at?: string | null; is_active?: boolean; percent_off?: number }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: { email: string; subscribed_at: string }
        Insert: { email: string; subscribed_at?: string }
        Update: { email?: string; subscribed_at?: string }
        Relationships: []
      }
      order_items: {
        Row: {
          id: number; order_id: number; pack_id: number | null; pack_selections: Json | null; product_id: number | null
          product_name: string; quantity: number; unit_price_cents: number
        }
        Insert: { id?: never; order_id: number; product_id?: number | null; product_name: string; quantity: number; unit_price_cents: number }
        Update: { id?: never; order_id?: number; product_id?: number | null; product_name?: string; quantity?: number; unit_price_cents?: number }
        Relationships: [
          Rel<"order_items_order_id_fkey", "order_id", "orders", "id">,
          Rel<"order_items_product_id_fkey", "product_id", "products", "id">,
        ]
      }
      shipping_methods: {
        Row: {
          carrier_id: number | null; code: string; description: string; extra_fee_cents: number; free_threshold_cents: number | null; id: number
          is_active: boolean; kind: Database["public"]["Enums"]["shipping_kind"]; max_days: number; max_weight_g: number | null; min_days: number
          name: string; price_cents: number; sort_order: number; zone_id: number
        }
        Insert: {
          carrier_id?: number | null; code: string; description?: string; extra_fee_cents?: number; free_threshold_cents?: number | null; id?: never
          is_active?: boolean; kind: Database["public"]["Enums"]["shipping_kind"]; max_days: number; max_weight_g?: number | null; min_days: number
          name: string; price_cents: number; sort_order?: number; zone_id: number
        }
        Update: {
          carrier_id?: number | null; code?: string; description?: string; extra_fee_cents?: number; free_threshold_cents?: number | null; id?: never
          is_active?: boolean; kind?: Database["public"]["Enums"]["shipping_kind"]; max_days?: number; max_weight_g?: number | null; min_days?: number
          name?: string; price_cents?: number; sort_order?: number; zone_id?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          coupon_code: string | null; created_at: string; discount_cents: number; id: number
          shipping_address: string; shipping_cents: number; shipping_city: string; shipping_name: string; shipping_zip: string
          status: Database["public"]["Enums"]["order_status"]; subtotal_cents: number; total_cents: number; user_id: string | null
          shipping_method_id: number | null; shipping_kind: Database["public"]["Enums"]["shipping_kind"] | null; relay_point_label: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]; fulfillment_status: Database["public"]["Enums"]["fulfillment_status"]
          delivery_status: Database["public"]["Enums"]["delivery_status"]; email: string | null
        }
        Insert: {
          coupon_code?: string | null; created_at?: string; discount_cents?: number; id?: never
          shipping_address: string; shipping_cents?: number; shipping_city: string; shipping_name: string; shipping_zip: string
          status?: Database["public"]["Enums"]["order_status"]; subtotal_cents: number; total_cents: number; user_id: string
        }
        Update: {
          coupon_code?: string | null; created_at?: string; discount_cents?: number; id?: never
          shipping_address?: string; shipping_cents?: number; shipping_city?: string; shipping_name?: string; shipping_zip?: string
          status?: Database["public"]["Enums"]["order_status"]; subtotal_cents?: number; total_cents?: number; user_id?: string
        }
        Relationships: [Rel<"orders_coupon_code_fkey", "coupon_code", "coupons", "code">]
      }
      product_views: {
        Row: { id: number; product_id: number; user_id: string | null; viewed_at: string }
        Insert: { id?: never; product_id: number; user_id?: string | null; viewed_at?: string }
        Update: { id?: never; product_id?: number; user_id?: string | null; viewed_at?: string }
        Relationships: [Rel<"product_views_product_id_fkey", "product_id", "products", "id">]
      }
      products: {
        Row: {
          compare_at_price_cents: number | null; sku: string; status: Database["public"]["Enums"]["product_status"]; volume_ml: number
          low_stock_threshold: number; updated_at: string
          accent: string; category_id: number; color: string; created_at: string; description: string; id: number
          ingredients: string[]; is_active: boolean; kcal: number; name: string; pairing: string
          pattern: Database["public"]["Enums"]["can_pattern"]; price_cents: number; secondary: string; slug: string
          stock: number; story: string; sugar_g: number; tagline: string
        }
        Insert: {
          sku: string; compare_at_price_cents?: number | null; status?: Database["public"]["Enums"]["product_status"]; volume_ml?: number
          accent: string; category_id: number; color: string; created_at?: string; description?: string; id?: never
          ingredients?: string[]; is_active?: boolean; kcal: number; name: string; pairing?: string
          pattern?: Database["public"]["Enums"]["can_pattern"]; price_cents: number; secondary: string; slug: string
          stock?: number; story?: string; sugar_g: number; tagline?: string
        }
        Update: {
          sku?: string; compare_at_price_cents?: number | null; status?: Database["public"]["Enums"]["product_status"]; volume_ml?: number
          accent?: string; category_id?: number; color?: string; created_at?: string; description?: string; id?: never
          ingredients?: string[]; is_active?: boolean; kcal?: number; name?: string; pairing?: string
          pattern?: Database["public"]["Enums"]["can_pattern"]; price_cents?: number; secondary?: string; slug?: string
          stock?: number; story?: string; sugar_g?: number; tagline?: string
        }
        Relationships: [Rel<"products_category_id_fkey", "category_id", "categories", "id">]
      }
      profiles: {
        Row: { created_at: string; full_name: string | null; id: string; role: Database["public"]["Enums"]["user_role"] }
        Insert: { created_at?: string; full_name?: string | null; id: string; role?: Database["public"]["Enums"]["user_role"] }
        Update: { created_at?: string; full_name?: string | null; id?: string; role?: Database["public"]["Enums"]["user_role"] }
        Relationships: []
      }
      reviews: {
        Row: { comment: string | null; created_at: string; id: number; product_id: number; rating: number; user_id: string }
        Insert: { comment?: string | null; created_at?: string; id?: never; product_id: number; rating: number; user_id: string }
        Update: { comment?: string | null; created_at?: string; id?: never; product_id?: number; rating?: number; user_id?: string }
        Relationships: [Rel<"reviews_product_id_fkey", "product_id", "products", "id">]
      }
      wall_messages: {
        Row: { content: string; created_at: string; id: number; is_hidden: boolean; user_id: string | null }
        Insert: { content: string; created_at?: string; id?: never; is_hidden?: boolean; user_id?: string | null }
        Update: { content?: string; created_at?: string; id?: never; is_hidden?: boolean; user_id?: string | null }
        Relationships: []
      }
    }
    Views: {
      kpi_category_sales: { Row: { category_name: string | null; revenue_cents: number | null; units_sold: number | null }; Relationships: [] }
      kpi_daily_revenue: { Row: { day: string | null; order_count: number | null; revenue_cents: number | null }; Relationships: [] }
      kpi_low_stock: { Row: { product_id: number | null; product_name: string | null; stock: number | null }; Relationships: [] }
      kpi_orders_by_status: { Row: { order_count: number | null; status: Database["public"]["Enums"]["order_status"] | null }; Relationships: [] }
      kpi_overview: {
        Row: {
          avg_order_cents: number | null; buyer_count: number | null; cans_sold: number | null; customer_count: number | null
          new_customers_30d: number | null; newsletter_count: number | null; open_contacts: number | null
          order_count: number | null; orders_30d: number | null; revenue_30d_cents: number | null; revenue_cents: number | null
        }
        Relationships: []
      }
      kpi_product_views: { Row: { product_id: number | null; product_name: string | null; units_sold: number | null; views: number | null }; Relationships: [] }
      kpi_top_products: { Row: { product_id: number | null; product_name: string | null; revenue_cents: number | null; units_sold: number | null }; Relationships: [] }
      product_catalog: {
        Row: {
          accent: string | null; avg_rating: number | null; category_id: number | null; category_name: string | null
          category_slug: string | null; color: string | null; created_at: string | null; description: string | null
          id: number | null; ingredients: string[] | null; is_active: boolean | null; kcal: number | null; name: string | null
          pairing: string | null; pattern: Database["public"]["Enums"]["can_pattern"] | null; price_cents: number | null
          review_count: number | null; secondary: string | null; slug: string | null; stock: number | null
          story: string | null; sugar_g: number | null; tagline: string | null
          status: Database["public"]["Enums"]["product_status"] | null; compare_at_price_cents: number | null; sku: string | null; volume_ml: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_purchased: { Args: { p_product_id: number }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      place_order: {
        Args:
          | { p_coupon_code?: string; p_shipping_address: string; p_shipping_city: string; p_shipping_name: string; p_shipping_zip: string }
          | {
              p_coupon_code: string | null; p_relay_point_label?: string | null; p_shipping_address: string; p_shipping_city: string
              p_shipping_method: string; p_shipping_name: string; p_shipping_zip: string
            }
        Returns: number
      }
      validate_coupon: { Args: { p_code: string }; Returns: number }
      cart_quote: { Args: { p_coupon_code?: string | null; p_shipping_method?: string | null }; Returns: Json }
    }
    Enums: {
      can_pattern: "sunburst" | "dots" | "waves" | "stripes" | "rings" | "bubbles" | "split" | "zigzag" | "checker"
      order_status: "pending" | "paid" | "shipped" | "delivered" | "cancelled"
      user_role: "client" | "admin"
      shipping_kind: "home" | "express" | "relay"
      product_status: "active" | "hidden" | "out_of_stock"
      stock_reason: "order" | "cancellation" | "restock" | "adjustment" | "return"
      payment_status: "pending" | "paid" | "failed" | "cancelled" | "refunded" | "partially_refunded"
      fulfillment_status: "unfulfilled" | "preparing" | "prepared" | "cancelled"
      delivery_status: "not_shipped" | "shipped" | "in_transit" | "delivered" | "returned" | "lost" | "damaged"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]

// Raccourcis : Tables<"products">, Views<"product_catalog">, Enums<"order_status">
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      can_pattern: ["sunburst", "dots", "waves", "stripes", "rings", "bubbles", "split", "zigzag", "checker"],
      order_status: ["pending", "paid", "shipped", "delivered", "cancelled"],
      user_role: ["client", "admin"],
    },
  },
} as const
