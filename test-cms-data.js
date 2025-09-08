// Test script to populate CMS with sample data
const sampleCategories = [
  { id: 1, name: 'Fast Food', icon: 'fast-food-outline', color: '#FF6B6B', slug: 'fast-food' },
  { id: 2, name: 'Restaurants', icon: 'restaurant-outline', color: '#4ECDC4', slug: 'restaurants' },
  { id: 3, name: 'Grocery', icon: 'basket-outline', color: '#45B7D1', slug: 'grocery' },
  { id: 4, name: 'Coffee', icon: 'cafe-outline', color: '#96CEB4', slug: 'coffee' },
  { id: 5, name: 'Pizza', icon: 'pizza-outline', color: '#FFEAA7', slug: 'pizza' },
  { id: 6, name: 'Asian', icon: 'restaurant-outline', color: '#DDA0DD', slug: 'asian' },
  { id: 7, name: 'Desserts', icon: 'ice-cream-outline', color: '#F7DC6F', slug: 'desserts' },
  { id: 8, name: 'Healthy', icon: 'leaf-outline', color: '#A8E6CF', slug: 'healthy' },
];

const sampleStores = [
  {
    id: 1,
    name: "McDonald's",
    description: "Fast food favorites delivered quickly",
    address: "123 Main St, Cape Town",
    rating: 4.2,
    delivery_time: "25-35 min",
    minimum_order: 50,
    delivery_fee: 15,
    image_url: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400",
    category_id: 1,
    distance: 1.2,
    is_featured: true,
    is_open: true,
    eta: 25
  },
  {
    id: 2,
    name: "Spur Steak Ranches",
    description: "Flame-grilled steaks and family favorites",
    address: "456 Oak Ave, Cape Town",
    rating: 4.5,
    delivery_time: "35-45 min",
    minimum_order: 80,
    delivery_fee: 20,
    image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
    category_id: 2,
    distance: 2.1,
    is_featured: true,
    is_open: true,
    eta: 40
  },
  {
    id: 3,
    name: "Woolworths Food",
    description: "Quality groceries and fresh produce",
    address: "789 Pine Rd, Cape Town",
    rating: 4.3,
    delivery_time: "45-60 min",
    minimum_order: 100,
    delivery_fee: 0,
    image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
    category_id: 3,
    distance: 0.8,
    is_featured: false,
    is_open: true,
    eta: 50
  },
  {
    id: 4,
    name: "Vida e Caffè",
    description: "Premium coffee and light meals",
    address: "321 Coffee St, Cape Town",
    rating: 4.7,
    delivery_time: "15-25 min",
    minimum_order: 30,
    delivery_fee: 10,
    image_url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400",
    category_id: 4,
    distance: 0.5,
    is_featured: true,
    is_open: true,
    eta: 20
  },
  {
    id: 5,
    name: "Debonairs Pizza",
    description: "Freshly made pizzas with quality toppings",
    address: "654 Pizza Lane, Cape Town",
    rating: 4.1,
    delivery_time: "30-40 min",
    minimum_order: 60,
    delivery_fee: 18,
    image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
    category_id: 5,
    distance: 1.8,
    is_featured: false,
    is_open: true,
    eta: 35
  }
];

const samplePromotions = [
  {
    id: 1,
    title: "50% Off First Order",
    description: "Get half price on your first McDonald's order",
    discount: 50,
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    store_id: 1,
    image_url: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400"
  },
  {
    id: 2,
    title: "Free Coffee Friday",
    description: "Buy any meal and get a free coffee at Vida e Caffè",
    discount: 30,
    valid_until: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    store_id: 4,
    image_url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400"
  },
  {
    id: 3,
    title: "Family Feast Deal",
    description: "Family meal for 4 at Spur - includes dessert",
    discount: 25,
    valid_until: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    store_id: 2,
    image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400"
  },
  {
    id: 4,
    title: "Free Delivery Weekend",
    description: "No delivery fees on orders over R100 this weekend",
    discount: 15,
    valid_until: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    store_id: 3,
    image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400"
  }
];

console.log('Sample Categories:', JSON.stringify(sampleCategories, null, 2));
console.log('\nSample Stores:', JSON.stringify(sampleStores, null, 2));
console.log('\nSample Promotions:', JSON.stringify(samplePromotions, null, 2));

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sampleCategories,
    sampleStores,
    samplePromotions
  };
}
