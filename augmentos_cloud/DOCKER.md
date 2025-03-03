# Docker Deployment Guide for AugmentOS Cloud

## Quick Start

```bash
# Clone repository
git clone https://github.com/your-username/AugmentOS.git
cd AugmentOS

# Create .env file with required config (see below)
touch .env

# Build and run
docker-compose build
docker-compose up
```

## Required Configuration

Create a `.env` file with:

```
# Required
AUGMENTOS_AUTH_JWT_SECRET=your_jwt_secret_here
```
# Search functionality 
SERPAPI_API_KEY=your_serpapi_key

# Speech services
AZURE_SPEECH_REGION=your_region
AZURE_SPEECH_KEY=your_key

# LLM services
LLM_MODEL=gpt-4o
AZURE_OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
```

## Service Ports

- Main API: 8002
- Live Captions: 8010
- Flash: 8011
- Dashboard: 8012
- Agent Gatekeeper: 8013
- Notifications: 8014
- Mira AI: 8015

## Troubleshooting

### JWT Authentication Errors
Ensure `AUGMENTOS_AUTH_JWT_SECRET` matches between augment_manager and cloud.

### Missing WASM Files
Run:
```bash
docker-compose down
docker-compose build --no-cache augmentos-cloud
docker-compose up
```