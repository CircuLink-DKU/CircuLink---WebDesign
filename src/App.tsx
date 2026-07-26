import React, { useState } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import { LanguageProvider } from './context/LanguageContext';
import { useAuth } from './hooks/useAuth';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProfilePage from './pages/ProfilePage';
import AboutPage from './pages/AboutPage';
import CartPage from './pages/CartPage';
import CategoryPage from './pages/CategoryPage';
import SellPage from './pages/SellPage';
import SellReviewPage from './pages/SellReviewPage';
import BuyPage from './pages/BuyPage';
import DonationPage from './pages/DonationPage';
import DonationFormPage from './pages/DonationFormPage';
import DonationThanksPage from './pages/DonationThanksPage';
import AdminDonationsPage from './pages/AdminDonationsPage';
import AdminReviewsPage from './pages/AdminReviewsPage';
import MessagesPage from './pages/MessagesPage';
import AIRecommendationPage from './pages/AIRecommendationPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import NewItemModal from './components/NewItemModal';
import FavoritesModal from './components/FavoritesModal';

const isRestrictedPartnerRole = (role?: string) => role === 'BUY42_PARTNER';

const restrictedPartnerHome = (role?: string) => {
  if (role === 'BUY42_PARTNER') return '/profile';
  return '/';
};

const RoleLandingRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (isRestrictedPartnerRole(user?.role)) {
    return <Navigate to={restrictedPartnerHome(user?.role)} replace />;
  }
  return children;
};

const MarketplaceRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (isRestrictedPartnerRole(user?.role)) {
    return <Navigate to={restrictedPartnerHome(user?.role)} replace />;
  }
  return children;
};

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleNewItem = () => {
    setShowNewItemModal(true);
  };

  const handleShowFavorites = () => {
    setShowFavoritesModal(true);
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-gray-50">
        <Header
          onSearch={handleSearch}
          onNewItem={handleNewItem}
          onShowFavorites={handleShowFavorites}
        />

        <Routes>
          <Route path="/" element={<RoleLandingRoute><HomePage /></RoleLandingRoute>} />
          <Route path="/products" element={<MarketplaceRoute><ProductsPage searchQuery={searchQuery} /></MarketplaceRoute>} />
          <Route path="/product/:id" element={<MarketplaceRoute><ProductDetailPage /></MarketplaceRoute>} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/cart" element={<MarketplaceRoute><CartPage /></MarketplaceRoute>} />
          <Route path="/category/:categoryName" element={<MarketplaceRoute><CategoryPage /></MarketplaceRoute>} />
          <Route path="/sell" element={<MarketplaceRoute><SellPage /></MarketplaceRoute>} />
          <Route path="/sell/review" element={<MarketplaceRoute><SellReviewPage /></MarketplaceRoute>} />
          <Route path="/buy" element={<MarketplaceRoute><BuyPage /></MarketplaceRoute>} />
          <Route path="/donation" element={<DonationPage />} />
          <Route path="/donation/form" element={<DonationFormPage />} />
          <Route path="/donation/thanks" element={<DonationThanksPage />} />
          <Route path="/admin/donations" element={<AdminDonationsPage />} />
          <Route path="/admin/reviews" element={<AdminReviewsPage />} />
          <Route path="/messages" element={<MarketplaceRoute><MessagesPage /></MarketplaceRoute>} />
          <Route path="/ai-recommendation" element={<MarketplaceRoute><AIRecommendationPage /></MarketplaceRoute>} />
          <Route path="/orders" element={<MarketplaceRoute><OrdersPage /></MarketplaceRoute>} />
          <Route path="/orders/:id" element={<MarketplaceRoute><OrderDetailPage /></MarketplaceRoute>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>

        <NewItemModal
          isOpen={showNewItemModal}
          onClose={() => setShowNewItemModal(false)}
        />
        
        <FavoritesModal
          isOpen={showFavoritesModal}
          onClose={() => setShowFavoritesModal(false)}
        />
      </div>
    </LanguageProvider>
  );
}

export default App;
