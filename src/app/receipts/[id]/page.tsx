"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Edit, Trash2, Save, X } from "lucide-react"
import { ReceiptService } from "@/services/receiptService"
import { Receipt, ReceiptItem } from "@/types/receipt"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

export default function ReceiptDetailPage() {
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const params = useParams()
  const receiptId = params.id as string

  useEffect(() => {
    loadReceipt()
  }, [receiptId])

  const loadReceipt = useCallback(async () => {
    try {
      const foundReceipt = await ReceiptService.getReceipt(receiptId)
      if (foundReceipt) {
        setReceipt(foundReceipt)
        setEditingReceipt({ ...foundReceipt })
      } else {
        alert("영수증을 찾을 수 없습니다.")
        router.push("/receipts")
      }
    } catch (error) {
      console.error("Error loading receipt:", error)
      alert("영수증을 불러오는 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [receiptId, router])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount)
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditingReceipt({ ...receipt! })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditingReceipt({ ...receipt! })
  }

  const handleSave = async () => {
    if (!editingReceipt) return

    setIsSaving(true)
    try {
      await ReceiptService.updateReceipt(receiptId, editingReceipt)
      setReceipt(editingReceipt)
      setIsEditing(false)
      alert("영수증이 성공적으로 수정되었습니다.")
    } catch (error) {
      console.error("Error updating receipt:", error)
      alert("수정 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (confirm("정말로 이 영수증을 삭제하시겠습니까?")) {
      try {
        await ReceiptService.deleteReceipt(receiptId)
        router.push("/receipts")
      } catch (error) {
        console.error("Error deleting receipt:", error)
        alert("삭제 중 오류가 발생했습니다.")
      }
    }
  }

  const updateField = (field: keyof Receipt, value: string | number) => {
    if (!editingReceipt) return
    setEditingReceipt({ ...editingReceipt, [field]: value })
  }

  const updateItemField = (
    index: number,
    field: keyof ReceiptItem,
    value: string | number
  ) => {
    if (!editingReceipt) return
    const newItems = [...editingReceipt.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setEditingReceipt({ ...editingReceipt, items: newItems })
  }

  const addItem = () => {
    if (!editingReceipt) return
    const newItem: ReceiptItem = {
      name: "",
      quantity: 1,
      price: 0,
      productCode: "",
      category: "",
    }
    setEditingReceipt({
      ...editingReceipt,
      items: [...editingReceipt.items, newItem],
    })
  }

  const removeItem = (index: number) => {
    if (!editingReceipt) return
    const newItems = editingReceipt.items.filter((_, i) => i !== index)
    setEditingReceipt({ ...editingReceipt, items: newItems })
  }

  const currentReceipt = isEditing ? editingReceipt : receipt

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!currentReceipt) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-gray-600'>영수증을 찾을 수 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-4xl mx-auto px-4 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => router.back()}
                className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
              >
                <ArrowLeft className='w-5 h-5 text-gray-600' />
              </button>
              <h1 className='text-2xl font-semibold text-gray-800'>
                영수증 상세 {isEditing && "(수정 중)"}
              </h1>
            </div>
            <div className='flex items-center space-x-2'>
              {!isEditing ? (
                <>
                  <button
                    onClick={handleEdit}
                    className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                    title='수정'
                  >
                    <Edit className='w-4 h-4' />
                  </button>
                  <button
                    onClick={handleDelete}
                    className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                    title='삭제'
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className='p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50'
                    title='저장'
                  >
                    <Save className='w-4 h-4' />
                  </button>
                  <button
                    onClick={handleCancel}
                    className='p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors'
                    title='취소'
                  >
                    <X className='w-4 h-4' />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-4 py-6'>
        {/* Receipt Image */}
        <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
          <h2 className='text-lg font-semibold text-gray-800 mb-4'>
            영수증 이미지
          </h2>
          <div className='text-center'>
            <img
              src={`data:image/jpeg;base64,${currentReceipt.imageUrl}`}
              alt='Receipt'
              className='max-w-full h-96 object-contain mx-auto rounded-lg border'
            />
          </div>
        </div>

        {/* Basic Information */}
        <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
          <h2 className='text-lg font-semibold text-gray-800 mb-4'>
            기본 정보
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <p className='text-sm text-gray-500'>상점명</p>
              {isEditing ? (
                <input
                  type='text'
                  value={editingReceipt?.storeName || ""}
                  onChange={(e) => updateField("storeName", e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              ) : (
                <p className='font-semibold text-lg text-gray-900'>
                  {currentReceipt.storeName}
                </p>
              )}
            </div>
            <div>
              <p className='text-sm text-gray-500'>거래처 ID</p>
              {isEditing ? (
                <input
                  type='text'
                  value={editingReceipt?.transactionId || ""}
                  onChange={(e) => updateField("transactionId", e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  {currentReceipt.transactionId}
                </p>
              )}
            </div>
            <div>
              <p className='text-sm text-gray-500'>주문번호</p>
              {isEditing ? (
                <input
                  type='text'
                  value={editingReceipt?.orderNumber || ""}
                  onChange={(e) => updateField("orderNumber", e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  {currentReceipt.orderNumber}
                </p>
              )}
            </div>
            <div>
              <p className='text-sm text-gray-500'>주문형태</p>
              {isEditing ? (
                <input
                  type='text'
                  value={editingReceipt?.orderType || ""}
                  onChange={(e) => updateField("orderType", e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  {currentReceipt.orderType}
                </p>
              )}
            </div>
            <div>
              <p className='text-sm text-gray-500'>주문 접수 시간</p>
              {isEditing ? (
                <input
                  type='text'
                  value={editingReceipt?.orderReceiptTime || ""}
                  onChange={(e) =>
                    updateField("orderReceiptTime", e.target.value)
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  {currentReceipt.orderReceiptTime}
                </p>
              )}
            </div>
            <div>
              <p className='text-sm text-gray-500'>등록일</p>
              <p className='font-semibold text-gray-900'>
                {format(
                  new Date(currentReceipt.created_at || ""),
                  "yyyy년 MM월 dd일 HH:mm",
                  { locale: ko }
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
          <h2 className='text-lg font-semibold text-gray-800 mb-4'>
            연락처 정보
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <p className='text-sm text-gray-500'>고객센터 전화번호</p>
              {isEditing ? (
                <input
                  type='text'
                  value={editingReceipt?.customerServicePhone || ""}
                  onChange={(e) =>
                    updateField("customerServicePhone", e.target.value)
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  {currentReceipt.customerServicePhone}
                </p>
              )}
            </div>
            <div>
              <p className='text-sm text-gray-500'>라이더 고객센터</p>
              {isEditing ? (
                <input
                  type='text'
                  value={editingReceipt?.riderCustomerService || ""}
                  onChange={(e) =>
                    updateField("riderCustomerService", e.target.value)
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  {currentReceipt.riderCustomerService}
                </p>
              )}
            </div>
            <div>
              <p className='text-sm text-gray-500'>고객 안심번호</p>
              {isEditing ? (
                <input
                  type='text'
                  value={editingReceipt?.customerSafetyNumber || ""}
                  onChange={(e) =>
                    updateField("customerSafetyNumber", e.target.value)
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  {currentReceipt.customerSafetyNumber}
                </p>
              )}
            </div>
            <div>
              <p className='text-sm text-gray-500'>고객 주소</p>
              {isEditing ? (
                <input
                  type='text'
                  value={editingReceipt?.customerAddress || ""}
                  onChange={(e) =>
                    updateField("customerAddress", e.target.value)
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  {currentReceipt.customerAddress}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-gray-800'>주문 상품</h2>
            {isEditing && (
              <button
                onClick={addItem}
                className='px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors'
              >
                상품 추가
              </button>
            )}
          </div>
          <div className='space-y-3'>
            {currentReceipt.items.map((item, index) => (
              <div
                key={index}
                className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
              >
                <div className='flex-1 grid grid-cols-1 md:grid-cols-4 gap-3'>
                  <div>
                    <p className='text-sm text-gray-500'>상품명</p>
                    {isEditing ? (
                      <input
                        type='text'
                        value={editingReceipt?.items[index]?.name || ""}
                        onChange={(e) =>
                          updateItemField(index, "name", e.target.value)
                        }
                        className='w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent'
                      />
                    ) : (
                      <p className='font-semibold text-gray-900'>{item.name}</p>
                    )}
                  </div>
                  <div>
                    <p className='text-sm text-gray-500'>수량</p>
                    {isEditing ? (
                      <input
                        type='number'
                        value={editingReceipt?.items[index]?.quantity || 1}
                        onChange={(e) =>
                          updateItemField(
                            index,
                            "quantity",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className='w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent'
                        min='1'
                      />
                    ) : (
                      <p className='font-semibold text-gray-900'>
                        {item.quantity}개
                      </p>
                    )}
                  </div>
                  <div>
                    <p className='text-sm text-gray-500'>가격</p>
                    {isEditing ? (
                      <input
                        type='number'
                        value={editingReceipt?.items[index]?.price || 0}
                        onChange={(e) =>
                          updateItemField(
                            index,
                            "price",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className='w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent'
                        min='0'
                      />
                    ) : (
                      <p className='font-semibold text-blue-600'>
                        ₩{formatCurrency(item.price)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className='text-sm text-gray-500'>상품코드</p>
                    {isEditing ? (
                      <input
                        type='text'
                        value={editingReceipt?.items[index]?.productCode || ""}
                        onChange={(e) =>
                          updateItemField(index, "productCode", e.target.value)
                        }
                        className='w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent'
                      />
                    ) : (
                      <p className='font-semibold text-gray-900'>
                        {item.productCode || "-"}
                      </p>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <button
                    onClick={() => removeItem(index)}
                    className='ml-2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors'
                    title='삭제'
                  >
                    <X className='w-4 h-4' />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
          <h2 className='text-lg font-semibold text-gray-800 mb-4'>
            결제 요약
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <p className='text-sm text-gray-500'>합계 수량</p>
              <p className='font-semibold text-lg text-gray-900'>
                {currentReceipt.totalQuantity}개
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-500'>합계 금액 (할인 전)</p>
              {isEditing ? (
                <input
                  type='number'
                  value={editingReceipt?.totalAmount || 0}
                  onChange={(e) =>
                    updateField("totalAmount", parseInt(e.target.value) || 0)
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  min='0'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  ₩{formatCurrency(currentReceipt.totalAmount)}
                </p>
              )}
            </div>
            {currentReceipt.discounts &&
              currentReceipt.discounts.length > 0 && (
                <div className='col-span-2'>
                  <p className='text-sm text-gray-500 mb-2'>할인 내역</p>
                  <div className='space-y-2 bg-red-50 p-3 rounded-lg border border-red-200'>
                    {currentReceipt.discounts.map((discount, idx) => (
                      <div
                        key={idx}
                        className='flex justify-between items-center'
                      >
                        <span className='text-sm text-red-700'>
                          {discount.name}
                        </span>
                        <span className='text-sm font-semibold text-red-700'>
                          -₩{formatCurrency(discount.amount)}
                        </span>
                      </div>
                    ))}
                    <div className='border-t border-red-300 pt-2 mt-2 flex justify-between items-center'>
                      <span className='text-sm font-semibold text-red-800'>
                        총 할인
                      </span>
                      <span className='text-sm font-bold text-red-800'>
                        -₩{formatCurrency(currentReceipt.totalDiscount || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            <div>
              <p className='text-sm text-gray-500'>최종 결제 금액</p>
              <p className='font-semibold text-2xl text-blue-600'>
                ₩
                {formatCurrency(
                  currentReceipt.finalAmount || currentReceipt.totalAmount
                )}
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-500'>과세 매출</p>
              {isEditing ? (
                <input
                  type='number'
                  value={editingReceipt?.taxableSales || 0}
                  onChange={(e) =>
                    updateField("taxableSales", parseInt(e.target.value) || 0)
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  min='0'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  ₩{formatCurrency(currentReceipt.taxableSales)}
                </p>
              )}
            </div>
            <div>
              <p className='text-sm text-gray-500'>부가세</p>
              {isEditing ? (
                <input
                  type='number'
                  value={editingReceipt?.vat || 0}
                  onChange={(e) =>
                    updateField("vat", parseInt(e.target.value) || 0)
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  min='0'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  ₩{formatCurrency(currentReceipt.vat)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
          <h2 className='text-lg font-semibold text-gray-800 mb-4'>
            추가 정보
          </h2>
          <div className='space-y-4'>
            <div>
              <p className='text-sm text-gray-500'>고객 요청사항</p>
              {isEditing ? (
                <input
                  type='text'
                  value={editingReceipt?.customerRequest || ""}
                  onChange={(e) =>
                    updateField("customerRequest", e.target.value)
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  {currentReceipt.customerRequest || "-"}
                </p>
              )}
            </div>
            <div>
              <p className='text-sm text-gray-500'>라이더 요청사항</p>
              {isEditing ? (
                <input
                  type='text'
                  value={editingReceipt?.riderRequest || ""}
                  onChange={(e) => updateField("riderRequest", e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  {currentReceipt.riderRequest || "-"}
                </p>
              )}
            </div>
            <div>
              <p className='text-sm text-gray-500'>카드 번호</p>
              {isEditing ? (
                <input
                  type='text'
                  value={editingReceipt?.cardNumber || ""}
                  onChange={(e) => updateField("cardNumber", e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  {currentReceipt.cardNumber || "-"}
                </p>
              )}
            </div>
            <div>
              <p className='text-sm text-gray-500'>GS 올포인트 기본적립</p>
              {isEditing ? (
                <input
                  type='number'
                  value={editingReceipt?.gsAllPointsBasic || 0}
                  onChange={(e) =>
                    updateField(
                      "gsAllPointsBasic",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  min='0'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  {currentReceipt.gsAllPointsBasic || 0}점
                </p>
              )}
            </div>
            <div>
              <p className='text-sm text-gray-500'>GS 올포인트 누적</p>
              {isEditing ? (
                <input
                  type='number'
                  value={editingReceipt?.gsAllPointsAccumulated || 0}
                  onChange={(e) =>
                    updateField(
                      "gsAllPointsAccumulated",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  min='0'
                />
              ) : (
                <p className='font-semibold text-gray-900'>
                  {currentReceipt.gsAllPointsAccumulated || 0}점
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
