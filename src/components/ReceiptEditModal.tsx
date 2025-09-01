import React, { useState, useEffect } from "react"
import { Receipt, ReceiptItem } from "@/types/receipt"
import Modal from "./Modal"
import { ReceiptService } from "@/services/receiptService"

interface ReceiptEditModalProps {
  isOpen: boolean
  onClose: () => void
  receipt: Receipt | null
  onUpdate: () => void
}

export default function ReceiptEditModal({
  isOpen,
  onClose,
  receipt,
  onUpdate,
}: ReceiptEditModalProps) {
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (receipt) {
      setEditingReceipt({ ...receipt })
    }
  }, [receipt])

  const handleSave = async () => {
    if (!editingReceipt) return

    setIsLoading(true)
    try {
      await ReceiptService.updateReceipt(editingReceipt.id, editingReceipt)
      onUpdate()
      onClose()
    } catch (error) {
      console.error("영수증 수정 실패:", error)
      alert("영수증 수정에 실패했습니다.")
    } finally {
      setIsLoading(false)
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

  if (!editingReceipt) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='영수증 수정' size='xl'>
      <div className='space-y-6'>
        {/* 기본 정보 */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              가게명
            </label>
            <input
              type='text'
              value={editingReceipt.storeName || ""}
              onChange={(e) => updateField("storeName", e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              주문번호
            </label>
            <input
              type='text'
              value={editingReceipt.orderNumber || ""}
              onChange={(e) => updateField("orderNumber", e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              주문형태
            </label>
            <input
              type='text'
              value={editingReceipt.orderType || ""}
              onChange={(e) => updateField("orderType", e.target.value)}
              className='w-full px-3 py-2 border border-gray-500 focus:border-transparent font-medium text-black'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              고객주소
            </label>
            <input
              type='text'
              value={editingReceipt.customerAddress || ""}
              onChange={(e) => updateField("customerAddress", e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              총 금액
            </label>
            <input
              type='number'
              value={editingReceipt.totalAmount || 0}
              onChange={(e) =>
                updateField("totalAmount", parseInt(e.target.value) || 0)
              }
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              주문접수시간
            </label>
            <input
              type='text'
              value={editingReceipt.orderReceiptTime || ""}
              onChange={(e) => updateField("orderReceiptTime", e.target.value)}
              placeholder='2025.09.01 16:22:48'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black placeholder-gray-500'
            />
          </div>
        </div>

        {/* 상품 목록 */}
        <div>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-lg font-medium text-gray-900'>상품 목록</h3>
            <button
              onClick={addItem}
              className='px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm'
            >
              + 상품 추가
            </button>
          </div>
          <div className='space-y-3'>
            {editingReceipt.items.map((item, index) => (
              <div
                key={index}
                className='flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 p-3 border border-gray-200 rounded-lg'
              >
                <div className='flex-1 w-full sm:w-auto'>
                  <input
                    type='text'
                    value={item.name}
                    onChange={(e) =>
                      updateItemField(index, "name", e.target.value)
                    }
                    placeholder='상품명'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black placeholder-gray-500'
                  />
                </div>
                <div className='w-full sm:w-24'>
                  <input
                    type='number'
                    value={item.quantity}
                    onChange={(e) =>
                      updateItemField(
                        index,
                        "quantity",
                        parseInt(e.target.value) || 1
                      )
                    }
                    min='1'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black'
                  />
                </div>
                <div className='w-full sm:w-32'>
                  <input
                    type='number'
                    value={item.price}
                    onChange={(e) =>
                      updateItemField(
                        index,
                        "price",
                        parseInt(e.target.value) || 0
                      )
                    }
                    min='0'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black'
                  />
                </div>
                <button
                  onClick={() => removeItem(index)}
                  className='w-full sm:w-auto px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors'
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 기타 정보 */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              고객요청사항
            </label>
            <textarea
              value={editingReceipt.customerRequest || ""}
              onChange={(e) => updateField("customerRequest", e.target.value)}
              rows={3}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              라이더요청사항
            </label>
            <textarea
              value={editingReceipt.riderRequest || ""}
              onChange={(e) => updateField("riderRequest", e.target.value)}
              rows={3}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-black'
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className='flex justify-end space-x-3 pt-4 border-t border-gray-200'>
          <button
            onClick={onClose}
            className='px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors'
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors'
          >
            {isLoading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </Modal>
  )
}
