import { Receipt, ReceiptItem } from "@/types/receipt"
import OpenAI from "openai"

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
})

// 이미지 분석을 위한 최적화된 프롬프트
const RECEIPT_ANALYSIS_PROMPT = `한국 배달 영수증을 분석하여 JSON으로 추출하세요.

추출 정보:
- storeName: 상점명 (GS25, CU 등)
- transactionId: P로 시작하는 거래처
- orderNumber: 주문번호
- orderType: 배달/픽업
- customerServicePhone, riderCustomerService, customerSafetyNumber: 전화번호
- customerAddress: 배달 주소
- items[]: 상품 배열
  * name: 상품명 (대괄호/브랜드명 제거, 간결하게)
  * productCode: 바코드 번호 (13자리 숫자)
  * quantity: 수량
  * price: 개당 가격 (총액÷수량)
  * category: 스낵/음료/아이스크림/식품/빵류/기타
- totalQuantity: 합계 수량
- totalAmount: 합계 금액 (할인 전, "합계수량/금액" 옆 금액)
- discounts[]: 할인 배열 ("합계수량/금액"과 "과세 매출" 사이의 모든 할인 항목)
  * name: 할인명 (정확히, 예: "LG U+할인", "APP전용할인")
  * amount: 할인 금액 (숫자만, 1400, 680 등)
- totalDiscount: 총 할인 금액 (모든 할인의 합)
- finalAmount: 최종 결제액 (과세매출+부가세, 이것이 실제 결제 금액)
- taxableSales: 과세 매출 (정확히)
- vat: 부가세 (정확히)
- customerRequest, riderRequest: 요청사항
- orderReceiptTime: YYYY.MM.DD HH:mm:ss (YY/MM/DD → 20YY.MM.DD)

중요사항:
1. 금액 읽기 규칙:
   - 상품 가격, 할인 금액: 일의 자리는 항상 0 (예: 1400, 680, 2000)
   - 688처럼 끝자리 8은 오인식, 680이 맞음
   - 과세매출, 부가세: 끝자리 다양 (예: 17474, 1746)
2. finalAmount 계산:
   - finalAmount = totalAmount - totalDiscount
   - 예: 21500 - 2080 = 19420원
   - 과세매출+부가세는 참고용, finalAmount와 다를 수 있음 (비과세 있으면)
3. 날짜, 바코드 필수, JSON만

{"storeName":"","transactionId":"","orderNumber":"","orderType":"","customerServicePhone":"","riderCustomerService":"","customerSafetyNumber":"","customerAddress":"","items":[{"name":"","productCode":"","quantity":0,"price":0,"category":""}],"totalQuantity":0,"totalAmount":0,"discounts":[{"name":"","amount":0}],"totalDiscount":0,"finalAmount":0,"taxableSales":0,"vat":0,"customerRequest":"","riderRequest":"","orderReceiptTime":""}`

// 이미지 최적화 함수 (리사이즈 + 압축)
async function optimizeImage(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  console.log("=== 이미지 최적화 시작 ===")
  console.log("원본 크기:", buffer.length, "bytes")

  try {
    const sharp = (await import("sharp")).default

    // 영수증 이미지를 최적화 (텍스트 가독성 우선)
    const optimizedBuffer = await sharp(buffer)
      .resize(1600, null, {
        // 최대 너비 1600px로 제한 (텍스트 가독성 유지)
        fit: "inside",
        withoutEnlargement: true,
      })
      .sharpen() // 텍스트 선명도 향상
      .jpeg({
        quality: 92, // 품질 92% (텍스트 인식을 위해 높은 품질 유지)
        progressive: false, // 프로그레시브 비활성화 (더 선명한 텍스트)
      })
      .toBuffer()

    console.log("최적화된 크기:", optimizedBuffer.length, "bytes")
    console.log(
      "압축률:",
      ((1 - optimizedBuffer.length / buffer.length) * 100).toFixed(1) + "%"
    )
    console.log("=== 이미지 최적화 완료 ===")

    return optimizedBuffer
  } catch (error) {
    console.warn("이미지 최적화 실패, 원본 사용:", error)
    return buffer
  }
}

// 파일을 base64로 변환
async function convertFileToBase64(file: File): Promise<string> {
  // 서버 사이드에서는 Buffer를 사용
  if (typeof window === "undefined") {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return buffer.toString("base64")
  }

  // 클라이언트 사이드에서는 FileReader 사용
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

// Buffer를 base64로 변환
function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64")
}

// OpenAI API를 사용한 이미지 분석
async function analyzeImageWithOpenAI(imageFile: File): Promise<Receipt> {
  try {
    console.log("=== OpenAI 이미지 분석 시작 ===")
    console.log("이미지 파일:", imageFile.name, "크기:", imageFile.size)

    // 이미지 최적화 (리사이즈 + 압축)
    const optimizedBuffer = await optimizeImage(imageFile)

    // 최적화된 이미지를 base64로 변환
    const base64Image = bufferToBase64(optimizedBuffer)
    console.log("base64 변환 완료, 길이:", base64Image.length)

    // OpenAI API 호출
    const model = process.env.NEXT_PUBLIC_AI_MODEL || "gpt-4o-mini"
    console.log("=== OpenAI API 호출 정보 ===")
    console.log("사용할 모델:", model)
    console.log("이미지 크기 (base64):", base64Image.length, "characters")
    console.log("API 호출 시작 시간:", new Date().toISOString())

    const apiStartTime = Date.now()
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: RECEIPT_ANALYSIS_PROMPT,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000, // 토큰 수 줄임 (JSON 응답만 받으면 되므로)
      temperature: 0.1, // 일관된 결과를 위해 낮은 temperature 사용
    })
    const apiEndTime = Date.now()

    console.log("=== OpenAI API 응답 정보 ===")
    console.log("API 응답 시간:", new Date().toISOString())
    console.log("API 호출 소요 시간:", apiEndTime - apiStartTime, "ms")
    console.log("사용된 토큰:")
    console.log("  - Prompt 토큰:", response.usage?.prompt_tokens || 0)
    console.log("  - Completion 토큰:", response.usage?.completion_tokens || 0)
    console.log("  - 총 토큰:", response.usage?.total_tokens || 0)
    console.log("모델:", response.model)
    console.log("응답 선택지 수:", response.choices.length)

    // 비용 계산 (gpt-4o-mini 기준)
    const promptTokens = response.usage?.prompt_tokens || 0
    const completionTokens = response.usage?.completion_tokens || 0
    const inputCost = (promptTokens / 1000000) * 0.15
    const outputCost = (completionTokens / 1000000) * 0.6
    const totalCost = inputCost + outputCost

    console.log("=== 비용 정보 (gpt-4o-mini 기준) ===")
    console.log(
      "  - 입력 비용: $" +
        inputCost.toFixed(6) +
        " (약 " +
        (inputCost * 1380).toFixed(2) +
        "원)"
    )
    console.log(
      "  - 출력 비용: $" +
        outputCost.toFixed(6) +
        " (약 " +
        (outputCost * 1380).toFixed(2) +
        "원)"
    )
    console.log(
      "  - 총 비용: $" +
        totalCost.toFixed(6) +
        " (약 " +
        (totalCost * 1380).toFixed(2) +
        "원)"
    )
    console.log(
      "  - 월 200회 예상 비용: 약 " + (totalCost * 200 * 1380).toFixed(0) + "원"
    )
    console.log("======================================")

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("OpenAI API에서 응답을 받지 못했습니다.")
    }

    console.log("=== AI 응답 내용 ===")
    console.log("응답 길이:", content.length, "characters")
    console.log("응답 내용 (전체):")
    console.log(content)
    console.log("===================")

    // JSON 파싱
    let receiptData
    try {
      console.log("JSON 파싱 시도 중...")
      // JSON 부분만 추출 (```json으로 감싸져 있을 수 있음)
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content

      console.log("추출된 JSON 문자열 길이:", jsonString.length)

      receiptData = JSON.parse(jsonString)
      console.log("JSON 파싱 성공!")
      console.log("파싱된 데이터 키:", Object.keys(receiptData))
      console.log("상품 수:", receiptData.items?.length || 0)
    } catch (parseError) {
      console.error("=== JSON 파싱 오류 ===")
      console.error("오류:", parseError)
      console.error("원본 응답 일부:", content.substring(0, 500))
      console.error("=====================")
      throw new Error("AI 응답을 JSON으로 파싱할 수 없습니다.")
    }

    // Receipt 객체로 변환
    const receipt: Receipt = {
      id: Date.now().toString(),
      storeName: receiptData.storeName || "",
      transactionId: receiptData.transactionId || "",
      orderNumber: receiptData.orderNumber || "",
      orderType: receiptData.orderType || "",
      customerServicePhone: receiptData.customerServicePhone || "",
      riderCustomerService: receiptData.riderCustomerService || "",
      customerSafetyNumber: receiptData.customerSafetyNumber || "",
      customerAddress: receiptData.customerAddress || "",
      items: receiptData.items || [],
      totalQuantity: receiptData.totalQuantity || 0,
      totalAmount: receiptData.totalAmount || 0,
      discounts: receiptData.discounts || [],
      totalDiscount: receiptData.totalDiscount || 0,
      finalAmount: receiptData.finalAmount || receiptData.totalAmount || 0,
      taxableSales: receiptData.taxableSales || 0,
      vat: receiptData.vat || 0,
      customerRequest: receiptData.customerRequest || "",
      riderRequest: receiptData.riderRequest || "",
      orderReceiptTime: receiptData.orderReceiptTime || "",
      imageUrl: await convertFileToBase64(imageFile),
      created_at: new Date(),
      updated_at: new Date(),
    }

    console.log("=== 이미지 분석 완료 ===")
    console.log("추출된 정보:")
    console.log("- 상점명:", receipt.storeName)
    console.log("- 거래처:", receipt.transactionId)
    console.log("- 주문번호:", receipt.orderNumber)
    console.log("- 주문형태:", receipt.orderType)
    console.log("- 고객주소:", receipt.customerAddress)
    console.log("- 총 수량:", receipt.totalQuantity)
    console.log("- 합계 금액 (할인 전):", receipt.totalAmount, "원")
    if (receipt.discounts && receipt.discounts.length > 0) {
      console.log("- 할인 내역:")
      receipt.discounts.forEach((discount) => {
        console.log(`  · ${discount.name}: -${discount.amount}원`)
      })
      console.log("- 총 할인 금액:", receipt.totalDiscount, "원")
      console.log("- 최종 결제 금액:", receipt.finalAmount, "원")
    }
    console.log("- 과세 매출:", receipt.taxableSales, "원")
    console.log("- 부가세:", receipt.vat, "원")
    console.log("- 상품 수:", receipt.items.length)
    if (receipt.items.length > 0) {
      console.log("- 상품 목록:")
      receipt.items.forEach((item, idx) => {
        const productCode = item.productCode ? ` [${item.productCode}]` : ""
        console.log(
          `  ${idx + 1}. ${item.name}${productCode} x${item.quantity} = ${
            item.price * item.quantity
          }원 (개당 ${item.price}원, ${item.category})`
        )
      })
    }
    console.log("========================")

    return receipt
  } catch (error) {
    console.error("OpenAI 이미지 분석 오류:", error)
    throw error
  }
}

// 메인 이미지 처리 함수
export async function processReceiptImage(imageFile: File): Promise<Receipt> {
  const startTime = Date.now()

  try {
    console.log("=== 영수증 이미지 처리 시작 ===")
    console.log(
      "파일명:",
      imageFile.name,
      "크기:",
      imageFile.size,
      "타입:",
      imageFile.type
    )

    // OpenAI API를 사용한 이미지 분석
    const receipt = await analyzeImageWithOpenAI(imageFile)

    const endTime = Date.now()
    const processingTime = endTime - startTime

    console.log("=== 영수증 이미지 처리 완료 ===")
    console.log(`총 처리 시간: ${processingTime}ms`)
    console.log(`이미지 크기: ${imageFile.size} bytes`)

    return receipt
  } catch (error) {
    const endTime = Date.now()
    const processingTime = endTime - startTime

    console.error("이미지 처리 중 오류:", error)
    console.error(`처리 시간: ${processingTime}ms`)

    // 오류 발생 시 빈 데이터 반환
    return createEmptyReceipt(imageFile)
  }
}

// 오류 시 빈 영수증 생성
async function createEmptyReceipt(imageFile: File): Promise<Receipt> {
  return {
    id: Date.now().toString(),
    storeName: "",
    transactionId: "",
    orderNumber: "",
    orderType: "",
    customerServicePhone: "",
    riderCustomerService: "",
    customerSafetyNumber: "",
    customerAddress: "",
    items: [],
    totalQuantity: 0,
    totalAmount: 0,
    taxableSales: 0,
    vat: 0,
    customerRequest: "",
    riderRequest: "",
    orderReceiptTime: "",
    imageUrl: await convertFileToBase64(imageFile),
    created_at: new Date(),
    updated_at: new Date(),
  }
}

// 이미지 촬영 가이드
export function getImageCaptureTips(): string[] {
  return [
    "📱 밝은 곳에서 촬영하세요",
    "📄 영수증을 평평하게 놓고 촬영하세요",
    "🔍 가까이서 선명하게 촬영하세요",
    "💡 그림자나 반사를 피하세요",
    "📏 영수증 전체가 화면에 들어오도록 하세요",
    "⚡ 손을 흔들리지 않게 촬영하세요",
  ]
}
