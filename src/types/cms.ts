export type CmsSectionLayout = 'list' | 'grid' | 'carousel' | 'pills' | 'banner' | 'text';

export interface CmsSectionFilters {
  category?: string; // slug or name
  featured_only?: boolean;
  open_only?: boolean;
  sort?: 'eta' | 'rating' | 'distance';
}

export interface CmsBanner {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
}

export interface CmsCategory {
  id: string;
  name: string;
  slug: string;
  icon_name: string;
  color_code: string;
}

export interface CmsStore {
  id: string;
  name: string;
  description: string;
  banner_image_url: string;
  logo_url?: string;
  category: string;
  rating: number;
  review_count: number;
  delivery_fee: number;
  delivery_time_min: number;
  delivery_time_max: number;
  is_open: boolean;
  is_featured: boolean;
}

export interface CmsPromotion {
  id: string;
  title: string;
  description: string;
  store: string;
  discount: number;
  image_url: string;
}

export interface CmsSection {
  section_key: string; // e.g., 'categories', 'promotions', 'popular_nearby'
  section_title?: string;
  section_type?: CmsSectionLayout; // layout/type hint
  layout?: CmsSectionLayout; // optional explicit layout
  is_visible?: boolean;
  sort_order?: number;
  max_items?: number;
  // optional behavior/config
  filters?: CmsSectionFilters;
  // Data arrays - ALL content comes from CMS
  categories?: CmsCategory[]; // category data
  banners?: CmsBanner[]; // banner data
  stores?: CmsStore[]; // store data
  promotions?: CmsPromotion[]; // promotion data
  text_content?: string; // for text sections
}

export interface CmsPageContent {
  sections?: CmsSection[];
  // future: other page-level settings
}

