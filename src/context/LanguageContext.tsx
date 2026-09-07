import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'zh';

  const translations: Record<string, Record<string, string>> = {
    en: {
      searchPlaceholder: 'Search for items...',
      sellItem: 'Sell Item',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      favorites: 'Favorites',
      cart: 'Cart',
      messages: 'Messages',
      about: 'About',
      profile: 'Profile',
      welcome: 'Welcome to Circulink',
      // Sidebar
      categoriesTitle: 'Categories',
      allProducts: 'All Products',
      // category names
      'category.electronics': 'Electronics',
      'category.books': 'Books & Textbooks',
      'category.furniture': 'Furniture',
      'category.clothing': 'Clothing',
      'category.sports': 'Sports & Outdoors',
      'category.entertainment': 'Entertainment',
      'category.music': 'Musical Instruments',
      'category.other': 'Other',
      // subcategories (flat keys)
      'subcategory.electronics.laptops': 'Laptops',
      'subcategory.electronics.phones': 'Phones',
      'subcategory.electronics.tablets': 'Tablets',
      'subcategory.electronics.accessories': 'Accessories',
      'subcategory.electronics.gaming_consoles': 'Gaming Consoles',
      'subcategory.books.engineering': 'Engineering',
      'subcategory.books.science': 'Science',
      'subcategory.books.arts': 'Arts',
      'subcategory.books.business': 'Business',
      'subcategory.books.literature': 'Literature',
      'subcategory.furniture.beds': 'Beds',
      'subcategory.furniture.desks': 'Desks',
      'subcategory.furniture.chairs': 'Chairs',
      'subcategory.furniture.storage': 'Storage',
      'subcategory.furniture.decor': 'Decor',
      'subcategory.clothing.mens': 'Mens',
      'subcategory.clothing.womens': 'Womens',
      'subcategory.clothing.shoes': 'Shoes',
      'subcategory.clothing.accessories': 'Accessories',
      'subcategory.sports.bicycles': 'Bicycles',
      'subcategory.sports.gym_equipment': 'Gym Equipment',
      'subcategory.sports.camping': 'Camping',
      'subcategory.sports.sports_gear': 'Sports Gear',
      'subcategory.entertainment.video_games': 'Video Games',
      'subcategory.entertainment.movies': 'Movies',
      'subcategory.entertainment.board_games': 'Board Games',
      'subcategory.entertainment.collectibles': 'Collectibles',
      'subcategory.music.guitars': 'Guitars',
      'subcategory.music.keyboards': 'Keyboards',
      'subcategory.music.drums': 'Drums',
      'subcategory.music.dj_equipment': 'DJ Equipment',
      // price ranges
      priceRange: 'Price Range',
      'price.under25': 'Under $25',
      'price.25to50': '$25 to $50',
      'price.50to100': '$50 to $100',
      'price.above100': '$100 & Above',
      // condition
      conditionTitle: 'Condition',
      'condition.new': 'New',
      'condition.like_new': 'Like New',
      'condition.good': 'Good',
      'condition.fair': 'Fair',
      // product grid / header
      noProductsFound: 'No products found',
      soldBy: 'Sold by',
      results: 'results',
      sortBy: 'Sort by',
      'sort.relevant': 'Most Relevant',
      'sort.price-low': 'Price: Low to High',
      'sort.price-high': 'Price: High to Low',
      'sort.newest': 'Newest First',
      'sort.rating': 'Customer Rating',
      // New pages
      myOrders: 'My Orders',
      orders: 'Orders',
      buyingOrders: 'Buying Orders',
      sellingOrders: 'Selling Orders',
      orderDetails: 'Order Details',
      orderStatus: 'Order Status',
      total: 'Total',
      orderDate: 'Order Date',
      buyer: 'Buyer',
      seller: 'Seller',
      contactSeller: 'Contact Seller',
      contactBuyer: 'Contact Buyer',
      acceptOrder: 'Accept Order',
      rejectOrder: 'Reject Order',
      markAsPaid: 'Mark as Paid',
      markAsShipped: 'Mark as Shipped',
      confirmReceived: 'Confirm Received',
      completeOrder: 'Complete Order',
      cancelOrder: 'Cancel Order',
      aiRecommendation: 'AI Recommendation',
      tellUsYourNeeds: 'Who are you? Tell Circulink your needs!',
      send: 'Send',
      recommendationPanel: 'Recommendation Panel',
      myItems: 'My Items',
      myFavorites: 'My Favorites',
      accountInfo: 'Account Info',
      edit: 'Edit',
      cancel: 'Cancel',
      save: 'Save',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      university: 'University',
      back: 'Back',
      noItems: 'No items',
      noFavorites: 'No favorites',
      listFirstItem: 'List Your First Item',
      browseFavorites: 'Browse Items',
      quickActions: 'Quick Actions',
      notProvided: 'Not provided'
    },
    zh: {
      searchPlaceholder: '搜索商品...',
      sellItem: '我要卖',
      signIn: '登录',
      signUp: '注册',
      signOut: '登出',
      favorites: '收藏',
      cart: '购物车',
      messages: '消息',
      about: '关于',
      profile: '个人资料',
      welcome: '欢迎来到 Circulink',
      // Sidebar
      categoriesTitle: '分类',
      allProducts: '全部商品',
      // category names
      'category.electronics': '电子产品',
      'category.books': '书籍与教科书',
      'category.furniture': '家具',
      'category.clothing': '服装',
      'category.sports': '运动与户外',
      'category.entertainment': '娱乐',
      'category.music': '乐器',
      'category.other': '其它',
      // subcategories
      'subcategory.electronics.laptops': '笔记本',
      'subcategory.electronics.phones': '手机',
      'subcategory.electronics.tablets': '平板',
      'subcategory.electronics.accessories': '配件',
      'subcategory.electronics.gaming_consoles': '游戏主机',
      'subcategory.books.engineering': '工程',
      'subcategory.books.science': '理科',
      'subcategory.books.arts': '艺术',
      'subcategory.books.business': '商学',
      'subcategory.books.literature': '文学',
      'subcategory.furniture.beds': '床',
      'subcategory.furniture.desks': '书桌',
      'subcategory.furniture.chairs': '椅子',
      'subcategory.furniture.storage': '收纳',
      'subcategory.furniture.decor': '装饰',
      'subcategory.clothing.mens': '男装',
      'subcategory.clothing.womens': '女装',
      'subcategory.clothing.shoes': '鞋',
      'subcategory.clothing.accessories': '配饰',
      'subcategory.sports.bicycles': '自行车',
      'subcategory.sports.gym_equipment': '健身器材',
      'subcategory.sports.camping': '露营',
      'subcategory.sports.sports_gear': '运动器材',
      'subcategory.entertainment.video_games': '电子游戏',
      'subcategory.entertainment.movies': '电影',
      'subcategory.entertainment.board_games': '桌游',
      'subcategory.entertainment.collectibles': '收藏品',
      'subcategory.music.guitars': '吉他',
      'subcategory.music.keyboards': '键盘',
      'subcategory.music.drums': '架子鼓',
      'subcategory.music.dj_equipment': 'DJ 设备',
      // price ranges
      priceRange: '价格区间',
      'price.under25': '25美元以下',
      'price.25to50': '25到50美元',
      'price.50to100': '50到100美元',
      'price.above100': '100美元及以上',
      // condition
      conditionTitle: '成色',
      'condition.new': '全新',
      'condition.like_new': '几乎全新',
      'condition.good': '良好',
      'condition.fair': '一般',
      // product grid / header
      noProductsFound: '未找到商品',
      soldBy: '卖家',
      results: '个结果',
      sortBy: '排序',
      'sort.relevant': '相关度',
      'sort.price-low': '价格：从低到高',
      'sort.price-high': '价格：从高到低',
      'sort.newest': '最新发布',
      'sort.rating': '用户评分',
      // New pages
      myOrders: '我的订单',
      orders: '订单',
      buyingOrders: '购买订单',
      sellingOrders: '销售订单',
      orderDetails: '订单详情',
      orderStatus: '订单状态',
      total: '总金额',
      orderDate: '下单时间',
      buyer: '买家',
      seller: '卖家',
      contactSeller: '联系卖家',
      contactBuyer: '联系买家',
      acceptOrder: '接受订单',
      rejectOrder: '拒绝订单',
      markAsPaid: '标记为已支付',
      markAsShipped: '标记为已发货',
      confirmReceived: '确认收货',
      completeOrder: '完成订单',
      cancelOrder: '取消订单',
      aiRecommendation: 'AI推荐',
      tellUsYourNeeds: '你是谁？告诉Circulink你的需求！',
      send: '发送',
      recommendationPanel: '推荐面板',
      myItems: '我的商品',
      myFavorites: '我的收藏',
      accountInfo: '账户信息',
      edit: '编辑',
      cancel: '取消',
      save: '保存',
      saveChanges: '保存更改',
      saving: '保存中...',
      name: '姓名',
      email: '邮箱',
      phone: '电话',
      university: '大学',
      back: '返回',
      noItems: '没有商品',
      noFavorites: '没有收藏',
      listFirstItem: '发布第一件商品',
      browseFavorites: '浏览商品',
      quickActions: '快速操作',
      notProvided: '未提供'
    }
  };

interface LanguageContextValue {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const LANG_STORAGE_KEY = 'circulink.lang';

const readInitialLang = (): Lang => {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
    // First visit: honor the browser's preference (Chinese users default to zh).
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')) {
      return 'zh';
    }
  } catch {
    // localStorage may be unavailable (private mode) — fall back to default.
  }
  return 'en';
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>(readInitialLang);

  const toggleLang = () =>
    setLang((l) => {
      const next = l === 'en' ? 'zh' : 'en';
      try {
        localStorage.setItem(LANG_STORAGE_KEY, next);
      } catch {
        // Ignore persistence failures.
      }
      return next;
    });

  const t = (key: string) => translations[lang]?.[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};

export default LanguageContext;
