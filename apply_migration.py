#!/usr/bin/env python3
"""
Script para aplicar migration do banco de dados SQLite
Para o sistema de broadcast do SPR
"""

import sqlite3
import os
import sys
from pathlib import Path

def apply_migration():
    """Aplicar migration das tabelas de broadcast"""
    
    # Caminho do banco de dados
    db_path = "spr_broadcast.db"
    migration_path = "database/migrations/001_create_broadcast_tables_sqlite.sql"
    
    print("🚀 Aplicando migration do sistema de broadcast...")
    
    try:
        # Verificar se arquivo de migration existe
        if not os.path.exists(migration_path):
            print(f"❌ Arquivo de migration não encontrado: {migration_path}")
            return False
        
        # Conectar ao banco SQLite
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Ler e executar migration
        with open(migration_path, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Executar comandos SQL
        cursor.executescript(migration_sql)
        conn.commit()
        
        # Verificar se tabelas foram criadas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'broadcast_%'")
        tables = cursor.fetchall()
        
        print(f"✅ Migration aplicada com sucesso!")
        print(f"📊 Banco de dados: {db_path}")
        print(f"🗃️  Tabelas criadas: {len(tables)}")
        
        for table in tables:
            print(f"   - {table[0]}")
        
        # Verificar dados de exemplo
        cursor.execute("SELECT COUNT(*) FROM broadcast_groups")
        groups_count = cursor.fetchone()[0]
        print(f"📋 Grupos de exemplo inseridos: {groups_count}")
        
        cursor.execute("SELECT name FROM broadcast_groups")
        groups = cursor.fetchall()
        for group in groups:
            print(f"   - {group[0]}")
        
        conn.close()
        
        print("\n🎉 Sistema de broadcast pronto para uso!")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao aplicar migration: {e}")
        return False

if __name__ == "__main__":
    success = apply_migration()
    sys.exit(0 if success else 1)