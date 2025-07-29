"""
SPR 1.1 - Interface de linha de comando
CLI principal usando Typer para orquestração dos conectores
"""

from datetime import datetime, date
from pathlib import Path
from typing import List, Optional
import typer
from rich.console import Console
from rich.table import Table
from rich.progress import Progress
import pandas as pd

from core.config import Config
from core.logging_conf import get_module_logger
from connectors.inmet.ingest import InmetIngester
from connectors.inmet.transform import InmetTransformer
from connectors.mapa_ckan.ckan_client import get_mapa_client
from connectors.conab.ingest import ConabIngester

# Inicializa app Typer
app = typer.Typer(
    name="spr",
    help="SPR 1.1 - Sistema de Pipeline de Dados Agropecuários",
    add_completion=False
)

# Console para output rich
console = Console()
logger = get_module_logger("cli")

# Sub-comandos por conector
inmet_app = typer.Typer(help="Comandos INMET (meteorologia)")
mapa_app = typer.Typer(help="Comandos MAPA-CKAN (datasets agrícolas)")
conab_app = typer.Typer(help="Comandos CONAB (preços e safras)")

app.add_typer(inmet_app, name="inmet")
app.add_typer(mapa_app, name="mapa")
app.add_typer(conab_app, name="conab")


# COMANDOS GERAIS
@app.command()
def status():
    """Mostra status geral do sistema SPR"""
    console.print("🌾 [bold green]SPR 1.1 - Sistema de Pipeline de Dados Agropecuários[/bold green]")
    console.print()
    
    # Verifica estrutura de diretórios
    table = Table(title="Status dos Diretórios")
    table.add_column("Diretório", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Arquivos", justify="right")
    
    dirs_to_check = [
        ("Raw", Config.RAW_DIR),
        ("Staging", Config.STAGING_DIR), 
        ("Curated", Config.CURATED_DIR),
        ("Metadata", Config.METADATA_DIR),
        ("Logs", Config.LOGS_DIR)
    ]
    
    for name, path in dirs_to_check:
        if path.exists():
            file_count = len(list(path.rglob("*")))
            table.add_row(name, "✅ OK", str(file_count))
        else:
            table.add_row(name, "❌ Não existe", "0")
    
    console.print(table)
    console.print()
    
    # Verifica conectores
    console.print("[bold blue]Status dos Conectores:[/bold blue]")
    
    # INMET
    try:
        from connectors.inmet.client import test_inmet_connection
        inmet_ok = test_inmet_connection()
        inmet_status = "✅ Online" if inmet_ok else "❌ Offline"
    except:
        inmet_status = "❌ Erro"
    
    console.print(f"• INMET: {inmet_status}")
    
    # MAPA
    try:
        from connectors.mapa_ckan.ckan_client import test_mapa_connection
        mapa_ok = test_mapa_connection()
        mapa_status = "✅ Online" if mapa_ok else "❌ Offline"
    except:
        mapa_status = "❌ Erro"
    
    console.print(f"• MAPA-CKAN: {mapa_status}")
    
    # CONAB
    try:
        from connectors.conab.client import test_conab_connection
        conab_ok = test_conab_connection()
        conab_status = "✅ Online" if conab_ok else "❌ Offline"
    except:
        conab_status = "❌ Erro"
    
    console.print(f"• CONAB: {conab_status}")


@app.command()
def init():
    """Inicializa estrutura do SPR"""
    console.print("🏗️ Inicializando estrutura do SPR...")
    
    Config.ensure_dirs()
    
    console.print("✅ Estrutura de diretórios criada")
    console.print("📝 Configure o arquivo .env se necessário")


# COMANDOS INMET
@inmet_app.command("sync-estacoes")
def inmet_sync_estacoes():
    """Sincroniza catálogo de estações meteorológicas"""
    console.print("🌡️ Sincronizando estações INMET...")
    
    try:
        ingester = InmetIngester()
        count, file_path = ingester.sync_estacoes()
        
        console.print(f"✅ {count} estações sincronizadas")
        console.print(f"📁 Arquivo: {file_path}")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@conab_app.command("sync-precos")
def conab_sync_precos(
    produto: str = typer.Option(..., help="Produtos (separados por vírgula): soja,milho,sorgo,boi,frango,suino,leite,ovos"),
    nivel: str = typer.Option("produtor,atacado,varejo", help="Níveis de comercialização (separados por vírgula)"),
    inicio: str = typer.Option(..., help="Data início (YYYY-MM-DD)"),
    fim: str = typer.Option(..., help="Data fim (YYYY-MM-DD)"),
    uf: Optional[str] = typer.Option(None, help="Filtro por UF")
):
    """Sincroniza preços agropecuários CONAB"""
    
    # Parse das datas
    try:
        data_inicio = date.fromisoformat(inicio)
        data_fim = date.fromisoformat(fim)
    except ValueError:
        console.print("❌ Formato de data inválido. Use YYYY-MM-DD")
        raise typer.Exit(1)
    
    # Parse dos produtos e níveis
    produtos = [p.strip() for p in produto.split(",")]
    niveis = [n.strip() for n in nivel.split(",")]
    
    console.print(f"💰 Sincronizando preços CONAB: {data_inicio} a {data_fim}")
    console.print(f"📦 Produtos: {', '.join(produtos)}")
    console.print(f"🏪 Níveis: {', '.join(niveis)}")
    
    if uf:
        console.print(f"🗺️ UF: {uf}")
    
    try:
        ingester = ConabIngester()
        count, file_path = ingester.sync_precos(
            produtos=produtos,
            niveis=niveis,
            data_inicio=data_inicio,
            data_fim=data_fim,
            uf=uf
        )
        
        console.print(f"✅ {count} registros de preços sincronizados")
        console.print(f"📁 Arquivo: {file_path}")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@conab_app.command("sync-pgpm")
def conab_sync_pgpm():
    """Sincroniza preços mínimos PGPM"""
    console.print("📊 Sincronizando PGPM...")
    
    try:
        ingester = ConabIngester()
        count, file_path = ingester.sync_pgpm()
        
        console.print(f"✅ {count} registros PGPM sincronizados")
        console.print(f"📁 Arquivo: {file_path}")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@conab_app.command("sync-custos")
def conab_sync_custos():
    """Sincroniza custos de produção"""
    console.print("💵 Sincronizando custos de produção...")
    
    try:
        ingester = ConabIngester()
        count, file_path = ingester.sync_custos()
        
        console.print(f"✅ {count} registros de custos sincronizados")
        console.print(f"📁 Arquivo: {file_path}")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@conab_app.command("sync-estoques")
def conab_sync_estoques():
    """Sincroniza estoques públicos"""
    console.print("📦 Sincronizando estoques públicos...")
    
    try:
        ingester = ConabIngester()
        count, file_path = ingester.sync_estoques()
        
        console.print(f"✅ {count} registros de estoques sincronizados")
        console.print(f"📁 Arquivo: {file_path}")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@conab_app.command("sync-armazenagem")
def conab_sync_armazenagem():
    """Sincroniza capacidade de armazenagem"""
    console.print("🏪 Sincronizando capacidade de armazenagem...")
    
    try:
        ingester = ConabIngester()
        count, file_path = ingester.sync_armazenagem()
        
        console.print(f"✅ {count} registros de armazenagem sincronizados")
        console.print(f"📁 Arquivo: {file_path}")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@conab_app.command("monitor-pgpm")
def conab_monitor_pgpm(
    uf: Optional[str] = typer.Option(None, help="Filtro por UF"),
    produto: Optional[str] = typer.Option(None, help="Filtro por produto")
):
    """Gera monitor de situação PGPM"""
    console.print("📈 Gerando monitor PGPM...")
    
    try:
        ingester = ConabIngester()
        count, file_path = ingester.generate_pgpm_monitor(uf=uf, produto=produto)
        
        console.print(f"✅ {count} registros no monitor PGPM")
        console.print(f"📁 Arquivo: {file_path}")
        
        # Mostra resumo por situação
        if file_path and Path(file_path).exists():
            df = pd.read_parquet(file_path)
            
            if not df.empty:
                resumo = df['situacao'].value_counts()
                
                table = Table(title="Resumo Situação PGPM")
                table.add_column("Situação", style="cyan")
                table.add_column("Registros", justify="right", style="green")
                
                for situacao, count in resumo.items():
                    color = "red" if situacao == "desfavoravel" else "yellow" if situacao == "alerta" else "green"
                    table.add_row(f"[{color}]{situacao.title()}[/{color}]", str(count))
                
                console.print(table)
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


# COMANDOS DE ANÁLISE E RELATÓRIOS
@app.command()
def report():
    """Gera relatório consolidado do sistema"""
    console.print("📊 [bold blue]Relatório SPR 1.1[/bold blue]")
    console.print()
    
    # Verifica arquivos curated
    curated_files = list(Config.CURATED_DIR.glob("*.parquet"))
    
    if not curated_files:
        console.print("⚠️ Nenhum arquivo curated encontrado")
        return
    
    table = Table(title="Datasets Disponíveis")
    table.add_column("Dataset", style="cyan")
    table.add_column("Registros", justify="right", style="green")
    table.add_column("Última Modificação", style="yellow")
    table.add_column("Tamanho", justify="right", style="magenta")
    
    total_records = 0
    total_size = 0
    
    for file_path in sorted(curated_files):
        try:
            # Lê metadados do arquivo
            df = pd.read_parquet(file_path)
            record_count = len(df)
            
            # Informações do arquivo
            stat = file_path.stat()
            mod_time = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M")
            size_mb = stat.st_size / (1024 * 1024)
            
            table.add_row(
                file_path.stem,
                f"{record_count:,}",
                mod_time,
                f"{size_mb:.1f} MB"
            )
            
            total_records += record_count
            total_size += stat.st_size
            
        except Exception as e:
            table.add_row(file_path.stem, "Erro", "N/A", "N/A")
    
    console.print(table)
    
    console.print(f"\n📈 [bold]Total:[/bold] {total_records:,} registros, {total_size/(1024*1024):.1f} MB")


@app.command()
def validate():
    """Valida integridade dos dados"""
    console.print("🔍 Validando integridade dos dados...")
    
    curated_files = list(Config.CURATED_DIR.glob("*.parquet"))
    
    if not curated_files:
        console.print("⚠️ Nenhum arquivo para validar")
        return
    
    issues = []
    
    with Progress() as progress:
        task = progress.add_task("Validando...", total=len(curated_files))
        
        for file_path in curated_files:
            progress.update(task, description=f"Validando {file_path.stem}...")
            
            try:
                df = pd.read_parquet(file_path)
                
                # Verificações básicas
                if df.empty:
                    issues.append(f"{file_path.stem}: Arquivo vazio")
                
                # Verifica duplicatas (se tiver colunas de ID)
                id_cols = [col for col in df.columns if 'id' in col.lower() or col in ['codigo_inmet', 'cnpj']]
                if id_cols:
                    duplicates = df.duplicated(subset=id_cols).sum()
                    if duplicates > 0:
                        issues.append(f"{file_path.stem}: {duplicates} registros duplicados")
                
                # Verifica valores faltantes em colunas críticas
                critical_cols = [col for col in df.columns if col in ['uf', 'data', 'produto', 'codigo_inmet']]
                for col in critical_cols:
                    if col in df.columns:
                        missing = df[col].isna().sum()
                        if missing > 0:
                            pct = (missing / len(df)) * 100
                            if pct > 5:  # Mais de 5% faltando
                                issues.append(f"{file_path.stem}: {col} com {missing} valores faltantes ({pct:.1f}%)")
                
            except Exception as e:
                issues.append(f"{file_path.stem}: Erro ao ler arquivo - {e}")
            
            progress.advance(task)
    
    if issues:
        console.print(f"\n⚠️ [bold red]Encontrados {len(issues)} problemas:[/bold red]")
        for issue in issues:
            console.print(f"  • {issue}")
    else:
        console.print("\n✅ [bold green]Todos os arquivos estão íntegros[/bold green]")


@app.command()
def sync_all(
    inicio: str = typer.Option("2010-01-01", help="Data início para dados históricos"),
    fim: str = typer.Option(None, help="Data fim (padrão: hoje)"),
    skip_inmet: bool = typer.Option(False, help="Pula sincronização INMET"),
    skip_mapa: bool = typer.Option(False, help="Pula sincronização MAPA"),
    skip_conab: bool = typer.Option(False, help="Pula sincronização CONAB")
):
    """Executa sincronização completa de todos os conectores"""
    
    if fim is None:
        fim = date.today().isoformat()
    
    try:
        data_inicio = date.fromisoformat(inicio)
        data_fim = date.fromisoformat(fim)
    except ValueError:
        console.print("❌ Formato de data inválido. Use YYYY-MM-DD")
        raise typer.Exit(1)
    
    console.print(f"🚀 [bold blue]Sincronização Completa SPR 1.1[/bold blue]")
    console.print(f"📅 Período: {data_inicio} a {data_fim}")
    console.print()
    
    # INMET
    if not skip_inmet:
        console.print("🌡️ [bold]Iniciando INMET...[/bold]")
        try:
            # Estações
            console.print("  📡 Sincronizando estações...")
            ingester = InmetIngester()
            count, _ = ingester.sync_estacoes()
            console.print(f"    ✅ {count} estações")
            
            # Séries (foca em MT por ser região agrícola importante)
            console.print("  📊 Sincronizando séries diárias (MT)...")
            count, _ = ingester.sync_series_diarias(data_inicio, data_fim, uf_filter="MT")
            console.print(f"    ✅ {count} registros diários")
            
            # Normais
            console.print("  📈 Sincronizando normais...")
            count, _ = ingester.sync_normais()
            console.print(f"    ✅ {count} normais")
            
            # Features
            console.print("  ⚙️ Processando features...")
            transformer = InmetTransformer()
            transformer.process_daily_features()
            console.print("    ✅ Features processadas")
            
        except Exception as e:
            console.print(f"    ❌ Erro INMET: {e}")
    
    # MAPA
    if not skip_mapa:
        console.print("\n🌾 [bold]Iniciando MAPA-CKAN...[/bold]")
        try:
            from connectors.mapa_ckan.ckan_client import download_all_mapa_datasets
            
            output_dir = Config.RAW_DIR / "mapa_ckan"
            results = download_all_mapa_datasets(output_dir)
            
            success_count = sum(1 for r in results.values() if r is not None)
            console.print(f"    ✅ {success_count}/{len(results)} datasets baixados")
            
        except Exception as e:
            console.print(f"    ❌ Erro MAPA: {e}")
    
    # CONAB
    if not skip_conab:
        console.print("\n💰 [bold]Iniciando CONAB...[/bold]")
        try:
            ingester = ConabIngester()
            
            # Safras
            console.print("  🌾 Sincronizando safras...")
            count, _ = ingester.sync_safras()
            console.print(f"    ✅ {count} registros de safras")
            
            # Preços (produtos principais, últimos 2 anos por limitação da API)
            console.print("  💰 Sincronizando preços (principais produtos)...")
            produtos_principais = ["soja", "milho", "boi", "frango"]
            precos_inicio = max(data_inicio, date(2014, 1, 1))  # CONAB preços começam em 2014
            precos_inicio = max(precos_inicio, date.today().replace(year=date.today().year - 2))  # Últimos 2 anos
            
            count, _ = ingester.sync_precos(
                produtos=produtos_principais,
                niveis=["produtor", "atacado"],
                data_inicio=precos_inicio,
                data_fim=data_fim
            )
            console.print(f"    ✅ {count} registros de preços")
            
            # PGPM
            console.print("  📊 Sincronizando PGPM...")
            count, _ = ingester.sync_pgpm()
            console.print(f"    ✅ {count} registros PGPM")
            
            # Monitor PGPM
            console.print("  📈 Gerando monitor PGPM...")
            count, _ = ingester.generate_pgpm_monitor()
            console.print(f"    ✅ {count} registros no monitor")
            
        except Exception as e:
            console.print(f"    ❌ Erro CONAB: {e}")
    
    console.print(f"\n🎉 [bold green]Sincronização completa concluída![/bold green]")
    console.print("📊 Execute 'spr report' para ver o resumo dos dados")


if __name__ == "__main__":
    app()
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@inmet_app.command("sync-series")
def inmet_sync_series(
    inicio: str = typer.Option(..., help="Data início (YYYY-MM-DD)"),
    fim: str = typer.Option(..., help="Data fim (YYYY-MM-DD)"),
    freq: str = typer.Option("H", help="Frequência: H (horária) ou D (diária)"),
    uf: Optional[str] = typer.Option(None, help="Filtro por UF"),
    estacoes: Optional[str] = typer.Option(None, help="Códigos de estações (separados por vírgula)")
):
    """Sincroniza séries meteorológicas"""
    
    # Parse das datas
    try:
        data_inicio = date.fromisoformat(inicio)
        data_fim = date.fromisoformat(fim)
    except ValueError:
        console.print("❌ Formato de data inválido. Use YYYY-MM-DD")
        raise typer.Exit(1)
    
    # Parse das estações
    codigos_estacao = None
    if estacoes:
        codigos_estacao = [cod.strip() for cod in estacoes.split(",")]
    
    freq_name = "horárias" if freq == "H" else "diárias"
    console.print(f"🌡️ Sincronizando séries {freq_name}: {data_inicio} a {data_fim}")
    
    if uf:
        console.print(f"🗺️ Filtro: UF = {uf}")
    if codigos_estacao:
        console.print(f"📊 Estações: {len(codigos_estacao)} especificadas")
    
    try:
        ingester = InmetIngester()
        
        if freq == "H":
            count, file_path = ingester.sync_series_horarias(
                data_inicio, data_fim, codigos_estacao, uf
            )
        else:
            count, file_path = ingester.sync_series_diarias(
                data_inicio, data_fim, codigos_estacao, uf
            )
        
        console.print(f"✅ {count} registros sincronizados")
        console.print(f"📁 Arquivo: {file_path}")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@inmet_app.command("sync-normais")
def inmet_sync_normais():
    """Sincroniza normais climatológicas"""
    console.print("📊 Sincronizando normais climatológicas...")
    
    try:
        ingester = InmetIngester()
        count, file_path = ingester.sync_normais()
        
        if count > 0:
            console.print(f"✅ {count} normais sincronizadas")
            console.print(f"📁 Arquivo: {file_path}")
        else:
            console.print("⚠️ Nenhuma normal encontrada")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@inmet_app.command("process-features")
def inmet_process_features():
    """Processa features meteorológicas derivadas"""
    console.print("⚙️ Processando features meteorológicas...")
    
    try:
        transformer = InmetTransformer()
        file_path = transformer.process_daily_features()
        
        console.print("✅ Features processadas")
        console.print(f"📁 Arquivo: {file_path}")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@inmet_app.command("weather-summary")
def inmet_weather_summary(
    estacao: str = typer.Argument(..., help="Código da estação"),
    data: str = typer.Argument(..., help="Data (YYYY-MM-DD)")
):
    """Gera resumo meteorológico para estação e data"""
    
    try:
        target_date = date.fromisoformat(data)
    except ValueError:
        console.print("❌ Formato de data inválido. Use YYYY-MM-DD")
        raise typer.Exit(1)
    
    console.print(f"📊 Resumo meteorológico: {estacao} em {target_date}")
    
    try:
        from connectors.inmet.transform import get_weather_summary
        summary = get_weather_summary(estacao, target_date)
        
        if "error" in summary:
            console.print(f"❌ {summary['error']}")
            raise typer.Exit(1)
        
        # Exibe resumo formatado
        console.print(f"\n🌡️ [bold]Temperatura:[/bold]")
        temp = summary.get("temperatura", {})
        console.print(f"  • Média: {temp.get('media', 'N/A')}°C")
        console.print(f"  • Máxima: {temp.get('maxima', 'N/A')}°C")
        console.print(f"  • Mínima: {temp.get('minima', 'N/A')}°C")
        
        console.print(f"\n🌧️ [bold]Precipitação:[/bold]")
        prec = summary.get("precipitacao", {})
        console.print(f"  • Diária: {prec.get('diaria', 'N/A')} mm")
        console.print(f"  • Acumulada 7d: {prec.get('acumulada_7d', 'N/A')} mm")
        console.print(f"  • Acumulada 30d: {prec.get('acumulada_30d', 'N/A')} mm")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


# COMANDOS MAPA
@mapa_app.command("discover")
def mapa_discover():
    """Descobre datasets disponíveis no portal MAPA"""
    console.print("🔍 Descobrindo datasets MAPA...")
    
    try:
        from connectors.mapa_ckan.ckan_client import discover_mapa_datasets
        datasets = discover_mapa_datasets()
        
        table = Table(title="Datasets MAPA Descobertos")
        table.add_column("Dataset", style="cyan")
        table.add_column("Packages", justify="right", style="green")
        table.add_column("Primeiro Package", style="yellow")
        
        for dataset_type, packages in datasets.items():
            first_pkg = packages[0].get("title", "N/A") if packages else "Nenhum"
            table.add_row(dataset_type.upper(), str(len(packages)), first_pkg[:50])
        
        console.print(table)
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@mapa_app.command("sync-zarc")
def mapa_sync_zarc():
    """Sincroniza dados ZARC (Zoneamento de Risco Climático)"""
    console.print("🌾 Sincronizando ZARC...")
    
    try:
        client = get_mapa_client()
        output_dir = Config.get_raw_path("mapa_ckan", "zarc")
        
        file_path = client.download_dataset("zarc", output_dir)
        
        if file_path:
            console.print(f"✅ ZARC baixado: {file_path}")
        else:
            console.print("⚠️ Nenhum arquivo ZARC encontrado")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@mapa_app.command("sync-agrofit")
def mapa_sync_agrofit():
    """Sincroniza dados Agrofit (defensivos agrícolas)"""
    console.print("🧪 Sincronizando Agrofit...")
    
    try:
        client = get_mapa_client()
        output_dir = Config.get_raw_path("mapa_ckan", "agrofit")
        
        file_path = client.download_dataset("agrofit", output_dir)
        
        if file_path:
            console.print(f"✅ Agrofit baixado: {file_path}")
        else:
            console.print("⚠️ Nenhum arquivo Agrofit encontrado")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@mapa_app.command("sync-sipeagro")
def mapa_sync_sipeagro():
    """Sincroniza dados SIPEAGRO (estabelecimentos)"""
    console.print("🏭 Sincronizando SIPEAGRO...")
    
    try:
        client = get_mapa_client()
        output_dir = Config.get_raw_path("mapa_ckan", "sipeagro")
        
        file_path = client.download_dataset("sipeagro", output_dir)
        
        if file_path:
            console.print(f"✅ SIPEAGRO baixado: {file_path}")
        else:
            console.print("⚠️ Nenhum arquivo SIPEAGRO encontrado")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@mapa_app.command("sync-sigef")
def mapa_sync_sigef():
    """Sincroniza dados SIGEF (produção de sementes)"""
    console.print("🌱 Sincronizando SIGEF...")
    
    try:
        client = get_mapa_client()
        output_dir = Config.get_raw_path("mapa_ckan", "sigef")
        
        file_path = client.download_dataset("sigef", output_dir)
        
        if file_path:
            console.print(f"✅ SIGEF baixado: {file_path}")
        else:
            console.print("⚠️ Nenhum arquivo SIGEF encontrado")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@mapa_app.command("sync-cnpo")
def mapa_sync_cnpo():
    """Sincroniza dados CNPO (produtores orgânicos)"""
    console.print("🌿 Sincronizando CNPO...")
    
    try:
        client = get_mapa_client()
        output_dir = Config.get_raw_path("mapa_ckan", "cnpo")
        
        file_path = client.download_dataset("cnpo", output_dir)
        
        if file_path:
            console.print(f"✅ CNPO baixado: {file_path}")
        else:
            console.print("⚠️ Nenhum arquivo CNPO encontrado")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@mapa_app.command("sync-sif")
def mapa_sync_sif():
    """Sincroniza dados SIF (estabelecimentos e abates)"""
    console.print("🥩 Sincronizando SIF...")
    
    try:
        client = get_mapa_client()
        output_dir = Config.get_raw_path("mapa_ckan", "sif")
        
        file_path = client.download_dataset("sif", output_dir)
        
        if file_path:
            console.print(f"✅ SIF baixado: {file_path}")
        else:
            console.print("⚠️ Nenhum arquivo SIF encontrado")
        
    except Exception as e:
        console.print(f"❌ Erro: {e}")
        raise typer.Exit(1)


@mapa_app.command("sync-all")
def mapa_sync_all():
    """Sincroniza todos os datasets MAPA"""
    console.print("📦 Sincronizando todos os datasets MAPA...")
    
    datasets = ["zarc", "agrofit", "sipeagro", "sigef", "cnpo", "sif"]
    
    with Progress() as progress:
        task = progress.add_task("Sincronizando...", total=len(datasets))
        
        results = {}
        for dataset in datasets:
            progress.update(task, description=f"Sincronizando {dataset.upper()}...")
            
            try:
                client = get_mapa_client()
                output_dir = Config.get_raw_path("mapa_ckan", dataset)
                file_path = client.download_dataset(dataset, output_dir)
                results[dataset] = file_path is not None
                
            except Exception as e:
                logger.error(f"Erro ao sincronizar {dataset}: {e}")
                results[dataset] = False
            
            progress.advance(task)
    
    # Exibe resultados
    console.print("\n📊 Resultados da sincronização:")
    for dataset, success in results.items():
        status = "✅" if success else "❌"
        console.print(f"  {dataset.upper()}: {status}")


# COMANDOS CONAB
@conab_app.command("sync-safras")
def conab_sync_safras():
    """Sincroniza dados de safras CONAB"""
    console.print("🌾 Sincronizando safras CONAB...")
    
    try:
        ingester = ConabIngester()
        count, file_path = ingester.sync_safras()
        
        console.print(f"✅ {count} registros de safras sincronizados")
        console.print(f"📁 Arquivo: {file_path}")
        
    except Exception as e:
        