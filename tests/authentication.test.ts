import { describe, it, expect, beforeEach } from "vitest"

describe("Authentication Contract", () => {
  let contractState
  
  beforeEach(() => {
    contractState = {
      productAuthenticity: new Map(),
      authorizedManufacturers: new Map([["contract-owner", true]]),
      contractOwner: "contract-owner",
    }
  })
  
  describe("Manufacturer Authorization", () => {
    it("should allow contract owner to add authorized manufacturers", () => {
      const newManufacturer = "manufacturer-1"
      const result = addAuthorizedManufacturer(contractState, "contract-owner", newManufacturer)
      
      expect(result.success).toBe(true)
      expect(contractState.authorizedManufacturers.get(newManufacturer)).toBe(true)
    })
    
    it("should reject unauthorized attempts to add manufacturers", () => {
      const result = addAuthorizedManufacturer(contractState, "unauthorized-user", "manufacturer-1")
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
  })
  
  describe("Product Authentication", () => {
    beforeEach(() => {
      contractState.authorizedManufacturers.set("manufacturer-1", true)
    })
    
    it("should successfully authenticate product", () => {
      const productId = "PROD-001"
      const productHash = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
      const serialNumber = "SN-ABC-123"
      
      const result = authenticateProduct(contractState, "manufacturer-1", productId, productHash, serialNumber)
      
      expect(result.success).toBe(true)
      
      const authInfo = contractState.productAuthenticity.get(productId)
      expect(authInfo.manufacturer).toBe("manufacturer-1")
      expect(authInfo.productHash).toEqual(productHash)
      expect(authInfo.serialNumber).toBe(serialNumber)
      expect(authInfo.isAuthentic).toBe(true)
    })
    
    it("should reject authentication from unauthorized manufacturer", () => {
      const result = authenticateProduct(
          contractState,
          "unauthorized-user",
          "PROD-001",
          new Uint8Array([1, 2, 3]),
          "SN-123",
      )
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
    
    it("should allow manufacturer to revoke authentication", () => {
      const productId = "PROD-001"
      const productHash = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
      
      // First authenticate
      authenticateProduct(contractState, "manufacturer-1", productId, productHash, "SN-123")
      
      // Then revoke
      const result = revokeAuthentication(contractState, "manufacturer-1", productId)
      
      expect(result.success).toBe(true)
      
      const authInfo = contractState.productAuthenticity.get(productId)
      expect(authInfo.isAuthentic).toBe(false)
    })
    
    it("should reject revocation by non-manufacturer", () => {
      const productId = "PROD-001"
      
      authenticateProduct(contractState, "manufacturer-1", productId, new Uint8Array([1, 2, 3]), "SN-123")
      
      const result = revokeAuthentication(contractState, "other-manufacturer", productId)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
  })
  
  describe("Verification Functions", () => {
    beforeEach(() => {
      contractState.authorizedManufacturers.set("manufacturer-1", true)
      const productHash = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
      authenticateProduct(contractState, "manufacturer-1", "PROD-001", productHash, "SN-123")
    })
    
    it("should correctly verify authentic products", () => {
      expect(isAuthentic(contractState, "PROD-001")).toBe(true)
      expect(isAuthentic(contractState, "NON-EXISTENT")).toBe(false)
    })
    
    it("should return authentication information", () => {
      const authInfo = getAuthenticationInfo(contractState, "PROD-001")
      
      expect(authInfo).toBeDefined()
      expect(authInfo.manufacturer).toBe("manufacturer-1")
      expect(authInfo.serialNumber).toBe("SN-123")
      expect(authInfo.isAuthentic).toBe(true)
    })
    
    it("should verify product hash correctly", () => {
      const correctHash = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
      const incorrectHash = new Uint8Array([8, 7, 6, 5, 4, 3, 2, 1])
      
      expect(verifyProductHash(contractState, "PROD-001", correctHash)).toBe(true)
      expect(verifyProductHash(contractState, "PROD-001", incorrectHash)).toBe(false)
      expect(verifyProductHash(contractState, "NON-EXISTENT", correctHash)).toBe(false)
    })
    
    it("should handle revoked authentication correctly", () => {
      revokeAuthentication(contractState, "manufacturer-1", "PROD-001")
      
      expect(isAuthentic(contractState, "PROD-001")).toBe(false)
      
      const authInfo = getAuthenticationInfo(contractState, "PROD-001")
      expect(authInfo.isAuthentic).toBe(false)
    })
  })
})

// Mock contract functions
function addAuthorizedManufacturer(state, sender, manufacturer) {
  if (sender !== state.contractOwner) {
    return { success: false, error: "ERR_UNAUTHORIZED" }
  }
  
  state.authorizedManufacturers.set(manufacturer, true)
  return { success: true }
}

function authenticateProduct(state, sender, productId, productHash, serialNumber) {
  if (!state.authorizedManufacturers.get(sender)) {
    return { success: false, error: "ERR_UNAUTHORIZED" }
  }
  
  state.productAuthenticity.set(productId, {
    manufacturer: sender,
    productHash: productHash,
    authenticationDate: Date.now(),
    isAuthentic: true,
    serialNumber: serialNumber,
  })
  
  return { success: true }
}

function revokeAuthentication(state, sender, productId) {
  const authInfo = state.productAuthenticity.get(productId)
  if (!authInfo) {
    return { success: false, error: "ERR_PRODUCT_NOT_FOUND" }
  }
  
  if (authInfo.manufacturer !== sender) {
    return { success: false, error: "ERR_UNAUTHORIZED" }
  }
  
  authInfo.isAuthentic = false
  return { success: true }
}

function isAuthentic(state, productId) {
  const authInfo = state.productAuthenticity.get(productId)
  return authInfo ? authInfo.isAuthentic : false
}

function getAuthenticationInfo(state, productId) {
  return state.productAuthenticity.get(productId)
}

function verifyProductHash(state, productId, providedHash) {
  const authInfo = state.productAuthenticity.get(productId)
  if (!authInfo) return false
  
  // Compare arrays
  if (authInfo.productHash.length !== providedHash.length) return false
  
  for (let i = 0; i < authInfo.productHash.length; i++) {
    if (authInfo.productHash[i] !== providedHash[i]) return false
  }
  
  return true
}
