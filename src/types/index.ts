// User Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  walletBalance?: number;
  rating?: number;
  completedTasks?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Provider specific types
export interface ProviderProfile extends User {
  role: 'provider';
  walletBalance: number;
  bankDetails?: BankDetails;
  rating: number;
  completedTasks: number;
  isAvailable: boolean;
  vehicleType?: 'car' | 'motorcycle' | 'bicycle';
  serviceRadius: number; // in km
}

// Customer specific types
export interface CustomerProfile extends User {
  role: 'customer';
  totalOrders: number;
  favoriteProviders: string[]; // provider IDs
}

// Task/Order Types
export interface Task {
  id: string;
  customerId: string;
  providerId?: string;
  title: string;
  description: string;
  category: 'shopping' | 'handyman' | 'cleaning' | 'delivery' | 'other';
  location: string;
  priceRange: {
    min: number;
    max: number;
  };
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  commuteFee: number;
  finalPrice?: number;
  surcharge?: number;
  tip?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  estimatedPrice?: number;
  notes?: string;
}

// Payment Types
export interface Payment {
  id: string;
  taskId: string;
  customerId: string;
  providerId: string;
  amount: number;
  type: 'commute_fee' | 'final_payment' | 'tip' | 'refund';
  status: PaymentStatus;
  transactionId?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branchCode: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  province: string;
}

// Enums
export type UserRole = 'customer' | 'provider';
export type ProviderType = 'personal_shopper' | 'tasker';

export type TaskCategory =
  | 'shopping'
  | 'handyman'
  | 'cleaning'
  | 'delivery'
  | 'assembly'
  | 'moving'
  | 'other';

export type TaskStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'price_confirmed'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded';

export interface PriceRange {
  min: number;
  max: number;
}

export interface WalletTransaction {
  id: string;
  providerId: string;
  amount: number;
  type: 'credit' | 'debit' | 'withdrawal';
  description: string;
  taskId?: string;
  createdAt: Date;
}

// Navigation Types
export type RootStackParamList = {
  Welcome: undefined;
  RoleSelection: undefined;
  ProviderType: undefined;
  Auth: { selectedRole?: UserRole; providerType?: ProviderType; showSignIn?: boolean };
  ProviderOnboarding: { providerType: ProviderType };
  CustomerDashboard: { scrollToSection?: string } | undefined;
  CmsDashboardEditor: undefined;
  ProviderDashboard: undefined;
  AllStores: {
    stores: any[];
    promotions?: any[];
    categories?: any[];
    selectedFilters?: string[];
    activeCategory?: any;
    searchQuery?: string;
    sourceSection?: string;
  };
  Wallet: undefined;
  Profile: undefined;
  AdminDashboard: undefined;
  TaskDetails: { taskId: string };
  OrderTracking: { taskId: string; task?: any };
  CreateTask: undefined;
  CreateShoppingList: { selectedStore?: any; selectedCategory?: any; promotion?: any };
  StoreSelection: { items: any[]; selectedStore?: any };
  JobFeed: undefined;
  Settings: undefined;
  ProviderTrip: { requestId: string; storeLat?: number; storeLng?: number; dropoffLat?: number; dropoffLng?: number; title?: string; description?: string };
};

export interface ShoppingList {
  id: string;
  customerId: string;
  providerId?: string;
  storeName: string;
  storeLocation: string;
  items: string[];
  estimatedTotal: number;
  finalTotal?: number;
  status: 'pending' | 'accepted' | 'shopping' | 'delivering' | 'completed' | 'cancelled';
  commuteFee: number;
  surcharge?: number;
  tip?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'topup' | 'payment' | 'withdrawal' | 'commission' | 'tip';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

export interface Review {
  id: string;
  taskId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
