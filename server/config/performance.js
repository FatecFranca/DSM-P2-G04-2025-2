require('dotenv').config();

const buildAllowedOrigins = () => {
	if (process.env.NODE_ENV !== 'production') {
		return true;
	}
	
	const origins = [];
	if (process.env.CLIENT_URL) origins.push(process.env.CLIENT_URL);
	if (process.env.CLIENT_URLS) {
		origins.push(
			...process.env.CLIENT_URLS
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean)
		);
	}
	origins.push(
		'http://localhost:3000',
		'http://127.0.0.1:3000',
		'http://192.168.100.2:3000',
		'http://192.168.100.2:5000'
	);
	return Array.from(new Set(origins));
};

module.exports = {
  compression: {
    enabled: true,
    level: 6,
    threshold: 1024
  },

  cache: {
    enabled: true,
    maxAge: 300,
    etag: true
  },

  timeouts: {
    server: 30000,
    request: 25000,
    response: 20000,
    database: 10000,
    auth: 15000
  },

  rateLimit: {
    auth: {
      windowMs: 15 * 60 * 1000,
      max: process.env.NODE_ENV === 'production' ? 20 : 5000,
      delayMs: 0,
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
      standardHeaders: true,
      legacyHeaders: false
    },
    general: {
      windowMs: 15 * 60 * 1000,
      max: process.env.NODE_ENV === 'production' ? 200 : 50000,
      delayMs: 0,
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
      standardHeaders: true,
      legacyHeaders: false
    }
  },

  database: {
    pool: {
      max: 20,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      acquireTimeoutMillis: 10000,
      createTimeoutMillis: 10000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    },
    query: {
      statementTimeout: 10000,
      queryTimeout: 10000
    }
  },

  cors: {
    origin: buildAllowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Cache-Control',
      'Pragma',
      'Expires'
    ],
    exposedHeaders: ['Cache-Control', 'ETag'],
    maxAge: 86400
  },

  security: {
    helmet: {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false
    }
  }
};
