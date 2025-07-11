const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Criar diretórios se não existirem
const mediaDir = path.join(__dirname, 'media');
const profilesDir = path.join(__dirname, 'profiles');
const uploadsDir = path.join(__dirname, 'uploads');

[mediaDir, profilesDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = uploadsDir;
    
    // Organizar por tipo de arquivo
    if (file.mimetype.startsWith('image/')) {
      uploadPath = path.join(uploadsDir, 'images');
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath = path.join(uploadsDir, 'videos');
    } else {
      uploadPath = path.join(uploadsDir, 'documents');
    }
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 16 * 1024 * 1024 // 16MB limite
  },
  fileFilter: function (req, file, cb) {
    // Tipos de arquivo permitidos
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Servir arquivos estáticos
app.use('/media', express.static(mediaDir));
app.use('/profiles', express.static(profilesDir));
app.use('/uploads', express.static(uploadsDir));

// Endpoint para upload de arquivos
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const fileInfo = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${path.basename(req.file.destination)}/${req.file.filename}`,
      type: req.file.mimetype.startsWith('image/') ? 'image' :
            req.file.mimetype.startsWith('video/') ? 'video' : 'document'
    };
    
    console.log('📁 Arquivo enviado:', fileInfo);
    
    res.json({
      success: true,
      file: fileInfo
    });
    
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para listar arquivos de mídia
app.get('/media-list/:type?', (req, res) => {
  try {
    const type = req.params.type; // 'images', 'videos', 'documents'
    let searchDir = uploadsDir;
    
    if (type) {
      searchDir = path.join(uploadsDir, type);
    }
    
    if (!fs.existsSync(searchDir)) {
      return res.json({ files: [] });
    }
    
    const files = [];
    
    function scanDirectory(dir, basePath = '') {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath, path.join(basePath, item));
        } else {
          const ext = path.extname(item).toLowerCase();
          const relativePath = path.join(basePath, item);
          
          files.push({
            name: item,
            path: relativePath,
            url: `/uploads/${relativePath.replace(/\\/g, '/')}`,
            size: stat.size,
            modified: stat.mtime,
            type: getFileType(ext)
          });
        }
      });
    }
    
    scanDirectory(searchDir);
    
    // Ordenar por data de modificação (mais recentes primeiro)
    files.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    
    res.json({ files });
    
  } catch (error) {
    console.error('❌ Erro ao listar arquivos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função auxiliar para determinar tipo de arquivo
function getFileType(ext) {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const videoExts = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
  const docExts = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (docExts.includes(ext)) return 'document';
  return 'other';
}

// Endpoint para deletar arquivo
app.delete('/media/:type/:filename', (req, res) => {
  try {
    const { type, filename } = req.params;
    const filePath = path.join(uploadsDir, type, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Arquivo deletado:', filename);
      res.json({ success: true, message: 'Arquivo deletado com sucesso' });
    } else {
      res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
  } catch (error) {
    console.error('❌ Erro ao deletar arquivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    server: 'SPR Media Server',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Endpoint para informações do servidor
app.get('/info', (req, res) => {
  try {
    const stats = {
      mediaDir: mediaDir,
      profilesDir: profilesDir,
      uploadsDir: uploadsDir,
      totalFiles: 0,
      totalSize: 0
    };
    
    // Contar arquivos e tamanho total
    function countFiles(dir) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          countFiles(fullPath);
        } else {
          stats.totalFiles++;
          stats.totalSize += stat.size;
        }
      });
    }
    
    countFiles(uploadsDir);
    
    res.json(stats);
    
  } catch (error) {
    console.error('❌ Erro ao obter informações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande (máx. 16MB)' });
    }
  }
  
  console.error('❌ Erro:', error);
  res.status(500).json({ error: error.message });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('🚀 SPR Media Server iniciado!');
  console.log(`📁 Servidor de mídia rodando na porta ${PORT}`);
  console.log(`🔗 URLs disponíveis:`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - Upload: http://localhost:${PORT}/upload`);
  console.log(`   - Mídia: http://localhost:${PORT}/media/`);
  console.log(`   - Perfis: http://localhost:${PORT}/profiles/`);
  console.log(`   - Uploads: http://localhost:${PORT}/uploads/`);
  console.log('');
}); 