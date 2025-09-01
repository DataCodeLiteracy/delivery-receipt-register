import { Receipt, ReceiptItem } from "@/types/receipt"

// Google Cloud Vision API 설정
const GOOGLE_VISION_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY

// OCR 결과를 파싱하는 함수들
function extractStoreName(text: string): string {
  const storePatterns = [
    /(GS25|CU|세븐일레븐|이마트|홈플러스|롯데마트|코스트코)/,
    /([가-힣]+편의점)/,
    /([가-힣]+마트)/,
  ]

  for (const pattern of storePatterns) {
    const match = text.match(pattern)
    if (match) return match[1] || match[0]
  }

  return "기타 상점"
}

function extractOrderNumber(text: string): string {
  const orderPattern = /주문번호[:\s]*(\d{14})/
  const match = text.match(orderPattern)
  return match ? match[1] : Date.now().toString()
}

function extractOrderType(text: string): string {
  if (text.includes("배달")) return "배달"
  if (text.includes("픽업")) return "픽업"
  if (text.includes("방문")) return "방문"
  return "일반"
}

function extractPhoneNumbers(text: string): {
  customerService: string
  riderService: string
} {
  const phonePattern = /(\d{3,4}-\d{3,4}-\d{4})/g
  const phones = text.match(phonePattern) || []

  return {
    customerService: phones[0] || "정보 없음",
    riderService: phones[1] || "정보 없음",
  }
}

function extractAddress(text: string): string {
  const addressPattern = /([가-힣]+시\s+[가-힣]+구\s+[가-힣]+동[^,\n]*)/g
  const match = text.match(addressPattern)
  return match ? match[0] : "주소 정보 없음"
}

function extractItems(text: string): ReceiptItem[] {
  const items: ReceiptItem[] = []

  // 상품 정보 추출 패턴
  const itemPatterns = [
    /([가-힣\w\s]+)\s*(\d+)개?\s*(\d{1,3}(?:,\d{3})*)원/g,
    /([가-힣\w\s]+)\s*(\d{1,3}(?:,\d{3})*)원\s*(\d+)개?/g,
  ]

  for (const pattern of itemPatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim()
      const quantity = parseInt(match[2] || match[3])
      const price = parseInt((match[3] || match[2]).replace(/,/g, ""))

      if (name && !isNaN(quantity) && !isNaN(price)) {
        items.push({
          name,
          quantity,
          price,
          category: extractCategory(name),
        })
      }
    }
  }

  return items
}

function extractCategory(itemName: string): string {
  const categories = {
    스낵: ["과자", "초콜릿", "껌", "젤리", "스낵"],
    음료: ["음료", "커피", "차", "주스", "탄산"],
    아이스크림: ["아이스크림", "빙수", "소르베"],
    생활용품: ["휴지", "비누", "치약", "칫솔"],
    식품: ["라면", "밥", "김", "반찬"],
    얼음: ["얼음", "드라이아이스"],
    담배: ["담배", "라이터"],
    기타: [],
  }

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => itemName.includes(keyword))) {
      return category
    }
  }

  return "기타"
}

function extractTotalAmount(text: string): number {
  const totalPatterns = [
    /합계[:\s]*(\d{1,3}(?:,\d{3})*)원/,
    /총\s*금액[:\s]*(\d{1,3}(?:,\d{3})*)원/,
    /결제금액[:\s]*(\d{1,3}(?:,\d{3})*)원/,
  ]

  for (const pattern of totalPatterns) {
    const match = text.match(pattern)
    if (match) {
      return parseInt(match[1].replace(/,/g, ""))
    }
  }

  return 0
}

function extractVAT(text: string): { taxableSales: number; vat: number } {
  const vatPattern = /부가세[:\s]*(\d{1,3}(?:,\d{3})*)원/
  const match = text.match(vatPattern)

  if (match) {
    const vat = parseInt(match[1].replace(/,/g, ""))
    const taxableSales = vat * 10 // 부가세 10% 기준
    return { taxableSales, vat }
  }

  return { taxableSales: 0, vat: 0 }
}

function extractCustomerRequest(text: string): string {
  const requestPattern = /고객\s*요청사항[:\s]*([^\n]+)/
  const match = text.match(requestPattern)
  return match ? match[1].trim() : ""
}

function extractRiderRequest(text: string): string {
  const requestPattern = /라이더\s*요청사항[:\s]*([^\n]+)/
  const match = text.match(requestPattern)
  return match ? match[1].trim() : ""
}

function extractCardInfo(text: string): {
  cardNumber: string
  points: { basic: number; accumulated: number }
} {
  const cardPattern = /(\d{4}-\d{2}\*\*-\*\*\*\*-\d{4})/
  const basicPointsPattern = /기본적립[:\s]*(\d+)점/
  const accumulatedPointsPattern = /누적[:\s]*(\d+)점/

  const cardMatch = text.match(cardPattern)
  const basicMatch = text.match(basicPointsPattern)
  const accumulatedMatch = text.match(accumulatedPointsPattern)

  return {
    cardNumber: cardMatch ? cardMatch[1] : "",
    points: {
      basic: basicMatch ? parseInt(basicMatch[1]) : 0,
      accumulated: accumulatedMatch ? parseInt(accumulatedMatch[1]) : 0,
    },
  }
}

function extractOrderTime(text: string): string {
  // 다양한 시간 패턴 매칭
  const patterns = [
    /주문\s*접수\s*시간[:\s]*(\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/,
    /주문시간[:\s]*(\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/,
    /접수시간[:\s]*(\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/,
    /(\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/,
    /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const timeStr = match[1]
      try {
        // 25/09/01 20:04:44 형식 처리
        if (timeStr.includes("/")) {
          const parts = timeStr.split(" ")
          if (parts.length === 2) {
            const datePart = parts[0].split("/")
            const timePart = parts[1].split(":")

            if (datePart.length === 3 && timePart.length === 3) {
              const year = parseInt(datePart[0])
              const month = parseInt(datePart[1])
              const day = parseInt(datePart[2])
              const hours = parseInt(timePart[0])
              const minutes = parseInt(timePart[1])
              const seconds = parseInt(timePart[2])

              // 2자리 연도는 2000년대로 가정 (25 -> 2025)
              const fullYear = year < 100 ? 2000 + year : year

              // YYYY.MM.DD HH:mm:ss 형식으로 반환
              return `${fullYear}.${String(month).padStart(2, "0")}.${String(
                day
              ).padStart(2, "0")} ${String(hours).padStart(2, "0")}:${String(
                minutes
              ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
            }
          }
        }

        // 기존 방식으로 파싱 시도
        const date = new Date(timeStr)
        if (!isNaN(date.getTime())) {
          // YYYY.MM.DD HH:mm:ss 형식으로 반환
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, "0")
          const day = String(date.getDate()).padStart(2, "0")
          const hours = String(date.getHours()).padStart(2, "0")
          const minutes = String(date.getMinutes()).padStart(2, "0")
          const seconds = String(date.getSeconds()).padStart(2, "0")

          return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`
        }
      } catch (e) {
        // 파싱 실패 시 원본 문자열 반환
        console.warn("날짜 파싱 실패:", timeStr)
      }
    }
  }

  // 기본값으로 현재 시간을 표준 형식으로 반환
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  const seconds = String(now.getSeconds()).padStart(2, "0")

  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`
}

// 테스트용: 날짜 파싱 함수 테스트
export function testDateParsing() {
  const testCases = [
    "25/09/01 20:04:44",
    "24/12/25 15:30:00",
    "2024-12-25 15:30:00",
    "주문접수시간: 25/09/01 20:04:44",
    "주문시간 24/12/25 15:30:00",
  ]

  console.log("=== 날짜 파싱 테스트 ===")
  testCases.forEach((testCase) => {
    const result = extractOrderTime(testCase)
    console.log(`입력: "${testCase}" -> 결과: "${result}"`)
  })
}

// 메인 OCR 처리 함수
export async function processReceiptImage(imageFile: File): Promise<Receipt> {
  try {
    // 이미지를 base64로 인코딩
    const base64Image = await convertFileToBase64(imageFile)

    // Google Vision API 호출
    const ocrResult = await callGoogleVisionAPI(base64Image)

    // OCR 결과 파싱
    const receipt = parseReceiptText(ocrResult)

    // 이미지 URL 생성
    receipt.imageUrl = URL.createObjectURL(imageFile)
    receipt.created_at = new Date()
    receipt.updated_at = new Date()

    return receipt
  } catch (error) {
    console.error("OCR 처리 중 오류:", error)

    // 오류 발생 시 더미 데이터 반환 (개발용)
    return createDummyReceipt(imageFile)
  }
}

// 파일을 base64로 변환
async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(",")[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Google Vision API 호출
async function callGoogleVisionAPI(base64Image: string): Promise<string> {
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error("Google Vision API 키가 설정되지 않았습니다.")
  }

  const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`

  const requestBody = {
    requests: [
      {
        image: {
          content: base64Image,
        },
        features: [
          {
            type: "TEXT_DETECTION",
            maxResults: 1,
          },
        ],
      },
    ],
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    throw new Error(`Vision API 호출 실패: ${response.status}`)
  }

  const result = await response.json()
  return result.responses[0]?.textAnnotations[0]?.description || ""
}

// OCR 텍스트를 Receipt 객체로 파싱
export function parseReceiptText(text: string): Receipt {
  const items = extractItems(text)
  const totalAmount =
    extractTotalAmount(text) ||
    items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const { taxableSales, vat } = extractVAT(text)
  const { customerService, riderService } = extractPhoneNumbers(text)
  const { cardNumber, points } = extractCardInfo(text)

  return {
    id: Date.now().toString(),
    storeName: extractStoreName(text),
    transactionId: `TXN${Date.now()}`,
    orderNumber: extractOrderNumber(text),
    orderType: extractOrderType(text),
    customerServicePhone: customerService,
    riderCustomerService: riderService,
    customerSafetyNumber: `SAFE${Date.now().toString().slice(-6)}`,
    customerAddress: extractAddress(text),
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount,
    taxableSales: taxableSales || Math.round(totalAmount / 1.1),
    vat: vat || Math.round(totalAmount / 11),
    customerRequest: extractCustomerRequest(text),
    riderRequest: extractRiderRequest(text),
    cardNumber,
    gsAllPointsBasic: points.basic,
    gsAllPointsAccumulated: points.accumulated,
    orderReceiptTime: extractOrderTime(text),
    imageUrl: "",
    created_at: new Date(),
    updated_at: new Date(),
  }
}

// 더미 데이터 생성 (개발용)
function createDummyReceipt(imageFile: File): Receipt {
  return {
    id: Date.now().toString(),
    storeName: "GS25",
    transactionId: "PV8282",
    orderNumber: "20250901112225",
    orderType: "우리동네GS 배달",
    customerServicePhone: "080-999-5601",
    riderCustomerService: "1800-8255",
    customerSafetyNumber: "050253153265",
    customerAddress: "경기 안산시 단원구 와동 723-2, 104호 안산여성노동자회",
    items: [
      {
        name: "포장봉투",
        quantity: 1,
        price: 200,
      },
      {
        name: "농심) 닭다리66G",
        productCode: "8801043036535",
        category: "53 스낵",
        quantity: 1,
        price: 1700,
      },
      {
        name: "농심) 먹태깡청양마요맛(봉지)",
        productCode: "8801043068314",
        category: "53 스낵",
        quantity: 1,
        price: 1700,
      },
      {
        name: "유어스) 돌덩이얼음1KG",
        productCode: "8809197840268",
        category: "44 얼음",
        quantity: 2,
        price: 2200,
      },
      {
        name: "피치) 프로즌딸기소르베75G",
        productCode: "8809971932615",
        category: "43 아이스크림",
        quantity: 1,
        price: 4900,
      },
    ],
    totalQuantity: 6,
    totalAmount: 12900,
    taxableSales: 11545,
    vat: 1155,
    customerRequest: "",
    riderRequest: "문 앞에 두고 가주세요 (벨 0)",
    cardNumber: "0190-79**-****-7110",
    gsAllPointsBasic: 13,
    gsAllPointsAccumulated: 97,
    orderReceiptTime: "2025.09.01 20:04:44",
    imageUrl: URL.createObjectURL(imageFile),
    created_at: new Date(),
    updated_at: new Date(),
  }
}
