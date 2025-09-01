"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar } from "lucide-react"
import { ReceiptService } from "@/services/receiptService"
import { ReceiptAnalysis } from "@/types/receipt"
import { format, subDays, startOfDay, endOfDay } from "date-fns"

export default function AnalysisPage() {
  const [analysis, setAnalysis] = useState<ReceiptAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dateRange, setDateRange] = useState<
    "today" | "week" | "month" | "custom"
  >("today")
  const router = useRouter()

  const loadAnalysis = useCallback(async () => {
    try {
      setIsLoading(true)
      const analysisData = await ReceiptService.getReceiptAnalysis()

      // 날짜 필터링 적용
      let filteredData = { ...analysisData }

      if (dateRange === "today") {
        const today = startOfDay(selectedDate)
        const tomorrow = endOfDay(selectedDate)
        filteredData = filterAnalysisByDateRange(analysisData, today, tomorrow)
      } else if (dateRange === "week") {
        const weekStart = startOfDay(subDays(selectedDate, 6))
        const weekEnd = endOfDay(selectedDate)
        filteredData = filterAnalysisByDateRange(
          analysisData,
          weekStart,
          weekEnd
        )
      } else if (dateRange === "month") {
        const monthStart = startOfDay(
          new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        )
        const monthEnd = endOfDay(
          new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
        )
        filteredData = filterAnalysisByDateRange(
          analysisData,
          monthStart,
          monthEnd
        )
      }

      setAnalysis(filteredData)
    } catch (error) {
      console.error("Error loading analysis:", error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate, dateRange])

  useEffect(() => {
    loadAnalysis()
  }, [loadAnalysis])

  const filterAnalysisByDateRange = (
    data: ReceiptAnalysis,
    startDate: Date,
    endDate: Date
  ) => {
    // 날짜 범위에 맞는 영수증만 필터링
    const filteredReceipts = data.receipts.filter((receipt) => {
      const receiptDate = new Date(
        receipt.created_at || receipt.orderReceiptTime || Date.now()
      )
      return receiptDate >= startDate && receiptDate <= endDate
    })

    // 필터링된 데이터로 새로운 분석 결과 생성
    const totalReceipts = filteredReceipts.length
    const totalSpent = filteredReceipts.reduce(
      (sum, receipt) => sum + receipt.totalAmount,
      0
    )
    const averageSpent = totalReceipts > 0 ? totalSpent / totalReceipts : 0

    // 상점별 분석
    const storeAnalysis = filteredReceipts.reduce((acc, receipt) => {
      const store = receipt.storeName
      if (!acc[store]) {
        acc[store] = { count: 0, totalSpent: 0 }
      }
      acc[store].count++
      acc[store].totalSpent += receipt.totalAmount
      return acc
    }, {} as Record<string, { count: number; totalSpent: number }>)

    const storeBreakdown = Object.entries(storeAnalysis)
      .map(([store, data]) => ({
        store,
        count: data.count,
        totalSpent: data.totalSpent,
        averageSpent: data.totalSpent / data.count,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)

    // 주소별 분석
    const addressAnalysis = filteredReceipts.reduce((acc, receipt) => {
      const address = receipt.customerAddress || "주소 없음"
      if (!acc[address]) {
        acc[address] = { count: 0, totalSpent: 0 }
      }
      acc[address].count++
      acc[address].totalSpent += receipt.totalAmount
      return acc
    }, {} as Record<string, { count: number; totalSpent: number }>)

    const addressBreakdown = Object.entries(addressAnalysis)
      .map(([address, data]) => ({
        address,
        count: data.count,
        totalSpent: data.totalSpent,
        averageSpent: data.totalSpent / data.count,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)

    // 상품별 분석 (가격은 총합, 수량은 개별)
    const itemAnalysis = filteredReceipts.reduce((acc, receipt) => {
      receipt.items.forEach((item) => {
        const itemName = item.name
        if (!acc[itemName]) {
          acc[itemName] = { count: 0, totalQuantity: 0, totalSpent: 0 }
        }
        acc[itemName].count++
        acc[itemName].totalQuantity += item.quantity
        acc[itemName].totalSpent += item.price * item.quantity // 총합 가격
      })
      return acc
    }, {} as Record<string, { count: number; totalQuantity: number; totalSpent: number }>)

    const itemBreakdown = Object.entries(itemAnalysis)
      .map(([item, data]) => ({
        item,
        count: data.count,
        totalQuantity: data.totalQuantity,
        totalSpent: data.totalSpent,
        averagePrice: data.totalSpent / data.totalQuantity, // 개별 상품 가격
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)

    return {
      totalReceipts,
      totalSpent,
      averageSpent,
      storeBreakdown,
      addressBreakdown,
      itemBreakdown,
      receipts: filteredReceipts,
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount)
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>분석 결과를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!analysis || analysis.totalReceipts === 0) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
        <div className='max-w-6xl mx-auto'>
          {/* Header */}
          <div className='flex items-center justify-between mb-8'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => router.push("/")}
                className='p-2 text-gray-600 hover:bg-white rounded-lg transition-colors'
              >
                <ArrowLeft className='w-6 h-6' />
              </button>
              <h1 className='text-4xl font-bold text-gray-800'>분석 결과</h1>
            </div>
          </div>

          <div className='bg-white rounded-xl shadow-lg p-12 text-center'>
            <div className='text-gray-400 mb-4'>
              <svg
                className='w-24 h-24 mx-auto'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                />
              </svg>
            </div>
            <h3 className='text-2xl font-medium text-gray-900 mb-4'>
              분석할 데이터가 없습니다
            </h3>
            <p className='text-gray-500 mb-6'>
              영수증을 등록하면 분석 결과를 확인할 수 있습니다
            </p>
            <button
              onClick={() => router.push("/")}
              className='bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors'
            >
              영수증 등록하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
      <div className='max-w-6xl mx-auto'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8'>
          <div className='flex items-center space-x-4'>
            <button
              onClick={() => router.push("/")}
              className='p-2 text-gray-600 hover:bg-white rounded-lg transition-colors'
            >
              <ArrowLeft className='w-6 h-6' />
            </button>
            <h1 className='text-4xl font-bold text-gray-800'>분석 결과</h1>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className='bg-white rounded-xl shadow-lg p-6 mb-8'>
          <h2 className='text-xl font-semibold text-gray-800 mb-4'>
            분석 기간 선택
          </h2>
          <div className='flex flex-wrap items-center gap-4'>
            <div className='flex items-center space-x-2'>
              <Calendar className='w-5 h-5 text-gray-500' />
              <input
                type='date'
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>
            <div className='flex space-x-2'>
              {[
                { key: "today", label: "오늘" },
                { key: "week", label: "최근 7일" },
                { key: "month", label: "이번 달" },
                { key: "custom", label: "사용자 지정" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() =>
                    setDateRange(key as "today" | "week" | "month" | "custom")
                  }
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    dateRange === key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
          <div className='bg-white rounded-xl shadow-lg p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-500'>총 배달 건수</p>
                <p className='text-3xl font-bold text-blue-600'>
                  {analysis.totalReceipts}건
                </p>
              </div>
              <div className='p-3 bg-blue-100 rounded-lg'>
                <svg
                  className='w-8 h-8 text-blue-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl shadow-lg p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-500'>총 배달 금액</p>
                <p className='text-3xl font-bold text-green-600'>
                  ₩{formatCurrency(analysis.totalSpent)}
                </p>
              </div>
              <div className='p-3 bg-green-100 rounded-lg'>
                <svg
                  className='w-8 h-8 text-green-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl shadow-lg p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-500'>평균 배달 금액</p>
                <p className='text-3xl font-bold text-purple-600'>
                  ₩{formatCurrency(analysis.averageSpent)}
                </p>
              </div>
              <div className='p-3 bg-purple-100 rounded-lg'>
                <svg
                  className='w-8 h-8 text-purple-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Address Details Table */}
        <div className='bg-white rounded-xl shadow-lg p-6 mb-8'>
          <h3 className='text-lg font-semibold text-gray-800 mb-4'>
            주소별 상세 분석
          </h3>
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse'>
              <thead>
                <tr className='border-b-2 border-gray-200'>
                  <th className='text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50'>
                    주소
                  </th>
                  <th className='text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50'>
                    배달 횟수
                  </th>
                  <th className='text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50'>
                    총 금액
                  </th>
                  <th className='text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50'>
                    평균 금액
                  </th>
                </tr>
              </thead>
              <tbody>
                {analysis.addressBreakdown
                  .filter((address) => address.count >= 2)
                  .sort((a, b) => b.count - a.count)
                  .map((address, index) => (
                    <tr
                      key={index}
                      className='border-b border-gray-100 hover:bg-gray-50 transition-colors'
                    >
                      <td className='py-3 px-4 font-medium text-gray-800'>
                        {address.address}
                      </td>
                      <td className='text-center py-3 px-4 text-gray-700'>
                        {address.count}회
                      </td>
                      <td className='text-center py-3 px-4 font-semibold text-green-600'>
                        ₩{formatCurrency(address.totalSpent)}
                      </td>
                      <td className='text-center py-3 px-4 font-medium text-blue-600'>
                        ₩{formatCurrency(address.averageSpent)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
