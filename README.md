# gaekdam-ai-bot

간단 소개
- FastAPI 기반 호텔 운영용 호텔 운영용 AI 봇 템플릿입니다. 문서 기반 RAG(FAISS + 로컬 임베딩)와 MariaDB 읽기 전용 분석(파라미터화된 SQL)을 결합해, 자연어로 질의하면 적절히 RAG 또는 DB 분석 경로로 라우팅하여 응답합니다.
- 개인정보(PII) 노출 방지(마스킹) 및 pydantic으로 NLU 출력 검증을 포함합니다.

주요 기능 요약
- 문서 검색(RAG): 로컬 FAISS 인덱스에서 관련 매뉴얼/발췌를 찾아 LLM으로 요약·응답
- DB 분석: 자연어에서 의도/파라미터를 추출해 안전한 파라미터화된 SQL로 집계
- NLU: LLM 우선 JSON 추출 + 룰 기반 폴백, 결과는 pydantic NLUResult로 검증
- PII 마스킹: LLM으로 보내기 전 모든 민감정보를 마스킹

  ```
사용 시나리오
- 질문 내용 중 메뉴얼, 컴플레인, 클레임 등과 같은 키워드가 들어가면 고객 응대 메뉴얼을 기반으로 AI봇이 응답을 해주게 됩니다.
- 질문 내용 중 오늘, 어제 등과 같은 기간 관련 내용이 들어가게 되면 사내 DB 의 체크인, 체크아웃 수 등을 응답해줄수 있습니다. 

1. 개발 서버 실행
- 개발 모드에서 명령어 : `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

1. 배포 확인 방법
- 기존 Docker 이미지/컨테이너/네트워크/볼륨 제거 : `docker system prune -a --volumes -f`
- Docker 이미지 생성 및 컨테이너 생성 : `docker-compose up -d --build`


---

## 보안 및 개인정보(PII) 관련 주의사항
- 모든 LLM 호출 이전에 민감정보(이름, 이메일, 전화번호, 신용카드 등)는 자동으로 마스킹 또는 요약됩니다.
- DB 조회는 읽기 전용이며, 내부적으로 SQL 파라미터 바인딩을 사용하여 SQL 인젝션을 방지합니다.
- 고객 식별 정보의 상세 제공은 내부 권한 확인 또는 관리자 승인 절차가 필요합니다.

## Testing & CI (quick guide)

- Create and activate a virtual environment (macOS zsh):

```bash
python -m venv .venv
source .venv/bin/activate
```

- Install dependencies (project includes pytest and test helpers in `requirements.txt`):

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

- Run fast unit tests (exclude slow/bulk tests):

```bash
pytest -m "not slow" -q
```

- Run full test suite (includes bulk/slow tests) and generate reports (JUnit, HTML, coverage):

```bash
mkdir -p reports
pytest -q \
  --junitxml=reports/junit.xml \
  --html=reports/report.html --self-contained-html \
  --cov=app --cov-report=xml:reports/coverage.xml --cov-report=html:reports/coverage_html
```

- Download CI artifacts (requires GitHub CLI `gh` and authentication):

```bash
chmod +x scripts/download_github_artifacts.sh
./scripts/download_github_artifacts.sh  # defaults: ci.yml, artifact 'test-reports', branch 'main'
```

- GitHub Actions
  - CI workflow runs fast tests on push/PR and uploads reports as artifacts.
  - The slow/bulk test job can be triggered manually from the Actions UI (workflow_dispatch).





