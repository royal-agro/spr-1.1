import { useEffect, useCallback, useState } from 'react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { config } from '../config';
import type { WhatsAppMessage, WhatsAppChat } from '../types';

const WHATSAPP_API_BASE = config.whatsapp.apiUrl; // Servidor WhatsApp robusto
const REQUEST_TIMEOUT = 15000; // 15 segundos (reduzido de 30)
const RETRY_ATTEMPTS = 2; // 2 tentativas (reduzido de 3)
const RETRY_DELAY = 3000; // 3 segundos (reduzido de 5)

// Função de retry MAIS RÁPIDA para desenvolvimento
const retryRequest = async <T>(
  requestFn: () => Promise<T>, 
  maxRetries: number = RETRY_ATTEMPTS,
  baseDelay: number = RETRY_DELAY
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`🔄 Tentativa ${i + 1}/${maxRetries} falhou:`, errorMsg);
      
      // Se for HTTP 429, esperar mais tempo
      if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
        console.warn(`⚠️ Rate limiting detectado - aguardando ${baseDelay * 2}ms antes da próxima tentativa`);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, baseDelay * 2));
        }
        continue;
      }
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Delay normal para outros erros
      const delay = baseDelay + (i * 1000); // Linear ao invés de exponential
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Máximo de tentativas excedido');
};

// Função para criar requisições com timeout REDUZIDO
const fetchWithTimeout = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...options.headers
      }
    });
    
    clearTimeout(