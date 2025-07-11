export const config = {
  api: {
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  },
  whatsapp: {
    apiUrl: process.env.REACT_APP_WHATSAPP_API_URL || 'http://localhost:3001',
    syncInterval: 5000, // 5 segundos
  },
  theme: {
    colors: {
      primary: '#128C7E',
      secondary: '#25D366',
      error: '#DC3545',
      success: '#28A745',
      warning: '#FFC107',
      info: '#17A2B8',
    },
  },
} as const; 