import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import { LanguageProvider } from './context/LanguageContext';
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
import NewItemModal from './components/NewItemModal';
import FavoritesModal from './components/FavoritesModal';

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
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage searchQuery={searchQuery} />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/category/:categoryName" element={<CategoryPage />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="/sell/review" element={<SellReviewPage />} />
          <Route path="/buy" element={<BuyPage />} />
          <Route path="/donation" element={<DonationPage />} />
          <Route path="/donation/form" element={<DonationFormPage />} />
          <Route path="/donation/thanks" element={<DonationThanksPage />} />
          <Route path="/admin/donations" element={<AdminDonationsPage />} />
          <Route path="/admin/reviews" element={<AdminReviewsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/ai-recommendation" element={<AIRecommendationPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
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
