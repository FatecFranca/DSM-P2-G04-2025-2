import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Restaurants from './pages/Restaurants';
import RestaurantDetail from './pages/RestaurantDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import SearchResults from './pages/SearchResults';
import './App.css';

function ProtectedRoute({ children, requireAuth = false }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Carregando...</div>;
  }
  
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/restaurants" element={<Restaurants />} />
      <Route path="/restaurant/:id" element={<RestaurantDetail />} />
      <Route path="/login" element={
        <ProtectedRoute requireAuth={false}>
          <Login />
        </ProtectedRoute>
      } />
      <Route path="/register" element={
        <ProtectedRoute requireAuth={false}>
          <Register />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute requireAuth={true}>
          <Profile />
        </ProtectedRoute>
      } />
      <Route path="/profile/:username" element={<Profile />} />
      <Route path="/create-post" element={
        <ProtectedRoute requireAuth={true}>
          <CreatePost />
        </ProtectedRoute>
      } />
      <Route path="/post/:id" element={<PostDetail />} />
      <Route path="/search" element={<SearchResults />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Navbar />
        <main className="main-content">
          <AppRoutes />
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
