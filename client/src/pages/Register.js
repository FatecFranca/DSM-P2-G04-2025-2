import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import GoogleLogin from '../components/GoogleLogin';
import './Register.css';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const result = await register(formData);
      if (result.success) {
        toast.success('Conta criada com sucesso!');
        navigate('/');
      } else {
        toast.error(result.error || 'Erro ao criar conta');
      }
    } catch (error) {
      toast.error(error.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>🍽️ BeastFood</h1>
          <p>Crie sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="name">Nome completo</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Seu nome completo"
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Nome de usuário</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Seu nome de usuário"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Seu email"
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
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar senha</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirme sua senha"
              minLength="6"
            />
          </div>

          <button 
            type="submit" 
            className="register-button" 
            disabled={loading}
          >
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <GoogleLogin
            onSuccess={(user) => {
              toast.success(`Bem-vindo, ${user.name}!`);
              navigate('/');
            }}
            onError={(error) => {
              toast.error(error);
            }}
            buttonText="Criar conta com Google"
            className="google-login-full"
            />
          </div>

          <div className="register-footer">
            <p>
              Já tem uma conta? <Link to="/login">Faça login</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;
