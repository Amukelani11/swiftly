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
  image_url: string;
  link_url?: string;
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
  categories?: string[]; // category slugs or names to show (for categories sections)
  banners?: CmsBanner[]; // for banner sections
  text_content?: string; // for text sections
}

export interface CmsPageContent {
  sections?: CmsSection[];
  // future: other page-level settings
}

