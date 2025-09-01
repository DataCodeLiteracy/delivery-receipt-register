"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search,
  Trash2,
  Edit,
  ArrowLeft,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { ReceiptService } from "@/services/receiptService"
import { Receipt } from "@/types/receipt"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { DeleteConfirmModal } from "@/components/Modal"
import ReceiptEditModal from "@/components/ReceiptEditModal"

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStore, setFilterStore] = useState("")
  const [filterOrderType, setFilterOrderType] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "amount" | "store">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(100)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadReceipts()
  }, [])

  useEffect(() => {
    filterAndSortReceipts()
    setCurrentPage(1) // 필터 변경 시 첫 페이지로 이동
  }, [receipts, searchTerm, filterStore, filterOrderType, sortBy, sortOrder])

  const loadReceipts = async () => {
    try {
      const receiptsData = await ReceiptService.getAllReceipts()
      setReceipts(receiptsData)
    } catch (error) {
      console.error("Error loading receipts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortReceipts = useCallback(() => {
    let filtered = [...receipts]

    // 검색어 필터링
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (receipt) =>
          receipt.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          receipt.orderNumber.includes(searchTerm) ||
          receipt.items.some((item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
    }

    // 상점명 필터링
    if (filterStore) {
      filtered = filtered.filter((receipt) => receipt.storeName === filterStore)
    }

    // 주문형태 필터링
    if (filterOrderType) {
      filtered = filtered.filter(
        (receipt) => receipt.orderType === filterOrderType
      )
    }

    // 정렬
    filtered.sort((a, b) => {
      let aValue: Date | number | string
      let bValue: Date | number | string

      switch (sortBy) {
        case "date":
          aValue = new Date(a.created_at || 0)
          bValue = new Date(b.created_at || 0)
          break
        case "amount":
          aValue = a.totalAmount
          bValue = b.totalAmount
          break
        case "store":
          aValue = a.storeName
          bValue = b.storeName
          break
        default:
          return 0
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredReceipts(filtered)
  }, [receipts, searchTerm, filterStore, filterOrderType, sortBy, sortOrder])

  const handleDelete = async (id: string) => {
    try {
      await ReceiptService.deleteReceipt(id)
      await loadReceipts()
    } catch (error) {
      console.error("Error deleting receipt:", error)
      alert("영수증 삭제에 실패했습니다.")
    }
  }

  const openDeleteModal = (receipt: Receipt) => {
    setSelectedReceipt(receipt)
    setDeleteModalOpen(true)
  }

  const openEditModal = (receipt: Receipt) => {
    setSelectedReceipt(receipt)
    setEditModalOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount)
  }

  const getUniqueStores = () => {
    return Array.from(new Set(receipts.map((r) => r.storeName)))
  }

  const getUniqueOrderTypes = () => {
    return Array.from(new Set(receipts.map((r) => r.orderType)))
  }

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentReceipts = filteredReceipts.slice(startIndex, endIndex)

  // 구글 스프레드시트용 데이터 생성
  const generateSpreadsheetData = () => {
    const headers = [
      "순번",
      "날짜",
      "시간",
      "고객주소",
      "주문형태",
      "총 금액",
      "상품",
      "상품 수",
      "등록일",
    ]

    const rows = currentReceipts.map((receipt, index) => {
      // 동일한 날짜 파싱 함수 사용
      const parseOrderTime = (timeStr: string) => {
        if (!timeStr) return new Date()

        // YYYY.MM.DD HH:mm:ss 형식 파싱
        const standardPattern =
          /^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
        const standardMatch = timeStr.match(standardPattern)

        if (standardMatch) {
          const [, year, month, day, hours, minutes, seconds] = standardMatch
          return new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hours),
            parseInt(minutes),
            parseInt(seconds)
          )
        }

        // 기존 형식들도 지원 (25/09/01 16:22:48)
        const legacyPattern =
          /^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
        const legacyMatch = timeStr.match(legacyPattern)

        if (legacyMatch) {
          const [, month, day, year, hours, minutes, seconds] = legacyMatch
          return new Date(
            2000 + parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hours),
            parseInt(minutes),
            parseInt(seconds)
          )
        }

        // ISO 형식도 지원
        const isoDate = new Date(timeStr)
        if (!isNaN(isoDate.getTime())) {
          return isoDate
        }

        // 모든 파싱 실패시 현재 시간 반환
        return new Date()
      }

      const orderDate = parseOrderTime(receipt.orderReceiptTime)
      const createdDate = new Date(receipt.created_at || 0)

      const itemsText = receipt.items
        .map((item) => `${item.name}(${item.quantity})`)
        .join(", ")

      return [
        startIndex + index + 1,
        format(orderDate, "yyyy-MM-dd", { locale: ko }),
        format(orderDate, "HH:mm", { locale: ko }),
        receipt.customerAddress || "-",
        receipt.orderType,
        receipt.totalAmount,
        itemsText,
        receipt.totalQuantity,
        format(createdDate, "yyyy-MM-dd HH:mm", { locale: ko }),
      ]
    })

    return [headers, ...rows]
  }

  // 클립보드에 복사
  const copyToClipboard = async () => {
    try {
      const data = generateSpreadsheetData()
      const csvText = data
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n")

      await navigator.clipboard.writeText(csvText)
      alert("구글 스프레드시트에 붙여넣을 수 있도록 클립보드에 복사되었습니다!")
    } catch (error) {
      console.error("클립보드 복사 실패:", error)
      alert("클립보드 복사에 실패했습니다.")
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Fixed Header */}
      <div className='fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40'>
        <div className='max-w-7xl mx-auto px-4 py-4'>
          <div className='relative flex items-center'>
            <button
              onClick={() => router.push("/")}
              className='absolute left-0 flex items-center text-gray-600 hover:text-gray-900 transition-colors'
            >
              <ArrowLeft className='w-5 h-5' />
            </button>
            <div className='flex-1 text-center'>
              <h1 className='text-2xl font-bold text-gray-900'>배달 목록</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 pt-24 pb-8'>
        {/* Description */}
        <div className='mb-6'>
          <p className='text-gray-500 text-sm'>
            등록된 모든 영수증을 확인하고 관리할 수 있습니다.
          </p>
        </div>

        {/* Total Receipts Info */}
        <div className='mb-6 text-center'>
          <div className='inline-block bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4'>
            <div className='text-sm text-gray-500 mb-1'>총 영수증</div>
            <div className='text-3xl font-bold text-blue-600'>
              {filteredReceipts.length}건
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            {/* 검색 */}
            <div className='sm:col-span-2 lg:col-span-2'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                검색
              </label>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                <input
                  type='text'
                  placeholder='상점명, 주문번호, 상품명으로 검색...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black placeholder-gray-500'
                />
              </div>
            </div>

            {/* 상점명 필터 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                상점명
              </label>
              <select
                value={filterStore}
                onChange={(e) => setFilterStore(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black'
              >
                <option value=''>모든 상점</option>
                {getUniqueStores().map((store) => (
                  <option key={store} value={store}>
                    {store}
                  </option>
                ))}
              </select>
            </div>

            {/* 주문형태 필터 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                주문형태
              </label>
              <select
                value={filterOrderType}
                onChange={(e) => setFilterOrderType(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black'
              >
                <option value=''>모든 형태</option>
                {getUniqueOrderTypes().map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* 정렬 옵션 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                정렬 기준
              </label>
              <div className='flex space-x-2'>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "date" | "amount" | "store")
                  }
                  className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black'
                >
                  <option value='date'>등록일</option>
                  <option value='amount'>금액</option>
                  <option value='store'>상점명</option>
                </select>
                <button
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className='flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || filterStore || filterOrderType) && (
            <div className='flex items-center space-x-2'>
              <span className='text-sm text-gray-500'>활성 필터:</span>
              {searchTerm && (
                <span className='px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full'>
                  검색: {searchTerm}
                </span>
              )}
              {filterStore && (
                <span className='px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full'>
                  상점: {filterStore}
                </span>
              )}
              {filterOrderType && (
                <span className='px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full'>
                  형태: {filterOrderType}
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm("")
                  setFilterStore("")
                  setFilterOrderType("")
                }}
                className='text-sm text-red-600 hover:text-red-800'
              >
                모든 필터 제거
              </button>
            </div>
          )}
        </div>

        {/* Receipts Table */}
        <div className='bg-white rounded-xl shadow-lg p-6'>
          <div className='mb-6 flex justify-center'>
            <button
              onClick={copyToClipboard}
              className='flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm'
            >
              <Copy className='w-4 h-4' />
              <span>구글 스프레드시트 복사</span>
            </button>
          </div>

          {filteredReceipts.length === 0 ? (
            <div className='text-center py-12'>
              <div className='text-gray-400 mb-4'>
                <svg
                  className='w-16 h-16 mx-auto'
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
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                {searchTerm || filterStore || filterOrderType
                  ? "필터 조건에 맞는 영수증이 없습니다"
                  : "등록된 영수증이 없습니다"}
              </h3>
              <p className='text-gray-500'>
                {searchTerm || filterStore || filterOrderType
                  ? "필터 조건을 변경해보세요"
                  : "첫 번째 영수증을 등록해보세요"}
              </p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className='overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'>
                {/* 모바일 스크롤 안내 */}
                <div className='md:hidden mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                  <p className='text-sm text-blue-800 text-center'>
                    📱 테이블을 좌우로 스크롤하여 모든 정보를 확인하세요
                  </p>
                </div>
                <table className='w-full min-w-[1200px] border-collapse border border-gray-300'>
                  <thead>
                    <tr className='bg-gray-50'>
                      <th className='border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[64px] w-16'>
                        순번
                      </th>
                      <th className='border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[140px] w-36'>
                        날짜
                      </th>
                      <th className='border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[100px] w-24'>
                        시간
                      </th>
                      <th className='border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[320px] w-80'>
                        고객주소
                      </th>
                      <th className='border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[160px] w-40'>
                        주문형태
                      </th>
                      <th className='border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[128px] w-32'>
                        총 금액
                      </th>
                      <th className='border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[384px] w-96'>
                        상품
                      </th>
                      <th className='border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[96px] w-24'>
                        상품 수
                      </th>
                      <th className='border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[160px] w-40'>
                        등록일
                      </th>
                      <th className='border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[96px] w-24'>
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReceipts.map((receipt, index) => {
                      // 안전한 날짜 파싱 - 표준 형식 (YYYY.MM.DD HH:mm:ss) 지원
                      const parseOrderTime = (timeStr: string) => {
                        if (!timeStr) return new Date()

                        // YYYY.MM.DD HH:mm:ss 형식 파싱
                        const standardPattern =
                          /^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
                        const standardMatch = timeStr.match(standardPattern)

                        if (standardMatch) {
                          const [, year, month, day, hours, minutes, seconds] =
                            standardMatch
                          return new Date(
                            parseInt(year),
                            parseInt(month) - 1,
                            parseInt(day),
                            parseInt(hours),
                            parseInt(minutes),
                            parseInt(seconds)
                          )
                        }

                        // 기존 형식들도 지원 (25/09/01 16:22:48)
                        const legacyPattern =
                          /^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
                        const legacyMatch = timeStr.match(legacyPattern)

                        if (legacyMatch) {
                          const [, month, day, year, hours, minutes, seconds] =
                            legacyMatch
                          return new Date(
                            2000 + parseInt(year),
                            parseInt(month) - 1,
                            parseInt(day),
                            parseInt(hours),
                            parseInt(minutes),
                            parseInt(seconds)
                          )
                        }

                        // ISO 형식도 지원
                        const isoDate = new Date(timeStr)
                        if (!isNaN(isoDate.getTime())) {
                          return isoDate
                        }

                        // 모든 파싱 실패시 현재 시간 반환
                        return new Date()
                      }

                      const orderDate = parseOrderTime(receipt.orderReceiptTime)
                      const createdDate = new Date(receipt.created_at || 0)
                      const itemsText = receipt.items
                        .map((item) => `${item.name}(${item.quantity})`)
                        .join(", ")

                      // 주소는 그대로 표시 (자연스러운 줄바꿈)
                      const customerAddress = receipt.customerAddress || "-"

                      return (
                        <tr key={receipt.id} className='hover:bg-gray-50'>
                          <td className='border border-gray-300 px-4 py-3 text-sm text-gray-900 text-center'>
                            {startIndex + index + 1}
                          </td>
                          <td className='border border-gray-300 px-4 py-3 text-sm text-gray-900'>
                            {isNaN(orderDate.getTime())
                              ? "-"
                              : format(orderDate, "yyyy-MM-dd", { locale: ko })}
                          </td>
                          <td className='border border-gray-300 px-4 py-3 text-sm text-gray-900'>
                            {isNaN(orderDate.getTime())
                              ? "-"
                              : format(orderDate, "HH:mm", { locale: ko })}
                          </td>
                          <td className='border border-gray-300 px-4 py-3 text-sm text-gray-900'>
                            <div className='max-w-[320px] break-words whitespace-pre-wrap'>
                              {customerAddress}
                            </div>
                          </td>
                          <td className='border border-gray-300 px-4 py-3 text-sm text-gray-900'>
                            <div className='max-w-[160px] whitespace-pre-wrap break-words'>
                              {receipt.orderType || "-"}
                            </div>
                          </td>
                          <td className='border border-gray-300 px-4 py-3 text-sm text-gray-900 font-medium'>
                            ₩{formatCurrency(receipt.totalAmount)}
                          </td>
                          <td className='border border-gray-300 px-4 py-3 text-sm text-gray-900'>
                            <div
                              className='max-w-[384px] whitespace-pre-wrap break-words'
                              title={itemsText}
                            >
                              {itemsText}
                            </div>
                          </td>
                          <td className='border border-gray-300 px-4 py-3 text-sm text-gray-900 text-center'>
                            {receipt.totalQuantity}개
                          </td>
                          <td className='border border-gray-300 px-4 py-3 text-sm text-gray-900'>
                            {format(createdDate, "yyyy-MM-dd HH:mm", {
                              locale: ko,
                            })}
                          </td>
                          <td className='border border-gray-300 px-4 py-3 text-sm text-gray-900'>
                            <div className='flex items-center space-x-2'>
                              <button
                                onClick={() => openEditModal(receipt)}
                                className='p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors'
                                title='수정'
                              >
                                <Edit className='w-4 h-4' />
                              </button>
                              <button
                                onClick={() => openDeleteModal(receipt)}
                                className='p-1 text-red-600 hover:bg-red-50 rounded transition-colors'
                                title='삭제'
                              >
                                <Trash2 className='w-4 h-4' />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className='mt-6'>
                {totalPages > 1 && (
                  <div className='flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0'>
                    <div className='text-sm text-gray-700 text-center sm:text-left'>
                      {startIndex + 1} -{" "}
                      {Math.min(endIndex, filteredReceipts.length)} /{" "}
                      {filteredReceipts.length}건
                    </div>
                    <div className='flex items-center space-x-2'>
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className='p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                      >
                        <ChevronLeft className='w-4 h-4' />
                      </button>

                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-2 border rounded-lg transition-colors ${
                                currentPage === pageNum
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        }
                      )}

                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className='p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                      >
                        <ChevronRight className='w-4 h-4' />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => selectedReceipt && handleDelete(selectedReceipt.id)}
        title='영수증 삭제'
        message={`"${selectedReceipt?.storeName}" 영수증을 정말로 삭제하시겠습니까?`}
        confirmText='삭제'
        cancelText='취소'
      />

      <ReceiptEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        receipt={selectedReceipt}
        onUpdate={loadReceipts}
      />
    </div>
  )
}
