# Docker Setup - Prompt Version Hub

## Quick Start

### 1. Setup Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and update values for production
# IMPORTANT: Change JWT_SECRET and passwords in production!
```

### 2. Start Services

```bash
# Start all services (backend + postgres)
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f postgres
```

### 3. Access the API

- **API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Default admin credentials:
- Email: `admin@example.com`
- Password: `changeme123`

## Architecture

### Services

#### PostgreSQL Database
- **Image**: postgres:16-alpine
- **Port**: 5432 (configurable via `POSTGRES_PORT`)
- **Volume**: Persistent data stored in `prompt-hub-postgres-data`
- **Health Check**: Automatic health monitoring
- **Init Scripts**: Runs SQL migrations from `backend/migrations/` on first start

#### Backend API
- **Build**: Multi-stage optimized Dockerfile
- **Port**: 8000 (configurable via `BACKEND_PORT`)
- **Dependencies**: Waits for PostgreSQL to be healthy
- **Health Check**: HTTP endpoint monitoring
- **Auto-restart**: Unless manually stopped

#### Optional: pgAdmin (Database GUI)
Uncomment the `pgadmin` service in `docker-compose.yml` to enable:
- **Port**: 5050 (configurable via `PGADMIN_PORT`)
- **Access**: http://localhost:5050

## Dockerfile Optimizations

The backend Dockerfile uses several optimization techniques:

### Multi-Stage Build
- **Builder Stage**: Installs build dependencies and Python packages
- **Final Stage**: Only includes runtime dependencies and application code
- **Result**: ~60% smaller final image

### Layer Caching
- Requirements installed before copying app code
- Leverages Docker layer caching for faster rebuilds

### Security
- Runs as non-root user (`appuser`)
- Minimal attack surface (slim base image)
- Only necessary packages installed

### Performance
- Virtual environment for isolated dependencies
- No Python bytecode files (PYTHONDONTWRITEBYTECODE)
- Unbuffered output for real-time logs (PYTHONUNBUFFERED)

## Commands

### Start Services
```bash
# Start in background
docker-compose up -d

# Start with logs
docker-compose up

# Rebuild and start
docker-compose up -d --build
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data!)
docker-compose down -v
```

### Manage Services
```bash
# Restart a service
docker-compose restart backend

# View service status
docker-compose ps

# Execute command in container
docker-compose exec backend bash
docker-compose exec postgres psql -U postgres -d prompt_version_hub
```

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Database Operations
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d prompt_version_hub

# Backup database
docker-compose exec postgres pg_dump -U postgres prompt_version_hub > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres -d prompt_version_hub < backup.sql

# Run migrations manually
docker-compose exec postgres psql -U postgres -d prompt_version_hub -f /docker-entrypoint-initdb.d/0001_init.sql
```

### Development Mode
```bash
# Enable hot reload by uncommenting volume mount in docker-compose.yml:
# volumes:
#   - ./backend/app:/app/app:ro

# Rebuild after code changes
docker-compose up -d --build backend
```

## Environment Variables

### Database Configuration
- `POSTGRES_DB`: Database name (default: `prompt_version_hub`)
- `POSTGRES_USER`: Database user (default: `postgres`)
- `POSTGRES_PASSWORD`: Database password (default: `postgres`)
- `POSTGRES_PORT`: Exposed port (default: `5432`)

### Backend Configuration
- `BACKEND_PORT`: API port (default: `8000`)
- `JWT_SECRET`: Secret key for JWT tokens (CHANGE IN PRODUCTION!)
- `JWT_EXPIRES_MIN`: Token expiration in minutes (default: `60`)
- `ADMIN_EMAIL`: Default admin email
- `ADMIN_PASSWORD`: Default admin password (CHANGE IN PRODUCTION!)

### Optional: pgAdmin
- `PGADMIN_EMAIL`: pgAdmin login email
- `PGADMIN_PASSWORD`: pgAdmin login password
- `PGADMIN_PORT`: pgAdmin port (default: `5050`)

## Volumes

### postgres_data
- **Purpose**: Persistent PostgreSQL data
- **Location**: Docker managed volume
- **Backup**: Use `pg_dump` command above

### backend_logs
- **Purpose**: Application logs
- **Location**: Docker managed volume
- **Access**: `docker-compose exec backend ls /app/logs`

## Networking

All services communicate via the `prompt-hub-network` bridge network:
- Services can reference each other by service name
- Backend connects to database via `postgres:5432`
- Isolated from other Docker networks

## Health Checks

### PostgreSQL
- **Check**: `pg_isready` command
- **Interval**: 10 seconds
- **Retries**: 5 times
- **Start Period**: 10 seconds

### Backend
- **Check**: HTTP GET to `/`
- **Interval**: 30 seconds
- **Retries**: 3 times
- **Start Period**: 40 seconds

## Troubleshooting

### Backend won't start
```bash
# Check backend logs
docker-compose logs backend

# Check database connection
docker-compose exec postgres pg_isready -U postgres

# Verify environment variables
docker-compose exec backend env | grep DATABASE_URL
```

### Database connection errors
```bash
# Ensure postgres is healthy
docker-compose ps

# Check postgres logs
docker-compose logs postgres

# Test connection manually
docker-compose exec postgres psql -U postgres -d prompt_version_hub -c "SELECT 1;"
```

### Port already in use
```bash
# Change port in .env file
BACKEND_PORT=8001
POSTGRES_PORT=5433

# Restart services
docker-compose down
docker-compose up -d
```

### Out of disk space
```bash
# Remove unused Docker resources
docker system prune -a

# Remove only volumes (WARNING: deletes data!)
docker volume prune
```

### Reset everything
```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all -v

# Start fresh
docker-compose up -d --build
```

## Production Deployment

### Security Checklist
- [ ] Change `JWT_SECRET` to a strong random string (32+ characters)
- [ ] Change `ADMIN_PASSWORD` to a strong password
- [ ] Change `POSTGRES_PASSWORD` to a strong password
- [ ] Update CORS settings in `backend/app/main.py`
- [ ] Use environment-specific `.env` files
- [ ] Enable HTTPS (use reverse proxy like Nginx/Traefik)
- [ ] Set up regular database backups
- [ ] Configure log rotation
- [ ] Set resource limits in docker-compose.yml

### Resource Limits (Example)
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Reverse Proxy (Nginx Example)
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Performance Tuning

### PostgreSQL
Edit docker-compose.yml to add PostgreSQL performance settings:
```yaml
postgres:
  command:
    - "postgres"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "effective_cache_size=1GB"
```

### Backend
Adjust worker processes:
```yaml
backend:
  command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Monitoring

### Container Stats
```bash
# Real-time resource usage
docker stats

# Specific container
docker stats prompt-hub-api prompt-hub-db
```

### Health Status
```bash
# All services
docker-compose ps

# Detailed health info
docker inspect --format='{{json .State.Health}}' prompt-hub-api | jq
```

## Support

For issues, check:
1. Service logs: `docker-compose logs`
2. Health status: `docker-compose ps`
3. Network connectivity: `docker network inspect prompt-hub-network`
4. Volume status: `docker volume ls`

For backend-specific issues, refer to the main project README.md.
