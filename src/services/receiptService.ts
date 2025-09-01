import { ApiClient } from "@/lib/apiClient"
import { Receipt, ReceiptAnalysis } from "@/types/receipt"

export class ReceiptService {
  static async createReceipt(
    receiptData: Omit<Receipt, "id">
  ): Promise<string> {
    try {
      const receiptId = await ApiClient.createDocumentWithAutoId(
        "receipts",
        receiptData
      )
      return receiptId
    } catch (error) {
      throw error
    }
  }

  static async getReceipt(receiptId: string): Promise<Receipt | null> {
    return await ApiClient.getDocument<Receipt>("receipts", receiptId)
  }

  static async updateReceipt(
    receiptId: string,
    receiptData: Partial<Receipt>
  ): Promise<void> {
    await ApiClient.updateDocument("receipts", receiptId, receiptData)
  }

  static async deleteReceipt(receiptId: string): Promise<void> {
    try {
      const receipt = await this.getReceipt(receiptId)
      if (!receipt) {
        throw new Error("Receipt not found")
      }

      await ApiClient.deleteDocument("receipts", receiptId)
    } catch (error) {
      throw error
    }
  }

  static async getAllReceipts(): Promise<Receipt[]> {
    return await ApiClient.queryDocuments<Receipt>(
      "receipts",
      [],
      "created_at",
      "desc"
    )
  }

  static async getReceiptsByStore(storeName: string): Promise<Receipt[]> {
    return await ApiClient.queryDocuments<Receipt>(
      "receipts",
      [["storeName", "==", storeName]],
      "created_at",
      "desc"
    )
  }

  static async getReceiptsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Receipt[]> {
    return await ApiClient.queryDocuments<Receipt>(
      "receipts",
      [
        ["created_at", ">=", startDate],
        ["created_at", "<=", endDate],
      ],
      "created_at",
      "desc"
    )
  }

  static async getReceiptAnalysis(): Promise<ReceiptAnalysis> {
    try {
      const receipts = await this.getAllReceipts()

      if (receipts.length === 0) {
        return {
          totalReceipts: 0,
          totalSpent: 0,
          averageSpent: 0,
          storeBreakdown: [],
          addressBreakdown: [],
          itemBreakdown: [],

          receipts: [],
        }
      }

      const totalSpent = receipts.reduce(
        (sum, receipt) => sum + receipt.totalAmount,
        0
      )
      const averageSpent = totalSpent / receipts.length

      // 상점별 분석
      const storeAnalysis = new Map<
        string,
        { count: number; totalSpent: number }
      >()
      receipts.forEach((receipt) => {
        const store = receipt.storeName
        const existing = storeAnalysis.get(store) || {
          count: 0,
          totalSpent: 0,
        }
        storeAnalysis.set(store, {
          count: existing.count + 1,
          totalSpent: existing.totalSpent + receipt.totalAmount,
        })
      })

      const storeBreakdown = Array.from(storeAnalysis.entries())
        .map(([store, data]) => ({
          store,
          count: data.count,
          totalSpent: data.totalSpent,
          averageSpent: data.totalSpent / data.count,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)

      // 주소별 분석
      const addressAnalysis = new Map<
        string,
        { count: number; totalSpent: number }
      >()
      receipts.forEach((receipt) => {
        const address = receipt.customerAddress || "주소 없음"
        const existing = addressAnalysis.get(address) || {
          count: 0,
          totalSpent: 0,
        }
        addressAnalysis.set(address, {
          count: existing.count + 1,
          totalSpent: existing.totalSpent + receipt.totalAmount,
        })
      })

      const addressBreakdown = Array.from(addressAnalysis.entries())
        .map(([address, data]) => ({
          address,
          count: data.count,
          totalSpent: data.totalSpent,
          averageSpent: data.totalSpent / data.count,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)

      // 상품별 분석 (가격은 총합, 수량은 개별)
      const itemAnalysis = new Map<
        string,
        { count: number; totalQuantity: number; totalSpent: number }
      >()
      receipts.forEach((receipt) => {
        receipt.items.forEach((item) => {
          const itemName = item.name
          const existing = itemAnalysis.get(itemName) || {
            count: 0,
            totalQuantity: 0,
            totalSpent: 0,
          }
          itemAnalysis.set(itemName, {
            count: existing.count + 1,
            totalQuantity: existing.totalQuantity + item.quantity,
            totalSpent: existing.totalSpent + item.price * item.quantity,
          })
        })
      })

      const itemBreakdown = Array.from(itemAnalysis.entries())
        .map(([item, data]) => ({
          item,
          count: data.count,
          totalQuantity: data.totalQuantity,
          totalSpent: data.totalSpent,
          averagePrice: data.totalSpent / data.totalQuantity,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)

      return {
        totalReceipts: receipts.length,
        totalSpent,
        averageSpent: Math.round(averageSpent),
        storeBreakdown,
        addressBreakdown,
        itemBreakdown,

        receipts,
      }
    } catch (error) {
      console.error("Error getting receipt analysis:", error)
      throw error
    }
  }

  static async searchReceipts(searchTerm: string): Promise<Receipt[]> {
    try {
      const allReceipts = await this.getAllReceipts()

      if (!searchTerm.trim()) {
        return allReceipts
      }

      const lowerSearchTerm = searchTerm.toLowerCase()

      return allReceipts.filter(
        (receipt) =>
          receipt.storeName.toLowerCase().includes(lowerSearchTerm) ||
          receipt.orderNumber.includes(searchTerm) ||
          receipt.items.some((item) =>
            item.name.toLowerCase().includes(lowerSearchTerm)
          )
      )
    } catch (error) {
      console.error("Error searching receipts:", error)
      throw error
    }
  }
}
