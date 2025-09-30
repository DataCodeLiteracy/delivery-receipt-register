"use client"

import { useState } from "react"
import { Upload, FileText, BarChart3 } from "lucide-react"
import { useRouter } from "next/navigation"

import { ReceiptService } from "@/services/receiptService"

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const router = useRouter()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleProcessImage = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    try {
      // FormData를 사용하여 이미지 파일 전송
      const formData = new FormData()
      formData.append("image", selectedFile)

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("이미지 분석에 실패했습니다.")
      }

      const { receipt } = await response.json()
      const receiptId = await ReceiptService.createReceipt(receipt)

      // 성공 후 상세 페이지로 이동
      router.push(`/receipts/${receiptId}`)
    } catch (error) {
      console.error("Error processing image:", error)
      alert("이미지 분석 중 오류가 발생했습니다.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
      <div className='max-w-4xl mx-auto'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold text-gray-800 mb-2'>
            배달 영수증 기록장
          </h1>
          <p className='text-gray-600 text-lg'>
            영수증을 촬영하고 분석하여 지출을 체계적으로 관리하세요
          </p>
        </div>

        {/* Image Upload Section */}
        <div className='bg-white rounded-xl shadow-lg p-8 mb-8'>
          <h2 className='text-2xl font-semibold text-gray-800 mb-6 text-center'>
            영수증 이미지 등록
          </h2>

          {/* Upload Methods */}
          <div className='flex justify-center mb-6'>
            <label className='bg-blue-600 text-white rounded-lg px-8 py-3 text-center cursor-pointer hover:bg-blue-700 transition-colors'>
              <Upload className='w-5 h-5 inline mr-2' />
              이미지 파일 선택
              <input
                type='file'
                accept='image/*'
                onChange={handleFileSelect}
                className='hidden'
              />
            </label>
          </div>

          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              previewUrl
                ? "border-green-400 bg-green-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {previewUrl ? (
              <div className='space-y-4'>
                <img
                  src={previewUrl}
                  alt='Preview'
                  className='max-w-full h-64 object-contain mx-auto rounded-lg'
                />
                <div className='space-y-2'>
                  <p className='text-green-600 font-medium'>
                    이미지가 선택되었습니다
                  </p>
                  <button
                    onClick={handleProcessImage}
                    disabled={isProcessing}
                    className='bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {isProcessing ? "처리 중..." : "이미지 분석하기"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <Upload className='w-16 h-16 text-gray-400 mx-auto mb-4' />
                <p className='text-gray-600 mb-2'>
                  이미지를 여기에 드래그하거나 위의 버튼을 클릭하세요
                </p>
                <p className='text-sm text-gray-500'>
                  JPG, PNG, GIF 파일을 지원합니다
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {/* 배달 목록 */}
          <div
            onClick={() => router.push("/receipts")}
            className='bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow'
          >
            <div className='flex items-center space-x-4'>
              <div className='p-3 bg-blue-100 rounded-lg'>
                <FileText className='w-8 h-8 text-blue-600' />
              </div>
              <div>
                <h3 className='text-xl font-semibold text-gray-800 mb-2'>
                  배달 목록
                </h3>
                <p className='text-gray-600'>
                  등록된 모든 영수증을 확인하고 관리하세요
                </p>
              </div>
            </div>
          </div>

          {/* 분석 결과 */}
          <div
            onClick={() => router.push("/analysis")}
            className='bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow'
          >
            <div className='flex items-center space-x-4'>
              <div className='p-3 bg-green-100 rounded-lg'>
                <BarChart3 className='w-8 h-8 text-green-600' />
              </div>
              <div>
                <h3 className='text-xl font-semibold text-gray-800 mb-2'>
                  분석 결과
                </h3>
                <p className='text-gray-600'>지출 패턴과 통계를 분석해보세요</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
