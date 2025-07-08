### database.py
```python
from sqlmodel import SQLModel, create_engine, Session
from .config import settings

# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

def create_db_and_tables():
    """Create database and tables"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Get database session"""
    with Session(engine) as session:
        yield session

def get_session() -> Session:
    """Get database session (sync version for services)"""
    return Session(engine)
```

### main.py
```python
import logging
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import create_db_and_tables
from .routers import sync
from .config import settings

# Configure structured logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# JSON formatter for structured logging
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry)

# Apply JSON formatter to root logger
root_logger = logging.getLogger()
for handler in root_logger.handlers:
    handler.setFormatter(JSONFormatter())

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting SPR WhatsApp Module 2")
    create_db_and_tables()
    logger.info("Database tables created successfully")
    yield
    # Shutdown
    logger.info("Shutting down SPR WhatsApp Module 2")

# Create FastAPI app
app = FastAPI(
    title="SPR WhatsApp Module 2",
    description="Google Contacts Integration & WhatsApp Messaging",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sync.router)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "SPR WhatsApp Module 2 - Google Contacts Integration",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2025-07-08T00:00:00Z"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### tests/conftest.py
```python
import pytest
import tempfile
import os
from sqlmodel import SQLModel, create_engine, Session
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from ..app.main import app
from ..app.database import get_session
from ..app.config import Settings

@pytest.fixture(scope="session")
def test_settings():
    """Test settings with temporary database"""
    return Settings(
        DATABASE_URL="sqlite:///./test.db",
        GOOGLE_CLIENT_ID="test_client_id",
        GOOGLE_CLIENT_SECRET="test_client_secret",
        REDIS_URL=None,  # Use memory cache for tests
        DEBUG=True
    )

@pytest.fixture(scope="session")
def test_engine(test_settings):
    """Create test database engine"""
    engine = create_engine(
        test_settings.DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    # Cleanup
    if os.path.exists("test.db"):
        os.remove("test.db")

@pytest.fixture
def test_session(test_engine):
    """Create test database session"""
    with Session(test_engine) as session:
        yield session

@pytest.fixture
def test_client(test_session):
    """Create test client with database override"""
    def override_get_session():
        yield test_session
    
    app.dependency_overrides[get_session] = override_get_session
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def mock_google_credentials():
    """Mock Google credentials"""
    mock_creds = Mock()
    mock_creds.token = "mock_token"
    mock_creds.refresh_token = "mock_refresh_token"
    mock_creds.expired = False
    mock_creds.scopes = ["https://www.googleapis.com/auth/contacts.readonly"]
    return mock_creds

@pytest.fixture
def mock_google_contacts_response():
    """Mock Google contacts API response"""
    return [
        {
            'id': 'group_1',
            'name': 'Produtores',
            'member_count': 5,
            'resource_name': 'contactGroups/group_1'
        },
        {
            'id': 'group_2',
            'name': 'Fornecedores',
            'member_count': 3,
            'resource_name': 'contactGroups/group_2'
        }
    ]

@pytest.fixture
def mock_contact_data():
    """Mock contact data from Google"""
    return [
        {
            'google_id': 'person_1',
            'name': 'João Silva',
            'phone_numbers': [{'number': '+5565999999999', 'type': 'mobile'}],
            'emails': [{'address': 'joao@email.com', 'type': 'home'}],
            'city': 'Rondonópolis',
            'metadata': {'resourceName': 'people/person_1'}
        },
        {
            'google_id': 'person_2',
            'name': 'Maria Santos',
            'phone_numbers': [{'number': '+5565888888888', 'type': 'mobile'}],
            'emails': [{'address': 'maria@email.com', 'type': 'work'}],
            'city': 'Cuiabá',
            'metadata': {'resourceName': 'people/person_2'}
        }
    ]
```

### tests/test_google_sync.py
```python
import pytest
from unittest.mock import Mock, patch, AsyncMock
from ..app.services.contact_sync import ContactSyncService
from ..app.integrations.google_contacts import GoogleContactsAPI
from ..app.auth.google_auth import GoogleAuthService
from ..app.models.contact_group import ContactGroup
from ..app.models.contact import Contact

class TestGoogleAuth:
    """Test Google OAuth functionality"""
    
    def test_get_authorization_url(self):
        """Test OAuth URL generation"""
        auth_service = GoogleAuthService()
        
        with patch('google_auth_oauthlib.flow.Flow.from_client_config') as mock_flow:
            mock_flow_instance = Mock()
            mock_flow_instance.authorization_url.return_value = (
                "https://accounts.google.com/oauth/authorize?client_id=test",
                "test_state"
            )
            mock_flow.return_value = mock_flow_instance
            
            auth_url, state = auth_service.get_authorization_url("custom_state")
            
            assert "https://accounts.google.com" in auth_url
            assert state == "test_state"
            mock_flow_instance.authorization_url.assert_called_once()
    
    def test_exchange_code_for_token(self):
        """Test code exchange for token"""
        auth_service = GoogleAuthService()
        
        with patch('google_auth_oauthlib.flow.Flow.from_client_config') as mock_flow:
            mock_credentials = Mock()
            mock_credentials.token = "access_token"
            mock_credentials.refresh_token = "refresh_token"
            mock_credentials.token_uri = "https://oauth2.googleapis.com/token"
            mock_credentials.client_id = "test_client_id"
            mock_credentials.client_secret = "test_client_secret"
            mock_credentials.scopes = ["https://www.googleapis.com/auth/contacts.readonly"]
            
            mock_flow_instance = Mock()
            mock_flow_instance.credentials = mock_credentials
            mock_flow.return_value = mock_flow_instance
            
            token_data = auth_service.exchange_code_for_token("auth_code", "test_state")
            
            assert token_data["token"] == "access_token"
            assert token_data["refresh_token"] == "refresh_token"
            mock_flow_instance.fetch_token.assert_called_once_with(code="auth_code")

class TestGoogleContactsAPI:
    """Test Google Contacts API integration"""
    
    @pytest.mark.asyncio
    async def test_list_contact_groups(self, mock_google_credentials):
        """Test listing contact groups"""
        api = GoogleContactsAPI(mock_google_credentials)
        
        mock_response = {
            'contactGroups': [
                {
                    'resourceName': 'contactGroups/group_1',
                    'name': 'Produtores',
                    'groupType': 'USER_CONTACT_GROUP',
                    'memberCount': 5
                },
                {
                    'resourceName': 'contactGroups/myContacts',
                    'name': 'My Contacts',
                    'groupType': 'SYSTEM_CONTACT_GROUP',
                    'memberCount': 100
                }
            ]
        }
        
        with patch.object(api.service.contactGroups(), 'list') as mock_list:
            mock_list.return_value.execute.return_value = mock_response
            
            groups = await api.list_contact_groups()
            
            assert len(groups) == 1  # Only user groups, not system groups
            assert groups[0]['name'] == 'Produtores'
            assert groups[0]['id'] == 'group_1'
            assert groups[0]['member_count'] == 5
    
    @pytest.mark.asyncio
    async def test_list_contacts_by_group(self, mock_google_credentials):
        """Test listing contacts by group"""
        api = GoogleContactsAPI(mock_google_credentials)
        
        # Mock group response
        mock_group_response = {
            'memberResourceNames': [
                {'memberResourceName': 'people/person_1'},
                {'memberResourceName': 'people/person_2'}
            ]
        }
        
        # Mock batch get response
        mock_batch_response = {
            'responses': [
                {
                    'person': {
                        'resourceName': 'people/person_1',
                        'names': [{'displayName': 'João Silva'}],
                        'phoneNumbers': [{'value': '+5565999999999', 'type': 'mobile'}],
                        'emailAddresses': [{'value': 'joao@email.com', 'type': 'home'}],
                        'addresses': [{'city': 'Rondonópolis'}],
                        'metadata': {'resourceName': 'people/person_1'}
                    }
                }
            ]
        }
        
        with patch.object(api.service.contactGroups(), 'get') as mock_get, \
             patch.object(api.service.people(), 'getBatchGet') as mock_batch:
            
            mock_get.return_value.execute.return_value = mock_group_response
            mock_batch.return_value.execute.return_value = mock_batch_response
            
            contacts = await api.list_contacts_by_group('group_1')
            
            assert len(contacts) == 1
            assert contacts[0]['name'] == 'João Silva'
            assert contacts[0]['city'] == 'Rondonópolis'
            assert len(contacts[0]['phone_numbers']) == 1

class TestContactSyncService:
    """Test contact synchronization service"""
    
    @pytest.mark.asyncio
    async def test_sync_groups(self, test_session, mock_google_contacts_response):
        """Test syncing contact groups"""
        sync_service = ContactSyncService()
        
        # Mock Google API
        mock_api = Mock()
        mock_api.list_contact_groups = AsyncMock(return_value=mock_google_contacts_response)
        
        result = await sync_service.sync_groups(mock_api)
        
        assert result["groups_synced"] == 2
        assert result["groups_created"] == 2
        assert result["groups_updated"] == 0
        assert len(result["errors"]) == 0
        
        # Check database
        groups = test_session.query(ContactGroup).all()
        assert len(groups) == 2
        assert groups[0].name in ['Produtores', 'Fornecedores']
    
    @pytest.mark.asyncio
    async def test_sync_contacts(self, test_session, mock_contact_data):
        """Test syncing contacts for a group"""
        sync_service = ContactSyncService()
        
        # Create test group first
        test_group = ContactGroup(
            google_id="group_1",
            name="Test Group",
            member_count=2,
            resource_name="contactGroups/group_1"
        )
        test_session.add(test_group)
        test_session.commit()
        
        # Mock Google API
        mock_api = Mock()
        mock_api.list_contacts_by_group = AsyncMock(return_value=mock_contact_data)
        
        result = await sync_service.sync_contacts(mock_api, "group_1")
        
        assert result["contacts_synced"] == 2
        assert result["contacts_created"] == 2
        assert result["contacts_updated"] == 0
        assert len(result["errors"]) == 0
        
        # Check database
        contacts = test_session.query(Contact).all()
        assert len(contacts) == 2
        assert contacts[0].name in ['João Silva', 'Maria Santos']
    
    def test_get_sync_status(self, test_session):
        """Test getting sync status"""
        sync_service = ContactSyncService()
        
        # Create test data
        test_group = ContactGroup(
            google_id="group_1",
            name="Test Group",
            member_count=1,
            resource_name="contactGroups/group_1"
        )
        test_session.add(test_group)
        test_session.commit()
        
        test_contact = Contact(
            google_id="person_1",
            name="Test Contact",
            contact_group_id=test_group.id
        )
        test_session.add(test_contact)
        test_session.commit()
        
        status = sync_service.get_sync_status()
        
        assert status["total_groups"] == 1
        assert status["total_contacts"] == 1
        assert len(status["groups"]) == 1
        assert status["groups"][0]["name"] == "Test Group"
        assert status["groups"][0]["contact_count"] == 1

class TestSyncAPI:
    """Test sync API endpoints"""
    
    def test_get_sync_status_endpoint(self, test_client):
        """Test sync status endpoint"""
        response = test_client.get("/sync/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_groups" in data
        assert "total_contacts" in data
        assert "groups" in data
    
    def test_get_google_auth_url(self, test_client):
        """Test getting Google auth URL"""
        with patch('app.routers.sync.GoogleAuthService') as mock_service:
            mock_instance = Mock()
            mock_instance.get_authorization_url.return_value = (
                "https://accounts.google.com/oauth/authorize",
                "test_state"
            )
            mock_service.return_value = mock_instance
            
            response = test_client.post("/sync/auth/google/url")
            assert response.status_code == 200
            
            data = response.json()
            assert "auth_url" in data
            assert "state" in data
    
    def test_sync_google_without_auth(self, test_client):
        """Test sync without authentication"""
        response = test_client.post("/sync/google")
        assert response.status_code == 401
        assert "authentication required" in response.json()["detail"].lower()
```

## Comandos para Rodar Testes

```bash
# Instalar dependências
pip install -r requirements.txt

# Rodar todos os testes com cobertura
pytest tests/ --cov=app --cov-report=html --cov-report=term-missing

# Rodar testes específicos
pytest tests/test_google_sync.py::TestGoogleAuth::test_get_authorization_url -v

# Rodar testes com logs detalhados
pytest tests/ -v -s --log-cli-level=INFO

# Verificar cobertura mínima (80%)
pytest tests/ --cov=app --cov-fail-under=80

# Rodar servidor de desenvolvimento
python -m app.main

# Testar endpoints manualmente
curl http://localhost:8000/health
curl http://localhost:8000/sync/status
```

## README.md - Instruções OAuth Local

```markdown
# SPR Módulo 2 - Etapa 1: Google Contacts Integration

## Configuração OAuth Local

### 1. Configurar Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione existente
3. Ative a API "People API" (Google Contacts)
4. Vá para "Credenciais" → "Criar Credenciais" → "ID do cliente OAuth 2.0"
5. Configure:
   - Tipo: Aplicação Web
   - URIs de redirecionamento: `http://localhost:8000/auth/google/callback`

### 2. Configurar .env

```env
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
GOOGLE_SCOPES=https://www.googleapis.com/auth/contacts.readonly

DATABASE_URL=sqlite:///./spr.db
REDIS_URL=redis://localhost:6379/0
DEBUG=true
```

### 3. Fluxo de Autenticação

1. **Obter URL de autorização:**
   ```bash
   curl -X POST http://localhost:8000/sync/auth/google/url
   ```

2. **Acessar URL retornada no navegador**

3. **Autorizar aplicação** e copiar código da URL de callback

4. **Trocar código por token:**
   ```bash
   curl -X POST "http://localhost:8000/sync/auth/google/callback" \
        -H "Content-Type: application/json" \
        -d '{"code": "seu_codigo", "state": "seu_state"}'
   ```

### 4. Sincronizar Contatos

```bash
# Sincronizar grupos
curl -X POST http://localhost:8000/sync/google

# Sincronizar contatos de um grupo específico
curl -X POST "http://localhost:8000/sync/google?label_id=group_1"

# Ver status da sincronização
curl http://localhost:8000/sync/status
```

## Estrutura do Banco

- `contact_groups`: Grupos/labels do Google Contacts
- `contacts`: Contatos sincronizados com informações detalhadas
- `nicknames`: Apelidos por contato (para próximas etapas)

## Logs Estruturados

A aplicação utiliza logs JSON estruturados:

```json
{
  "timestamp": "2025-07-08T10:00:00",
  "level": "INFO",
  "logger": "app.services.contact_sync",
  "message": "Contacts sync completed for group group_1",
  "module": "contact_sync",
  "function": "sync_contacts",
  "line": 145
}
```
```# SPR Módulo 2 - Etapa 1: Google Contacts Integration

## Árvore de Arquivos Criados/Alterados

```
backend/app/
├── auth/
│   ├── __init__.py
│   └── google_auth.py                 # NEW
├── integrations/
│   ├── __init__.py
│   └── google_contacts.py             # NEW
├── models/
│   ├── __init__.py
│   ├── contact.py                     # UPDATED
│   └── contact_group.py               # NEW
├── services/
│   ├── __init__.py
│   └── contact_sync.py                # NEW
├── routers/
│   ├── __init__.py
│   └── sync.py                        # NEW
├── tests/
│   ├── __init__.py
│   ├── conftest.py                    # NEW
│   └── test_google_sync.py            # NEW
├── config.py                          # UPDATED
├── database.py                        # UPDATED
├── main.py                            # UPDATED
└── requirements.txt                   # UPDATED
```

## Código Completo

### requirements.txt
```txt
fastapi==0.104.1
sqlmodel==0.0.14
pydantic==2.5.0
apscheduler==3.10.4
python-dotenv==1.0.0
redis==5.0.1
google-auth-oauthlib==1.1.0
google-api-python-client==2.108.0
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
httpx==0.25.2
```

### config.py
```python
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./spr.db"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"
    GOOGLE_SCOPES: str = "https://www.googleapis.com/auth/contacts.readonly"
    
    # Cache
    REDIS_URL: Optional[str] = None
    CACHE_TTL_CONTACTS: int = 3600
    CACHE_TTL_GROUPS: int = 7200
    SYNC_BATCH_SIZE: int = 200
    MAX_CONCURRENT_SYNCS: int = 3
    
    # App
    SECRET_KEY: str = "your-secret-key-here"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### auth/__init__.py
```python
# Auth module
```

### auth/google_auth.py
```python
import json
import logging
from typing import Optional, Dict, Any
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from ..config import settings

logger = logging.getLogger(__name__)

class GoogleAuthService:
    def __init__(self):
        self.client_config = {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
            }
        }
        self.scopes = settings.GOOGLE_SCOPES.split(",")
    
    def get_authorization_url(self, state: Optional[str] = None) -> tuple[str, str]:
        """Generate OAuth authorization URL"""
        try:
            flow = Flow.from_client_config(
                self.client_config,
                scopes=self.scopes,
                redirect_uri=settings.GOOGLE_REDIRECT_URI
            )
            
            auth_url, state = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                state=state
            )
            
            logger.info(f"Generated OAuth URL with state: {state}")
            return auth_url, state
            
        except Exception as e:
            logger.error(f"Error generating OAuth URL: {e}")
            raise
    
    def exchange_code_for_token(self, code: str, state: str) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        try:
            flow = Flow.from_client_config(
                self.client_config,
                scopes=self.scopes,
                redirect_uri=settings.GOOGLE_REDIRECT_URI,
                state=state
            )
            
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            token_data = {
                "token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": credentials.scopes
            }
            
            logger.info("Successfully exchanged code for token")
            return token_data
            
        except Exception as e:
            logger.error(f"Error exchanging code for token: {e}")
            raise
    
    def refresh_credentials(self, refresh_token: str) -> Optional[Credentials]:
        """Refresh expired credentials"""
        try:
            credentials = Credentials(
                token=None,
                refresh_token=refresh_token,
                token_uri=self.client_config["web"]["token_uri"],
                client_id=self.client_config["web"]["client_id"],
                client_secret=self.client_config["web"]["client_secret"]
            )
            
            request = Request()
            credentials.refresh(request)
            
            logger.info("Successfully refreshed credentials")
            return credentials
            
        except Exception as e:
            logger.error(f"Error refreshing credentials: {e}")
            return None
    
    def validate_token(self, token_data: Dict[str, Any]) -> bool:
        """Validate if token is still valid"""
        try:
            credentials = Credentials.from_authorized_user_info(token_data)
            
            if credentials.expired and credentials.refresh_token:
                refreshed = self.refresh_credentials(credentials.refresh_token)
                return refreshed is not None
            
            return not credentials.expired
            
        except Exception as e:
            logger.error(f"Error validating token: {e}")
            return False
```

### integrations/__init__.py
```python
# Integrations module
```

### integrations/google_contacts.py
```python
import logging
from typing import List, Dict, Any, Optional
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.exceptions import RefreshError

logger = logging.getLogger(__name__)

class GoogleContactsAPI:
    def __init__(self, credentials: Credentials):
        self.credentials = credentials
        self.service = None
        self._build_service()
    
    def _build_service(self):
        """Build Google People API service"""
        try:
            self.service = build('people', 'v1', credentials=self.credentials)
            logger.info("Google People API service built successfully")
        except Exception as e:
            logger.error(f"Error building Google People API service: {e}")
            raise
    
    async def list_contact_groups(self) -> List[Dict[str, Any]]:
        """List all contact groups/labels"""
        try:
            if not self.service:
                self._build_service()
            
            results = self.service.contactGroups().list().execute()
            contact_groups = results.get('contactGroups', [])
            
            # Filter out system groups and format response
            user_groups = []
            for group in contact_groups:
                if group.get('groupType') == 'USER_CONTACT_GROUP':
                    user_groups.append({
                        'id': group.get('resourceName', '').replace('contactGroups/', ''),
                        'name': group.get('name', ''),
                        'member_count': group.get('memberCount', 0),
                        'resource_name': group.get('resourceName', '')
                    })
            
            logger.info(f"Retrieved {len(user_groups)} contact groups")
            return user_groups
            
        except RefreshError:
            logger.error("Token refresh failed")
            raise
        except Exception as e:
            logger.error(f"Error listing contact groups: {e}")
            raise
    
    async def list_contacts_by_group(self, label_id: str, page_size: int = 200) -> List[Dict[str, Any]]:
        """List contacts in a specific group"""
        try:
            if not self.service:
                self._build_service()
            
            resource_name = f"contactGroups/{label_id}"
            
            # Get group members
            group = self.service.contactGroups().get(
                resourceName=resource_name,
                maxMembers=page_size
            ).execute()
            
            member_resource_names = [
                member.get('memberResourceName')
                for member in group.get('memberResourceNames', [])
                if member.get('memberResourceName')
            ]
            
            if not member_resource_names:
                logger.info(f"No contacts found in group {label_id}")
                return []
            
            # Batch get contact details
            batch_get = self.service.people().getBatchGet(
                resourceNames=member_resource_names,
                personFields='names,phoneNumbers,emailAddresses,addresses,metadata'
            ).execute()
            
            contacts = []
            for response in batch_get.get('responses', []):
                person = response.get('person', {})
                contact_data = self._format_contact(person)
                if contact_data:
                    contacts.append(contact_data)
            
            logger.info(f"Retrieved {len(contacts)} contacts from group {label_id}")
            return contacts
            
        except Exception as e:
            logger.error(f"Error listing contacts for group {label_id}: {e}")
            raise
    
    def _format_contact(self, person: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Format Google contact data to our schema"""
        try:
            # Extract name
            names = person.get('names', [])
            if not names:
                return None
            
            display_name = names[0].get('displayName', '')
            if not display_name:
                return None
            
            # Extract phone numbers
            phone_numbers = []
            for phone in person.get('phoneNumbers', []):
                phone_value = phone.get('value', '').strip()
                if phone_value:
                    phone_numbers.append({
                        'number': phone_value,
                        'type': phone.get('type', 'mobile')
                    })
            
            # Extract emails
            emails = []
            for email in person.get('emailAddresses', []):
                email_value = email.get('value', '').strip()
                if email_value:
                    emails.append({
                        'address': email_value,
                        'type': email.get('type', 'home')
                    })
            
            # Extract address for city
            city = ''
            addresses = person.get('addresses', [])
            if addresses:
                city = addresses[0].get('city', '')
            
            return {
                'google_id': person.get('resourceName', '').replace('people/', ''),
                'name': display_name,
                'phone_numbers': phone_numbers,
                'emails': emails,
                'city': city,
                'metadata': person.get('metadata', {})
            }
            
        except Exception as e:
            logger.error(f"Error formatting contact: {e}")
            return None
```

### models/contact_group.py
```python
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List
import json

class ContactGroup(SQLModel, table=True):
    __tablename__ = "contact_groups"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    google_id: str = Field(index=True, unique=True)
    name: str
    member_count: int = 0
    resource_name: str
    last_sync: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # Relationship
    contacts: List["Contact"] = Relationship(back_populates="contact_group")

class ContactGroupMembership(SQLModel, table=True):
    __tablename__ = "contact_group_memberships"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    contact_id: int = Field(foreign_key="contacts.id")
    contact_group_id: int = Field(foreign_key="contact_groups.id")
    created_at: datetime = Field(default_factory=datetime.now)
```

### models/contact.py
```python
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List, Dict, Any
import json

class Contact(SQLModel, table=True):
    __tablename__ = "contacts"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    google_id: Optional[str] = Field(default=None, index=True)
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    phone_numbers: Optional[str] = None  # JSON string
    emails: Optional[str] = None  # JSON string
    metadata: Optional[str] = None  # JSON string
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # Relationships
    contact_group_id: Optional[int] = Field(default=None, foreign_key="contact_groups.id")
    contact_group: Optional["ContactGroup"] = Relationship(back_populates="contacts")
    nicknames: List["Nickname"] = Relationship(back_populates="contact")
    
    def get_phone_numbers(self) -> List[Dict[str, Any]]:
        """Parse phone numbers from JSON"""
        if not self.phone_numbers:
            return []
        try:
            return json.loads(self.phone_numbers)
        except json.JSONDecodeError:
            return []
    
    def set_phone_numbers(self, phone_numbers: List[Dict[str, Any]]):
        """Store phone numbers as JSON"""
        self.phone_numbers = json.dumps(phone_numbers)
        # Set primary phone for backward compatibility
        if phone_numbers:
            self.phone = phone_numbers[0].get('number', '')
    
    def get_emails(self) -> List[Dict[str, Any]]:
        """Parse emails from JSON"""
        if not self.emails:
            return []
        try:
            return json.loads(self.emails)
        except json.JSONDecodeError:
            return []
    
    def set_emails(self, emails: List[Dict[str, Any]]):
        """Store emails as JSON"""
        self.emails = json.dumps(emails)
        # Set primary email for backward compatibility
        if emails:
            self.email = emails[0].get('address', '')

class Nickname(SQLModel, table=True):
    __tablename__ = "nicknames"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    contact_id: int = Field(foreign_key="contacts.id")
    nickname: str
    tone: str = Field(default="formal")  # formal, informal, campaign
    keywords: Optional[str] = None
    is_default: bool = Field(default=False)
    context: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Relationship
    contact: Optional[Contact] = Relationship(back_populates="nicknames")
```

### services/contact_sync.py
```python
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlmodel import Session, select
from ..database import get_session
from ..models.contact import Contact
from ..models.contact_group import ContactGroup, ContactGroupMembership
from ..integrations.google_contacts import GoogleContactsAPI
from ..config import settings

# Cache imports
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)

class ContactSyncService:
    def __init__(self):
        self.cache = None
        if REDIS_AVAILABLE and settings.REDIS_URL:
            try:
                self.cache = redis.from_url(settings.REDIS_URL)
                self.cache.ping()
                logger.info("Redis cache initialized")
            except Exception as e:
                logger.warning(f"Redis connection failed, using memory cache: {e}")
                self.cache = {}
        else:
            self.cache = {}
            logger.info("Using memory cache")
    
    def _get_cache_key(self, key_type: str, identifier: str) -> str:
        """Generate cache key"""
        return f"spr:contacts:{key_type}:{identifier}"
    
    def _get_cache(self, key: str) -> Optional[Any]:
        """Get from cache"""
        try:
            if isinstance(self.cache, dict):
                return self.cache.get(key)
            else:
                value = self.cache.get(key)
                return json.loads(value) if value else None
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            return None
    
    def _set_cache(self, key: str, value: Any, ttl: int = 3600):
        """Set cache with TTL"""
        try:
            if isinstance(self.cache, dict):
                self.cache[key] = value
            else:
                self.cache.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
    
    async def sync_groups(self, google_api: GoogleContactsAPI) -> Dict[str, Any]:
        """Sync contact groups from Google"""
        sync_result = {
            "groups_synced": 0,
            "groups_created": 0,
            "groups_updated": 0,
            "errors": []
        }
        
        try:
            # Check cache first
            cache_key = self._get_cache_key("groups", "all")
            cached_groups = self._get_cache(cache_key)
            
            if cached_groups:
                logger.info("Using cached contact groups")
                google_groups = cached_groups
            else:
                logger.info("Fetching contact groups from Google")
                google_groups = await google_api.list_contact_groups()
                self._set_cache(cache_key, google_groups, settings.CACHE_TTL_GROUPS)
            
            with get_session() as session:
                for group_data in google_groups:
                    try:
                        # Check if group exists
                        existing_group = session.exec(
                            select(ContactGroup).where(
                                ContactGroup.google_id == group_data['id']
                            )
                        ).first()
                        
                        if existing_group:
                            # Update existing group
                            existing_group.name = group_data['name']
                            existing_group.member_count = group_data['member_count']
                            existing_group.resource_name = group_data['resource_name']
                            existing_group.updated_at = datetime.now()
                            sync_result["groups_updated"] += 1
                        else:
                            # Create new group
                            new_group = ContactGroup(
                                google_id=group_data['id'],
                                name=group_data['name'],
                                member_count=group_data['member_count'],
                                resource_name=group_data['resource_name']
                            )
                            session.add(new_group)
                            sync_result["groups_created"] += 1
                        
                        sync_result["groups_synced"] += 1
                        
                    except Exception as e:
                        error_msg = f"Error syncing group {group_data.get('name', 'unknown')}: {e}"
                        logger.error(error_msg)
                        sync_result["errors"].append(error_msg)
                
                session.commit()
                logger.info(f"Groups sync completed: {sync_result}")
                return sync_result
                
        except Exception as e:
            error_msg = f"Error in groups sync: {e}"
            logger.error(error_msg)
            sync_result["errors"].append(error_msg)
            return sync_result
    
    async def sync_contacts(self, google_api: GoogleContactsAPI, label_id: str) -> Dict[str, Any]:
        """Sync contacts for a specific group"""
        sync_result = {
            "contacts_synced": 0,
            "contacts_created": 0,
            "contacts_updated": 0,
            "errors": []
        }
        
        try:
            # Check if incremental sync is possible
            with get_session() as session:
                group = session.exec(
                    select(ContactGroup).where(ContactGroup.google_id == label_id)
                ).first()
                
                if not group:
                    sync_result["errors"].append(f"Group {label_id} not found in database")
                    return sync_result
                
                # Check cache
                cache_key = self._get_cache_key("contacts", label_id)
                cached_contacts = self._get_cache(cache_key)
                
                if cached_contacts and group.last_sync:
                    # Check if cache is still valid based on last sync
                    cache_age = (datetime.now() - group.last_sync).total_seconds()
                    if cache_age < settings.CACHE_TTL_CONTACTS:
                        logger.info(f"Using cached contacts for group {label_id}")
                        google_contacts = cached_contacts
                    else:
                        logger.info(f"Fetching fresh contacts for group {label_id}")
                        google_contacts = await google_api.list_contacts_by_group(
                            label_id, settings.SYNC_BATCH_SIZE
                        )
                        self._set_cache(cache_key, google_contacts, settings.CACHE_TTL_CONTACTS)
                else:
                    logger.info(f"First sync for group {label_id}")
                    google_contacts = await google_api.list_contacts_by_group(
                        label_id, settings.SYNC_BATCH_SIZE
                    )
                    self._set_cache(cache_key, google_contacts, settings.CACHE_TTL_CONTACTS)
                
                # Process contacts
                for contact_data in google_contacts:
                    try:
                        # Check if contact exists
                        existing_contact = session.exec(
                            select(Contact).where(
                                Contact.google_id == contact_data['google_id']
                            )
                        ).first()
                        
                        if existing_contact:
                            # Update existing contact
                            existing_contact.name = contact_data['name']
                            existing_contact.city = contact_data['city']
                            existing_contact.set_phone_numbers(contact_data['phone_numbers'])
                            existing_contact.set_emails(contact_data['emails'])
                            existing_contact.metadata = json.dumps(contact_data['metadata'])
                            existing_contact.updated_at = datetime.now()
                            existing_contact.contact_group_id = group.id
                            sync_result["contacts_updated"] += 1
                        else:
                            # Create new contact
                            new_contact = Contact(
                                google_id=contact_data['google_id'],
                                name=contact_data['name'],
                                city=contact_data['city'],
                                contact_group_id=group.id,
                                metadata=json.dumps(contact_data['metadata'])
                            )
                            new_contact.set_phone_numbers(contact_data['phone_numbers'])
                            new_contact.set_emails(contact_data['emails'])
                            session.add(new_contact)
                            sync_result["contacts_created"] += 1
                        
                        sync_result["contacts_synced"] += 1
                        
                    except Exception as e:
                        error_msg = f"Error syncing contact {contact_data.get('name', 'unknown')}: {e}"
                        logger.error(error_msg)
                        sync_result["errors"].append(error_msg)
                
                # Update group sync timestamp
                group.last_sync = datetime.now()
                session.add(group)
                session.commit()
                
                logger.info(f"Contacts sync completed for group {label_id}: {sync_result}")
                return sync_result
                
        except Exception as e:
            error_msg = f"Error in contacts sync for group {label_id}: {e}"
            logger.error(error_msg)
            sync_result["errors"].append(error_msg)
            return sync_result
    
    def get_sync_status(self) -> Dict[str, Any]:
        """Get synchronization status"""
        try:
            with get_session() as session:
                groups = session.exec(select(ContactGroup)).all()
                contacts = session.exec(select(Contact)).all()
                
                status = {
                    "total_groups": len(groups),
                    "total_contacts": len(contacts),
                    "groups": [],
                    "last_updated": datetime.now().isoformat()
                }
                
                for group in groups:
                    group_contacts = session.exec(
                        select(Contact).where(Contact.contact_group_id == group.id)
                    ).all()
                    
                    status["groups"].append({
                        "id": group.google_id,
                        "name": group.name,
                        "contact_count": len(group_contacts),
                        "last_sync": group.last_sync.isoformat() if group.last_sync else None
                    })
                
                return status
                
        except Exception as e:
            logger.error(f"Error getting sync status: {e}")
            return {"error": str(e)}
```

### routers/sync.py
```python
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from google.oauth2.credentials import Credentials
from ..auth.google_auth import GoogleAuthService
from ..integrations.google_contacts import GoogleContactsAPI
from ..services.contact_sync import ContactSyncService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sync", tags=["sync"])

# In-memory token storage (replace with database in production)
_token_storage: Dict[str, Dict[str, Any]] = {}

def get_google_credentials() -> Optional[Credentials]:
    """Get stored Google credentials"""
    # This is a simplified implementation
    # In production, store tokens in database with proper encryption
    token_data = _token_storage.get("default")
    if not token_data:
        return None
    
    try:
        return Credentials.from_authorized_user_info(token_data)
    except Exception as e:
        logger.error(f"Error loading credentials: {e}")
        return None

async def sync_groups_background(google_api: GoogleContactsAPI):
    """Background task for syncing groups"""
    sync_service = ContactSyncService()
    try:
        result = await sync_service.sync_groups(google_api)
        logger.info(f"Background groups sync completed: {result}")
    except Exception as e:
        logger.error(f"Background groups sync failed: {e}")

async def sync_contacts_background(google_api: GoogleContactsAPI, label_id: str):
    """Background task for syncing contacts"""
    sync_service = ContactSyncService()
    try:
        result = await sync_service.sync_contacts(google_api, label_id)
        logger.info(f"Background contacts sync completed for {label_id}: {result}")
    except Exception as e:
        logger.error(f"Background contacts sync failed for {label_id}: {e}")

@router.post("/google")
async def sync_google_contacts(
    background_tasks: BackgroundTasks,
    label_id: Optional[str] = None,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """Trigger Google contacts synchronization"""
    try:
        credentials = get_google_credentials()
        if not credentials:
            raise HTTPException(
                status_code=401,
                detail="Google authentication required. Please authenticate first."
            )
        
        google_api = GoogleContactsAPI(credentials)
        sync_service = ContactSyncService()
        
        if label_id:
            # Sync specific group
            logger.info(f"Starting contacts sync for group: {label_id}")
            if force_refresh:
                background_tasks.add_task(sync_contacts_background, google_api, label_id)
                return {
                    "message": f"Contact sync started for group {label_id}",
                    "background": True
                }
            else:
                result = await sync_service.sync_contacts(google_api, label_id)
                return {
                    "message": f"Contacts synced for group {label_id}",
                    "result": result
                }
        else:
            # Sync all groups first
            logger.info("Starting full Google contacts sync")
            groups_result = await sync_service.sync_groups(google_api)
            
            if force_refresh:
                # Start background sync for all groups
                return {
                    "message": "Full sync started in background",
                    "groups_result": groups_result,
                    "background": True
                }
            else:
                return {
                    "message": "Groups synchronized successfully",
                    "result": groups_result
                }
    
    except Exception as e:
        logger.error(f"Error in Google sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_sync_status() -> Dict[str, Any]:
    """Get synchronization status"""
    try:
        sync_service = ContactSyncService()
        status = sync_service.get_sync_status()
        return status
    
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/google/url")
async def get_google_auth_url() -> Dict[str, str]:
    """Get Google OAuth authorization URL"""
    try:
        auth_service = GoogleAuthService()
        auth_url, state = auth_service.get_authorization_url()
        
        return {
            "auth_url": auth_url,
            "state": state
        }
    
    except Exception as e:
        logger.error(f"Error generating auth URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/google/callback")
async def google_auth_callback(code: str, state: str) -> Dict[str, str]:
    """Handle Google OAuth callback"""
    try:
        auth_service = GoogleAuthService()
        token_data = auth_service.exchange_code_for_token(code, state)
        
        # Store token (in production, use encrypted database storage)
        _token_storage["default"] = token_data
        
        return {
            "message": "Authentication successful",
            "status": "authenticated"
        }
    
    except Exception as e:
        logger.error(f"Error in auth callback: {e}")
        raise HTTPException(status_code=400, detail=str(e))