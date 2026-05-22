# Enterprise Data Agent

AI-powered governed enterprise analytics copilot for PostgreSQL.

---

## Features

- Natural language to SQL generation
- Governance-aware analytical reasoning
- Clarification handling for ambiguous business queries
- Multi-step orchestration pipeline
- Reviewer-based SQL validation
- Semantic schema retrieval using pgvector
- Relationship-aware query generation
- Benchmark evaluation framework

---

## Architecture

User Query  
↓  
Intent Understanding  
↓  
Schema + Semantic Retrieval  
↓  
Governance & Clarification Layer  
↓  
Analytical Planning  
↓  
SQL Generation  
↓  
Reviewer Validation  
↓  
Execution & Explanation

---

## Tech Stack

- Python
- FastAPI
- PostgreSQL
- pgvector
- OpenAI API
- Docker
- Uvicorn

---

## Setup

### 1. Clone repository

```bash
git clone https://github.com/divith171/enterprise-data-agent.git
```

### 2. Create virtual environment

```bash
python -m venv venv
```

### 3. Activate virtual environment

```bash
.\venv\Scripts\activate
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Start PostgreSQL + pgvector

```bash
docker-compose up
```

### 6. Run FastAPI server

```bash
uvicorn app.main:app --reload
```

---

## Benchmarking

Run benchmark evaluation:

```bash
python agents\benchmarks\run_benchmarks.py
```

---

## Current Scope

Current V1 supports PostgreSQL-native enterprise analytics workflows.

Future roadmap includes:
- multi-database support
- enterprise integrations
- advanced governance evaluation
- orchestration reliability hardening

---

## Known Limitations

- Currently PostgreSQL-native
- Long-session orchestration leakage under evaluation
- Benchmark suite still expanding