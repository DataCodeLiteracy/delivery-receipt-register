export interface ReceiptItem {
  name: string
  productCode?: string
  category?: string
  quantity: number
  price: number
}

export interface Discount {
  name: string // 할인명 (LG U+할인, APP전용할인 등)
  amount: number // 할인 금액
}

export interface Receipt {
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
  totalAmount: number // 할인 전 합계
  discounts?: Discount[] // 할인 항목들
  totalDiscount?: number // 총 할인 금액
  finalAmount?: number // 최종 결제 금액 (할인 후)
  taxableSales: number // 과세 매출
  vat: number // 부가세
  customerRequest?: string
  riderRequest?: string
  cardNumber?: string
  gsAllPointsBasic?: number
  gsAllPointsAccumulated?: number
  orderReceiptTime: string
  imageUrl: string
  created_at?: Date
  updated_at?: Date
}

export interface ReceiptAnalysis {
  totalReceipts: number
  totalSpent: number
  averageSpent: number
  storeBreakdown: Array<{
    store: string
    count: number
    totalSpent: number
    averageSpent: number
  }>
  addressBreakdown: Array<{
    address: string
    count: number
    totalSpent: number
    averageSpent: number
  }>
  itemBreakdown: Array<{
    item: string
    count: number
    totalQuantity: number
    totalSpent: number
    averagePrice: number
  }>

  receipts: Receipt[]
}
