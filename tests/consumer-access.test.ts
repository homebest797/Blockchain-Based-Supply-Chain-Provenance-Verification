import { describe, it, expect, beforeEach } from "vitest"

describe("Custody Tracking Contract", () => {
  let contractState
  
  beforeEach(() => {
    contractState = {
      productCustody: new Map(),
      custodyHistory: new Map(),
      transferCounters: new Map(),
    }
  })
  
  describe("Product Creation", () => {
    it("should successfully create a new product", () => {
      const productId = "PROD-001"
      const creator = "manufacturer"
      
      const result = createProduct(contractState, creator, productId)
      
      expect(result.success).toBe(true)
      
      const custody = contractState.productCustody.get(productId)
      expect(custody.currentOwner).toBe(creator)
      expect(custody.createdBy).toBe(creator)
      expect(contractState.transferCounters.get(productId)).toBe(0)
    })
    
    it("should reject duplicate product creation", () => {
      const productId = "PROD-001"
      
      createProduct(contractState, "manufacturer", productId)
      const result = createProduct(contractState, "manufacturer", productId)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_INVALID_TRANSFER")
    })
  })
  
  describe("Custody Transfer", () => {
    beforeEach(() => {
      createProduct(contractState, "manufacturer", "PROD-001")
    })
    
    it("should successfully transfer custody", () => {
      const productId = "PROD-001"
      const newOwner = "distributor"
      const location = "Warehouse A"
      const notes = "Quality check passed"
      
      const result = transferCustody(contractState, "manufacturer", productId, newOwner, location, notes)
      
      expect(result.success).toBe(true)
      
      const custody = contractState.productCustody.get(productId)
      expect(custody.currentOwner).toBe(newOwner)
      
      const historyKey = `${productId}-0`
      const transfer = contractState.custodyHistory.get(historyKey)
      expect(transfer.fromOwner).toBe("manufacturer")
      expect(transfer.toOwner).toBe(newOwner)
      expect(transfer.location).toBe(location)
      expect(transfer.notes).toBe(notes)
      
      expect(contractState.transferCounters.get(productId)).toBe(1)
    })
    
    it("should reject unauthorized transfer", () => {
      const result = transferCustody(contractState, "unauthorized-user", "PROD-001", "distributor", "Location", "Notes")
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
    
    it("should reject transfer of non-existent product", () => {
      const result = transferCustody(contractState, "manufacturer", "NON-EXISTENT", "distributor", "Location", "Notes")
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_PRODUCT_NOT_FOUND")
    })
    
    it("should handle multiple transfers correctly", () => {
      const productId = "PROD-001"
      
      // First transfer: manufacturer -> distributor
      transferCustody(contractState, "manufacturer", productId, "distributor", "Warehouse A", "First transfer")
      
      // Second transfer: distributor -> retailer
      transferCustody(contractState, "distributor", productId, "retailer", "Store B", "Second transfer")
      
      expect(contractState.transferCounters.get(productId)).toBe(2)
      
      const custody = contractState.productCustody.get(productId)
      expect(custody.currentOwner).toBe("retailer")
      
      // Check first transfer history
      const firstTransfer = contractState.custodyHistory.get(`${productId}-0`)
      expect(firstTransfer.fromOwner).toBe("manufacturer")
      expect(firstTransfer.toOwner).toBe("distributor")
      
      // Check second transfer history
      const secondTransfer = contractState.custodyHistory.get(`${productId}-1`)
      expect(secondTransfer.fromOwner).toBe("distributor")
      expect(secondTransfer.toOwner).toBe("retailer")
    })
  })
  
  describe("Read Functions", () => {
    beforeEach(() => {
      createProduct(contractState, "manufacturer", "PROD-001")
      transferCustody(contractState, "manufacturer", "PROD-001", "distributor", "Warehouse A", "Transfer notes")
    })
    
    it("should return current owner", () => {
      const owner = getCurrentOwner(contractState, "PROD-001")
      expect(owner).toBe("distributor")
    })
    
    it("should return undefined for non-existent product owner", () => {
      const owner = getCurrentOwner(contractState, "NON-EXISTENT")
      expect(owner).toBeUndefined()
    })
    
    it("should return transfer history", () => {
      const transfer = getTransferHistory(contractState, "PROD-001", 0)
      
      expect(transfer).toBeDefined()
      expect(transfer.fromOwner).toBe("manufacturer")
      expect(transfer.toOwner).toBe("distributor")
      expect(transfer.location).toBe("Warehouse A")
      expect(transfer.notes).toBe("Transfer notes")
    })
    
    it("should return correct transfer count", () => {
      const count = getTransferCount(contractState, "PROD-001")
      expect(count).toBe(1)
    })
  })
})

// Mock contract functions
function createProduct(state, sender, productId) {
  if (state.productCustody.has(productId)) {
    return { success: false, error: "ERR_INVALID_TRANSFER" }
  }
  
  state.productCustody.set(productId, {
    currentOwner: sender,
    createdBy: sender,
    creationDate: Date.now(),
  })
  
  state.transferCounters.set(productId, 0)
  return { success: true }
}

function transferCustody(state, sender, productId, toOwner, location, notes) {
  const custody = state.productCustody.get(productId)
  if (!custody) {
    return { success: false, error: "ERR_PRODUCT_NOT_FOUND" }
  }
  
  if (custody.currentOwner !== sender) {
    return { success: false, error: "ERR_UNAUTHORIZED" }
  }
  
  const currentCount = state.transferCounters.get(productId) || 0
  
  // Record transfer in history
  state.custodyHistory.set(`${productId}-${currentCount}`, {
    fromOwner: sender,
    toOwner: toOwner,
    transferDate: Date.now(),
    location: location,
    notes: notes,
  })
  
  // Update current custody
  custody.currentOwner = toOwner
  
  // Increment transfer counter
  state.transferCounters.set(productId, currentCount + 1)
  
  return { success: true }
}

function getCurrentOwner(state, productId) {
  const custody = state.productCustody.get(productId)
  return custody ? custody.currentOwner : undefined
}

function getTransferHistory(state, productId, transferId) {
  return state.custodyHistory.get(`${productId}-${transferId}`)
}

function getTransferCount(state, productId) {
  return state.transferCounters.get(productId) || 0
}
