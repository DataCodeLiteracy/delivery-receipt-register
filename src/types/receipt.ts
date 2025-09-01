export interface ReceiptItem {
  name: string
  productCode?: string
  category?: string
  quantity: number
  price: number
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
  totalAmount: number
  taxableSales: number
  vat: number
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
