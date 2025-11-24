import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const determineBaseURL = () => {
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:5000`;
  }
  return 'http://localhost:5000';
};

axios.defaults.baseURL = determineBaseURL();
axios.defaults.withCredentials = true;
axios.defaults.timeout = 10000;

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      if (originalRequest.url === '/api/auth/login' || originalRequest.url === '/api/auth/refresh') {
        console.log('Interceptor: requisição de auth, não tentando renovar token');
        return Promise.reject(error);
      }
      
      try {
        console.log('Interceptor: tentando renovar token...');
        const response = await axios.post('/api/auth/refresh');
        const { accessToken } = response.data;
        
        localStorage.setItem('token', accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        console.log('Interceptor: falha na renovação, fazendo logout...');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const lastRequestTime = useRef(0);
  const verifyTimeout = useRef(null);
  const isInitialized = useRef(false);
  const tokenCheckInterval = useRef(null);
  const eventSourceRef = useRef(null);

  const doLocalLogout = useCallback(() => {
    setUser(null);
    setToken(null);
    setLoading(false);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    isInitialized.current = false;
    setNotificationsUnread(0);
    
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch (_) {}
      eventSourceRef.current = null;
    }
    
    if (tokenCheckInterval.current) {
      clearInterval(tokenCheckInterval.current);
      tokenCheckInterval.current = null;
    }
    if (verifyTimeout.current) {
      clearTimeout(verifyTimeout.current);
      verifyTimeout.current = null;
    }
  }, []);

  const attemptTokenRefresh = useCallback(async () => {
    if (isRefreshing) {
      console.log('Renovação já em andamento, pulando...');
      return;
    }

    console.log('Tentando renovar token...');
    setIsRefreshing(true);

    try {
      const response = await axios.post('/api/auth/refresh');
      const { accessToken } = response.data;
      setToken(accessToken);
      localStorage.setItem('token', accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      console.log('Token renovado com sucesso');
    } catch (error) {
      console.log('Falha na renovação do token:', error.message);
      if (error.response?.status === 401) {
        console.log('Token inválido, fazendo logout...');
        doLocalLogout();
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, doLocalLogout]);

  const checkAndRefreshToken = useCallback(async () => {
    if (!user || !token || isRefreshing) return;
    try {
      const response = await axios.post('/api/auth/refresh');
      const { accessToken } = response.data;
      setToken(accessToken);
      localStorage.setItem('token', accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      console.log('Token renovado automaticamente');
    } catch (error) {
      console.log('Falha na renovação automática do token:', error.message);
    }
  }, [user, token, isRefreshing]);

  // MOVER verifyToken PARA AQUI - ANTES DE SER USADO
  const verifyToken = useCallback(async () => {
    console.log('🔍 verifyToken executando:', { 
      hasToken: !!token, 
      isVerifying, 
      hasUser: !!user 
    });
    
    if (!token || isVerifying) {
      console.log('⏭️ verifyToken: pulando verificação - sem token ou já verificando');
      setLoading(false);
      return;
    }

    // Proteção adicional: se já temos usuário, não precisamos verificar
    if (user) {
      console.log('✅ verifyToken: usuário já existe, pulando verificação');
      setLoading(false);
      return;
    }

    // Verificar se o token está configurado no axios
    const currentAuthHeader = axios.defaults.headers.common['Authorization'];
    if (!currentAuthHeader || !currentAuthHeader.includes(token)) {
      console.log('🔧 verifyToken: token não configurado no axios, configurando...');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Prevenir requisições muito próximas
    const now = Date.now();
    if (now - lastRequestTime.current < 2000) {
      console.log('⏳ Requisição muito recente, aguardando...');
      setLoading(false);
      return;
    }

    // Limpar timeout anterior
    if (verifyTimeout.current) {
      clearTimeout(verifyTimeout.current);
    }

    console.log('🚀 verifyToken: executando verificação AGORA...');
    console.log('🔑 Token atual:', token.substring(0, 20) + '...');
    console.log('📡 Header Authorization:', axios.defaults.headers.common['Authorization']);
    
    setIsVerifying(true);
    lastRequestTime.current = now;

    try {
      console.log('🌐 verifyToken: fazendo requisição para /api/auth/verify...');
      const response = await axios.get('/api/auth/verify');
      console.log('✅ verifyToken: resposta recebida:', response.data);
      
      // Verificar se a resposta contém dados válidos
      if (response.data && response.data.user) {
        console.log('👤 verifyToken: usuário válido recebido, atualizando estado...');
        setUser(response.data.user);
        setLoading(false);
        console.log('✅ verifyToken: usuário definido e loading false');
      } else {
        console.log('❌ verifyToken: resposta inválida, limpando estado...');
        setUser(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ verifyToken: erro na verificação:', error);
      
      if (error.response?.status === 429) {
        console.log('⏰ Rate limiting detectado, aguardando...');
        setLoading(false);
        setTimeout(() => {
          if (token && !isRefreshing) {
            console.log('🔄 Tentando renovar token após delay...');
            attemptTokenRefresh();
          }
        }, 10000);
        return;
      }
      
      if (!isRefreshing) {
        console.log('🔄 verifyToken: tentando renovar token...');
        attemptTokenRefresh();
      }
      
      setLoading(false);
      console.log('⚠️ verifyToken: loading definido como false após erro');
    } finally {
      setIsVerifying(false);
      setLoading(false);
      console.log('🏁 verifyToken: finally executado, loading false');
    }
  }, [token, isVerifying, isRefreshing, user]);

  const login = useCallback(async (username, password) => {
    try {
      console.log('Fazendo login para:', username);
      const response = await axios.post('/api/auth/login', { username, password });
      
      console.log('🔍 Resposta completa do backend:', response);
      console.log('📦 Response.data:', response.data);
      console.log('🔑 Token na resposta:', response.data.accessToken);
      console.log('👤 User na resposta:', response.data.user);
      
      const { user: userData, accessToken: newToken } = response.data;
      
      console.log('Login bem-sucedido para:', username);
      console.log('Token extraído:', newToken ? 'SIM' : 'NÃO');
      console.log('User extraído:', userData ? 'SIM' : 'NÃO');
      
      // 1. Salvar no localStorage
      localStorage.setItem('token', newToken);
      
      // 2. Configurar axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      // 3. Atualizar estado
      setToken(newToken);
      setUser(userData);
      
      console.log('Login concluído - usuário logado');
      return { success: true, user: userData };
    } catch (error) {
      console.error('Erro no login:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Erro ao fazer login' 
      };
    }
  }, []);

  const loginWithGoogle = useCallback(async (user, accessToken) => {
    try {
      console.log('Login Google bem-sucedido para:', user.username);
      
      // 1. Salvar no localStorage
      localStorage.setItem('token', accessToken);
      
      // 2. Configurar axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
      // 3. Atualizar estado
      setToken(accessToken);
      setUser(user);
      setLoading(false);
      
      console.log('Login Google concluído - usuário logado');
      return { success: true };
    } catch (error) {
      console.error('Erro no login Google:', error);
      return { 
        success: false, 
        error: 'Erro no login com Google' 
      };
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      console.log('Fazendo registro para:', userData.username);
      const response = await axios.post('/api/auth/register', userData);
      const { user: newUser, token: newToken } = response.data;
      
      setUser(newUser);
      setToken(newToken);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      console.log('Registro bem-sucedido para:', userData.username);
      return { success: true, user: newUser };
    } catch (error) {
      console.error('Erro no registro:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Erro ao fazer registro' 
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('Fazendo logout no servidor...');
      await axios.post('/api/auth/logout');
      console.log('Logout no servidor realizado com sucesso');
    } catch (error) {
      console.error('Erro ao fazer logout no servidor:', error);
    } finally {
      console.log('Fazendo logout local...');
      doLocalLogout();
      console.log('Logout concluído');
    }
  }, [doLocalLogout]);

  // Configurar axios com token e verificar
  useEffect(() => {
    console.log('🔍 useEffect inicialização:', { 
      hasToken: !!token, 
      tokenLength: token ? token.length : 0,
      hasUser: !!user,
      loading
    });
    
    if (token) {
      // Configurar axios com o token
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('✅ Axios configurado com token');
      
      // Se não temos usuário, buscar do backend
      if (!user) {
        console.log('🔄 Buscando dados do usuário...');
        // Usar setTimeout para evitar dependência circular
        setTimeout(() => {
          verifyToken();
        }, 100);
      } else {
        console.log('✅ Usuário já existe, não precisa verificar');
        setLoading(false);
      }
    } else {
      // Sem token, limpar tudo
      setUser(null);
      setLoading(false);
      delete axios.defaults.headers.common['Authorization'];
      console.log('🧹 Estado limpo - sem token');
    }

    return () => {
      if (verifyTimeout.current) {
        clearTimeout(verifyTimeout.current);
      }
      if (tokenCheckInterval.current) {
        clearInterval(tokenCheckInterval.current);
      }
    };
  }, [token, user]); // REMOVIDO verifyToken das dependências

  // Conexão SSE para notificações
  useEffect(() => {
    if (!token) {
      if (eventSourceRef.current) {
        try { eventSourceRef.current.close(); } catch (_) {}
        eventSourceRef.current = null;
      }
      setNotificationsUnread(0);
      return;
    }

    // Buscar contador inicial via HTTP
    axios.get('/api/notifications/unread-count').then((r) => {
      const c = r?.data?.unread;
      if (typeof c === 'number') setNotificationsUnread(c);
    }).catch(() => {});

    // Usar URL absoluta para evitar problemas de proxy
    const base = axios.defaults.baseURL || '';
    const sseUrl = `${base}/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('unread_count', (e) => {
      try {
        const data = JSON.parse(e.data);
        setNotificationsUnread(data.unread || 0);
      } catch (_) {}
    });

    es.addEventListener('notification', () => {
      setNotificationsUnread((c) => c + 1);
    });

    es.onerror = () => {
      try { es.close(); } catch (_) {}
      eventSourceRef.current = null;
    };

    return () => {
      try { es.close(); } catch (_) {}
      eventSourceRef.current = null;
    };
  }, [token]);

  // Verificar e renovar token automaticamente
  useEffect(() => {
    if (token && user && !tokenCheckInterval.current) {
      const checkTokenExpiration = () => {
        if (!user || !token) return;

        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const expirationTime = payload.exp * 1000;
          const currentTime = Date.now();
          const timeUntilExpiration = expirationTime - currentTime;
          
          if (timeUntilExpiration < 5 * 60 * 1000) {
            console.log('Token próximo de expirar, renovando...');
            checkAndRefreshToken();
          }
        } catch (error) {
          console.error('Erro ao verificar expiração do token:', error);
        }
      };

      tokenCheckInterval.current = setInterval(checkTokenExpiration, 2 * 60 * 1000);
    }

    return () => {
      if (tokenCheckInterval.current) {
        clearInterval(tokenCheckInterval.current);
        tokenCheckInterval.current = null;
      }
    };
  }, [token, user, checkAndRefreshToken]);

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/users/profile', profileData);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Erro ao atualizar perfil' 
      };
    }
  };

  const setNotificationsUnreadCount = useCallback((count) => {
    try {
      const n = Number(count);
      setNotificationsUnread(Number.isFinite(n) && n >= 0 ? n : 0);
    } catch (_) {
      setNotificationsUnread(0);
    }
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    notificationsUnread,
    setNotificationsUnreadCount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
