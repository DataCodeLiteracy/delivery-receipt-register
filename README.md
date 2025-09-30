# 배달 영수증 기록장 🧾

모바일에서 웹으로 열어서 사용할 수 있는 배달 영수증 관리 서비스입니다. 핸드폰으로 찍은 영수증 이미지를 AI 분석하여 자동으로 데이터를 추출하고, 지출 패턴을 분석할 수 있습니다.

## ✨ 주요 기능

- **📸 영수증 이미지 업로드**: 갤러리에서 이미지 파일 선택
- **🤖 AI 이미지 분석**: OpenAI API를 활용한 지능형 영수증 분석
- **📊 지출 분석**: 월별, 카테고리별 지출 통계 및 차트
- **🔍 검색 및 필터링**: 상점명, 상품명, 날짜로 검색
- **📱 모바일 최적화**: 반응형 디자인으로 모바일에서 편리하게 사용

## 🏗️ 기술 스택

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **AI**: OpenAI API (GPT-4o)
- **Charts**: Recharts
- **Icons**: Lucide React

## 🚀 시작하기

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone <repository-url>
cd delivery-receipt-register
yarn install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# OpenAI API 설정
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_AI_MODEL=gpt-4o-mini

# Firebase 설정
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Firestore Database와 Storage 활성화
3. 웹 앱 추가 및 설정 정보 복사

### 4. OpenAI API 설정

1. [OpenAI Platform](https://platform.openai.com/)에서 계정 생성
2. API 키 생성 (Billing 설정 필요)
3. 사용할 모델 선택 (gpt-4o-mini 권장 - 비용 효율적)

### 5. 개발 서버 실행

```bash
yarn dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📱 사용 방법

### 1. 영수증 등록

- 메인 페이지에서 "이미지 파일 선택" 버튼 클릭
- 영수증 이미지 선택 후 "이미지 분석하기" 버튼 클릭
- AI가 자동으로 추출한 데이터 확인 및 저장

### 2. 영수증 목록 확인

- "배달 목록" 메뉴에서 등록된 모든 영수증 확인
- 검색 기능으로 특정 영수증 빠르게 찾기

### 3. 분석 결과 보기

- "분석 결과" 메뉴에서 지출 통계 및 차트 확인
- 월별 지출 추이, 카테고리별 분석, 자주 구매하는 상품 등

## 🗂️ 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx          # 메인 페이지 (OCR 업로드)
│   ├── receipts/         # 영수증 관련 페이지
│   │   ├── page.tsx      # 영수증 목록
│   │   └── [id]/         # 영수증 상세
│   │       └── page.tsx
│   └── analysis/         # 분석 결과 페이지
│       └── page.tsx
├── lib/                   # 유틸리티 함수
│   ├── firebase.ts       # Firebase 설정
│   ├── database.ts       # 데이터베이스 작업
│   └── ocr.ts           # AI 이미지 분석
└── types/                 # TypeScript 타입 정의
    └── receipt.ts        # 영수증 관련 타입
```

## 🔧 개발 가이드

### 새로운 기능 추가

1. `src/types/`에 타입 정의 추가
2. `src/lib/`에 관련 함수 구현
3. `src/app/`에 페이지 컴포넌트 생성

### 스타일링

- Tailwind CSS 클래스 사용
- 모바일 우선 반응형 디자인
- 일관된 색상 및 간격 유지

## 📊 데이터 구조

### 영수증 (Receipt)

```typescript
interface Receipt {
  id: string
  storeName: string
  transactionId: string
  orderNumber: string
  orderType: string
  customerServicePhone: string
  riderCustomerService: string
  customerSafetyNumber: string
  customerAddress: string
  items: ReceiptItem[]
  totalQuantity: number
  totalAmount: number
  taxableSales: number
  vat: number
  customerRequest?: string
  riderRequest?: string
  cardNumber?: string
  gsAllPointsBasic?: number
  gsAllPointsAccumulated?: number
  orderReceiptTime: string
  imageUrl: string
  createdAt: Date
  updatedAt: Date
}
```

## 🚀 배포

### Vercel 배포 (권장)

1. GitHub에 코드 푸시
2. [Vercel](https://vercel.com)에서 프로젝트 연결
3. 환경 변수 설정
4. 자동 배포 완료

### 다른 플랫폼

```bash
yarn build
yarn start
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.

---

**배달 영수증 기록장**으로 체계적인 지출 관리와 분석을 시작하세요! 🎯
