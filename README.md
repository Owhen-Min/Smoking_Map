# 🗺️ Smoking Map (흡연구역 지도)

사용자가 실시간 위치를 기반으로 주변의 흡연구역을 찾고, 새로운 흡연구역을 제보하거나 잘못된 정보를 수정할 수 있도록 돕는 위치 기반 커뮤니티 지도 서비스입니다.

---

## 🚀 주요 기능

- **📍 지도 서비스 및 실시간 위치 트래킹**
  - **카카오맵 API**를 기반으로 흡연구역의 정확한 마커 표시 (종류/정확도에 따라 다르게 표현되는 커스텀 핀)
  - 사용자의 실시간 GPS 정보 트래킹 및 내 위치로 지도 중심 이동 기능 제공

- **✏️ 흡연구역 정보 수정 및 신규 제보**
  - 지도상의 핀을 탭하여 이름, 설명, 도로명 주소 등의 상세 정보 카드 조회
  - 지도상에서 마커를 드래그하여 흡연구역 위치 정보를 직접 수정 제보
  - 지도 중심점을 기준으로 신규 흡연구역 제보 등록 가능

- **🛡️ 안정성 및 보안 (Rate Limiting & RLS)**
  - `localStorage` 기반으로 일일 최대 5회 제보/수정 제한 기능 (악성 제보 방지)
  - **Supabase Row Level Security (RLS)** 설정을 통해 안전한 데이터 트랜잭션 보장

- **🔍 검색 기능**
  - 도로명/지번 주소 및 인근 지하철역을 입력하여 지도의 검색 중심지 이동

- **🌓 다크 모드 (Dark Mode)**
  - 시스템 설정 및 사용자 선호에 최적화된 다크 모드 테마 스위치 지원

---

## 🛠️ 기술 스택 (Tech Stack)

### Core & Framework
- **React 19**
- **Next.js 16 (App Router)**
- **TypeScript**

### Styling
- **Tailwind CSS v4** (PostCSS 통합)

### Backend & Database
- **Supabase** (PostgreSQL, Supabase JS Client, `@supabase/ssr`)

### API & Maps
- **Kakao Maps SDK / API** (주소-좌표 변환 및 Geocoding, 지도 렌더링)

---

## 🌿 브랜치 규칙 (Branch Strategy)

본 프로젝트는 다음과 같은 Git 브랜치 전략을 준수하여 협업합니다.

- **`master`** : 프로덕션 출시용 브랜치. 가장 안정적인 배포 빌드만 병합됩니다.
- **`develop`** : 개발 통합 브랜치. 기능 개발이 완료된 브랜치들이 1차로 병합되는 곳입니다.
- **`feat_...` or `feat-...`** : 새로운 기능 개발을 수행하는 브랜치 (예: `feat_report_smoking_area`)
- **`style-...`** : 디자인 수정 및 퍼블리싱 스타일 작업을 위한 브랜치 (예: `style-setting_basic_color`)
- **`docs_...`** : 문서 작성 및 수정 작업을 위한 브랜치 (예: `docs_readme_update`)
- **`fix_...`** : 버그 및 이슈 수정을 위한 브랜치

---

## 📝 커밋 규칙 (Commit Conventions)

커밋 메시지는 작업 유형을 명확히 식별할 수 있도록 아래와 같은 접두사(Type Prefix) 형식을 따릅니다.

```
[TYPE] 커밋 내용 설명 (한글 또는 영문 작성)
```

### Type 목록

| 타입 | 설명 | 예시 |
| :--- | :--- | :--- |
| **`[FEAT]`** | 새로운 기능 추가 | `[FEAT] 주소로 위치검색 기능 추가` |
| **`[FIX]`** | 버그 및 에러 수정 | `[FIX] React 19 컴파일러 의존성 경고 수정` |
| **`[STYLE]`** | 코드의 로직 변경 없이 스타일/포맷팅, UI CSS 변경 | `[STYLE] 다크모드 고려하여 기본 색상 설정` |
| **`[DOCS]`** | 문서 작성/수정 (README.md 등) | `[DOCS] README 프로젝트 소개 및 규칙 추가` |
| **`[REFACTOR]`**| 기능 변경 없이 코드 리팩토링 | `[REFACTOR] 지오로케이션 로직 커스텀 훅으로 분리` |
| **`[CHORE]`** | 빌드 프로세스, 패키지 매니저 설정, 단순 설정 파일 수정 | `[CHORE] package.json 라이브러리 추가` |
| **`[MERGE]`** | 브랜치 머지 | `[MERGE] develop to master` |

---

## ⚙️ 시작 가이드 (Getting Started)

### 1. 환경 변수 설정
로컬 개발 환경 구축을 위해 루트 디렉토리에 `.env.local` 파일을 생성하고 아래 변수를 입력해 주세요.

```env
NEXT_PUBLIC_KAKAO_KEY=your_kakao_js_app_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. 패키지 설치 및 실행
```bash
# 의존성 패키지 설치
npm install

# 로컬 개발 서버 구동
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 실행을 확인할 수 있습니다.
