"""
SPR 1.1 - Dicionário de produtos e sinônimos
Mapeamento de produtos agropecuários para padronização
"""

from typing import Dict, List, Set
from dataclasses import dataclass


@dataclass
class ProductInfo:
    """Informações de um produto"""
    id: str
    name: str
    category: str
    unit_default: str
    conversion_factor: float = 1.0
    aliases: List[str] = None
    
    def __post_init__(self):
        if self.aliases is None:
            self.aliases = []


# Produtos padronizados SPR
PRODUCTS_CATALOG = {
    # GRÃOS
    "soja_grao": ProductInfo(
        id="soja_grao",
        name="Soja em Grão",
        category="graos",
        unit_default="kg",
        conversion_factor=1.0,
        aliases=["soja", "soja grão", "grão de soja", "soybean"]
    ),
    
    "milho_grao": ProductInfo(
        id="milho_grao", 
        name="Milho em Grão",
        category="graos",
        unit_default="kg",
        conversion_factor=1.0,
        aliases=["milho", "milho grão", "grão de milho", "corn", "maize"]
    ),
    
    "sorgo_grao": ProductInfo(
        id="sorgo_grao",
        name="Sorgo em Grão", 
        category="graos",
        unit_default="kg",
        conversion_factor=1.0,
        aliases=["sorgo", "sorgo grão", "grão de sorgo", "sorghum"]
    ),
    
    "trigo_grao": ProductInfo(
        id="trigo_grao",
        name="Trigo em Grão",
        category="graos", 
        unit_default="kg",
        conversion_factor=1.0,
        aliases=["trigo", "trigo grão", "grão de trigo", "wheat"]
    ),
    
    "arroz_grao": ProductInfo(
        id="arroz_grao",
        name="Arroz em Grão",
        category="graos",
        unit_default="kg", 
        conversion_factor=1.0,
        aliases=["arroz", "arroz brunido", "arroz casca", "rice"]
    ),
    
    # PROTEÍNAS ANIMAIS
    "boi_gordo": ProductInfo(
        id="boi_gordo",
        name="Boi Gordo",
        category="proteinas",
        unit_default="arroba",
        conversion_factor=15.0,  # 1 arroba = 15kg
        aliases=["boi", "bovino gordo", "gado gordo", "cattle", "beef cattle"]
    ),
    
    "frango_vivo": ProductInfo(
        id="frango_vivo", 
        name="Frango Vivo",
        category="proteinas",
        unit_default="kg",
        conversion_factor=1.0,
        aliases=["frango", "ave", "pollo", "chicken", "broiler"]
    ),
    
    "suino_vivo": ProductInfo(
        id="suino_vivo",
        name="Suíno Vivo", 
        category="proteinas",
        unit_default="kg",
        conversion_factor=1.0,
        aliases=["suíno", "porco", "suino", "pig", "swine"]
    ),
    
    "leite_cru": ProductInfo(
        id="leite_cru",
        name="Leite Cru ao Produtor",
        category="proteinas",
        unit_default="litro",
        conversion_factor=1.03,  # densidade do leite ≈ 1.03 kg/L
        aliases=["leite", "leite produtor", "milk", "raw milk"]
    ),
    
    "ovos_comerciais": ProductInfo(
        id="ovos_comerciais",
        name="Ovos Comerciais",
        category="proteinas", 
        unit_default="duzia",
        conversion_factor=0.6,  # 1 dúzia ≈ 0.6kg (50g/ovo)
        aliases=["ovos", "ovo", "dúzia", "eggs"]
    ),
}

# Sinônimos para busca flexível
PRODUCT_SYNONYMS: Dict[str, List[str]] = {}
for product_id, info in PRODUCTS_CATALOG.items():
    PRODUCT_SYNONYMS[product_id] = [info.name.lower()] + [alias.lower() for alias in info.aliases]

# Mapeamento reverso (sinônimo -> produto padrão)
SYNONYM_TO_PRODUCT: Dict[str, str] = {}
for product_id, synonyms in PRODUCT_SYNONYMS.items():
    for synonym in synonyms:
        SYNONYM_TO_PRODUCT[synonym.lower()] = product_id

# Categorias
PRODUCT_CATEGORIES = {
    "graos": ["soja_grao", "milho_grao", "sorgo_grao", "trigo_grao", "arroz_grao"],
    "proteinas": ["boi_gordo", "frango_vivo", "suino_vivo", "leite_cru", "ovos_comerciais"]
}

# Unidades comuns por produto
PRODUCT_UNITS = {
    # Grãos - geralmente comercializados em sacas
    "soja_grao": ["kg", "saca", "tonelada"],
    "milho_grao": ["kg", "saca", "tonelada"], 
    "sorgo_grao": ["kg", "saca", "tonelada"],
    "trigo_grao": ["kg", "saca", "tonelada"],
    "arroz_grao": ["kg", "saca", "tonelada"],
    
    # Proteínas - unidades específicas
    "boi_gordo": ["arroba", "kg", "cabeça"],
    "frango_vivo": ["kg", "ave"],
    "suino_vivo": ["kg", "cabeça"],
    "leite_cru": ["litro", "kg"],
    "ovos_comerciais": ["duzia", "kg", "unidade"],
}

# Fatores de conversão específicos por produto
PRODUCT_CONVERSION_FACTORS = {
    # Grãos (sacas variam por produto)
    "soja_grao": {"saca": 60.0, "tonelada": 1000.0},
    "milho_grao": {"saca": 60.0, "tonelada": 1000.0},
    "sorgo_grao": {"saca": 60.0, "tonelada": 1000.0}, 
    "trigo_grao": {"saca": 60.0, "tonelada": 1000.0},
    "arroz_grao": {"saca": 50.0, "tonelada": 1000.0},  # arroz = 50kg/saca
    
    # Proteínas
    "boi_gordo": {"arroba": 15.0},
    "frango_vivo": {"tonelada": 1000.0},
    "suino_vivo": {"tonelada": 1000.0},
    "leite_cru": {"tonelada": 1000.0},
    "ovos_comerciais": {"duzia": 0.6, "unidade": 0.05},  # 50g/ovo
}


def normalize_product_name(name: str) -> str:
    """Normaliza nome de produto para ID padrão"""
    if not name:
        return ""
    
    normalized = name.lower().strip()
    
    # Remove caracteres especiais comuns
    normalized = normalized.replace(".", "").replace("-", " ").replace("_", " ")
    
    # Busca correspondência exata
    if normalized in SYNONYM_TO_PRODUCT:
        return SYNONYM_TO_PRODUCT[normalized]
    
    # Busca por correspondência parcial
    for synonym, product_id in SYNONYM_TO_PRODUCT.items():
        if synonym in normalized or normalized in synonym:
            return product_id
    
    return normalized


def get_product_info(product_id: str) -> ProductInfo:
    """Retorna informações de um produto"""
    return PRODUCTS_CATALOG.get(product_id)


def get_products_by_category(category: str) -> List[str]:
    """Retorna produtos de uma categoria"""
    return PRODUCT_CATEGORIES.get(category, [])


def convert_product_unit(product_id: str, value: float, from_unit: str, to_unit: str = "kg") -> float:
    """Converte unidade específica de um produto"""
    if from_unit.lower() == to_unit.lower():
        return value
    
    # Obtém fatores de conversão do produto
    factors = PRODUCT_CONVERSION_FACTORS.get(product_id, {})
    
    # Converte para kg (unidade base)
    if from_unit.lower() in factors:
        kg_value = value * factors[from_unit.lower()]
    elif from_unit.lower() == "kg":
        kg_value = value
    else:
        # Fallback para fatores gerais
        from core.config import UNIT_CONVERSION_FACTORS
        factor = UNIT_CONVERSION_FACTORS.get(from_unit.lower(), 1.0)
        kg_value = value * factor
    
    # Converte de kg para unidade alvo
    if to_unit.lower() == "kg":
        return kg_value
    elif to_unit.lower() in factors:
        return kg_value / factors[to_unit.lower()]
    else:
        # Fallback para fatores gerais
        from core.config import UNIT_CONVERSION_FACTORS
        factor = UNIT_CONVERSION_FACTORS.get(to_unit.lower(), 1.0)
        return kg_value / factor


def validate_product_unit(product_id: str, unit: str) -> bool:
    """Valida se unidade é válida para o produto"""
    valid_units = PRODUCT_UNITS.get(product_id, [])
    return unit.lower() in [u.lower() for u in valid_units]


def get_supported_products() -> List[str]:
    """Retorna lista de todos os produtos suportados"""
    return list(PRODUCTS_CATALOG.keys())


def get_product_aliases(product_id: str) -> List[str]:
    """Retorna todos os aliases de um produto"""
    return PRODUCT_SYNONYMS.get(product_id, [])


# Mapeamentos específicos para conectores

# CONAB - mapeamento de nomes usados nos datasets
CONAB_PRODUCT_MAPPING = {
    "soja": "soja_grao",
    "milho": "milho_grao", 
    "sorgo": "sorgo_grao",
    "trigo": "trigo_grao",
    "arroz": "arroz_grao",
    "boi gordo": "boi_gordo",
    "frango": "frango_vivo",
    "suíno": "suino_vivo",
    "leite": "leite_cru",
    "ovos": "ovos_comerciais",
}

# INMET - culturas para cálculo de graus-dia
INMET_CROP_MAPPING = {
    "soja": "soja_grao",
    "milho": "milho_grao",
    "sorgo": "sorgo_grao", 
    "trigo": "trigo_grao",
    "arroz": "arroz_grao",
}

# Parâmetros de graus-dia por cultura (temperatura base em °C)
DEGREE_DAY_BASE_TEMPS = {
    "soja_grao": 10.0,
    "milho_grao": 10.0,
    "sorgo_grao": 10.0,
    "trigo_grao": 4.0,
    "arroz_grao": 9.0,
}
