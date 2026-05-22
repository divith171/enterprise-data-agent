# RUNBOOK

## Activate Virtual Environment

```bash
.\venv\Scripts\activate
```

---

## Start PostgreSQL + pgvector

```bash
docker-compose up
```

If containers already exist:

```bash
docker-compose up -d
```

---

## Run FastAPI Server

```bash
uvicorn app.main:app --reload
```

Server URL:

```text
http://127.0.0.1:8000
```

---

## Run Benchmark Evaluation

```bash
python agents\benchmarks\run_benchmarks.py
```

---

## Git Workflow

### Check status

```bash
git status
```

### Stage changes

```bash
git add .
```

### Commit changes

```bash
git commit -m "message"
```

### Push changes

```bash
git push
```

---

## Common Troubleshooting

### Port already in use

Kill existing FastAPI process or restart terminal.

---

### PostgreSQL connection failure

Check Docker containers:

```bash
docker ps
```

Restart containers:

```bash
docker-compose restart
```

---

### Virtual environment not activated

Activate again:

```bash
.\venv\Scripts\activate
```

---

### OpenAI API issues

Check `.env` file contains valid API key.

---

### Benchmark leakage issue

Current known issue:
- orchestration state contamination across long benchmark sessions
- under evaluation during Concern 6 hardening phase

---

## Current Architecture Scope

Current V1:
- PostgreSQL-native
- governed enterprise analytics copilot
- orchestration + reviewer architecture
- semantic retrieval using pgvector

Future roadmap:
- orchestration hardening
- multi-domain benchmarks
- governance stress testing
- multi-database support