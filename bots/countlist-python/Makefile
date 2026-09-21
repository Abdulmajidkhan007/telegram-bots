.PHONY: up down build migrate lint dev

up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose build

migrate:
	docker-compose exec api alembic upgrade head

logs:
	docker-compose logs -f

dev-api:
	cd api && uvicorn main:app --reload --host 0.0.0.0 --port 8000

dev-bot:
	cd bot && python main.py

dev-dashboard:
	cd dashboard && npm run dev

install:
	cd dashboard && npm install
	cd api && pip install -r requirements.txt
	cd bot && pip install -r requirements.txt
