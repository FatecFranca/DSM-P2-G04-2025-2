import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import GoogleLogin from '../components/GoogleLogin';
import './Login.css';

function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData.username, formData.password);
      if (result.success) {
        toast.success('Login realizado com sucesso!');
        navigate('/');
      } else {
        toast.error(result.error || 'Erro ao fazer login');
      }
    } catch (error) {
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🍽️ BeastFood</h1>
          <p>Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Usuário ou Email</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Seu usuário ou email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Sua senha"
            />
          </div>

          <button 
            type="submit" 
            className="login-button" 
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <span style={{ display: 'block', textAlign: 'center', margin: '15px 0' }}>ou</span>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={(user) => {
              toast.success(`Bem-vindo, ${user.name}!`);
              navigate('/');
            }}
            onError={(error) => {
              toast.error(error);
            }}
            buttonText="Entrar com Google"
            className="google-login-full"
          />
        </div>

        <div className="login-footer">
          <p>
            Não tem uma conta? <Link to="/register">Registre-se</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
