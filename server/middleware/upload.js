const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadDir = path.join(__dirname, '..', '..', 'uploads');
      
      console.log('📁 Diretório de destino:', uploadDir);
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('📁 Diretório de uploads criado:', uploadDir);
      }
      
      cb(null, uploadDir);
    } catch (error) {
      console.error('❌ Erro ao criar diretório de uploads:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname) || '.jpg';
      const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
      
      console.log('📝 Nome do arquivo gerado:', filename);
      cb(null, filename);
    } catch (error) {
      console.error('❌ Erro ao gerar nome do arquivo:', error);
      cb(error);
    }
  }
});

const fileFilter = (req, file, cb) => {
  try {
    console.log('🔍 Verificando arquivo:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    if (file.mimetype.startsWith('image/')) {
      console.log('✅ Arquivo de imagem aceito');
      cb(null, true);
    } else {
      console.log('❌ Tipo de arquivo não suportado:', file.mimetype);
      cb(new Error('Apenas imagens são permitidas!'), false);
    }
  } catch (error) {
    console.error('❌ Erro no filtro de arquivos:', error);
    cb(error);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  }
});

const handleUploadError = (err, req, res, next) => {
  console.error('🚨 Erro no upload detectado:', err);
  console.error('🚨 Tipo do erro:', err.constructor.name);
  console.error('🚨 Stack trace:', err.stack);
  
  if (err instanceof multer.MulterError) {
    console.error('🚨 Erro do Multer:', err.code);
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ 
          error: 'Arquivo muito grande. Máximo: 10MB',
          code: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ 
          error: 'Muitos arquivos. Máximo: 1 arquivo',
          code: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ 
          error: 'Campo de arquivo inesperado',
          code: 'UNEXPECTED_FIELD'
        });
      default:
        return res.status(400).json({ 
          error: 'Erro no upload do arquivo',
          code: err.code,
          details: err.message
        });
    }
  }
  
  if (err) {
    console.error('🚨 Erro genérico no upload:', err.message);
    return res.status(500).json({ 
      error: 'Erro interno no upload',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Erro ao processar arquivo'
    });
  }
  
  next();
};

module.exports = { upload, handleUploadError };
