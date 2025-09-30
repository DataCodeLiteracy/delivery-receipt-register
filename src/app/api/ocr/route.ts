import { NextRequest, NextResponse } from "next/server"
import { processReceiptImage } from "@/lib/ocr"

export async function POST(request: NextRequest) {
  try {
    console.log("=== 이미지 분석 API 라우트 시작 ===")

    const formData = await request.formData()
    const imageFile = formData.get("image") as File

    if (!imageFile) {
      console.error("이미지 파일이 없습니다.")
      return NextResponse.json(
        { error: "이미지 파일이 필요합니다." },
        { status: 400 }
      )
    }

    console.log(
      "받은 이미지 파일:",
      imageFile.name,
      "크기:",
      imageFile.size,
      "타입:",
      imageFile.type
    )

    // 이미지 분석 처리
    console.log("processReceiptImage 호출 시작...")
    const receipt = await processReceiptImage(imageFile)
    console.log("processReceiptImage 완료, 상점명:", receipt.storeName)

    console.log("=== 이미지 분석 API 라우트 완료 ===")
    return NextResponse.json({ receipt })
  } catch (error) {
    console.error("이미지 분석 처리 오류:", error)
    console.error(
      "오류 상세:",
      error instanceof Error ? error.message : String(error)
    )
    console.error(
      "오류 스택:",
      error instanceof Error ? error.stack : "스택 정보 없음"
    )

    return NextResponse.json(
      { error: "이미지 분석 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
