import { describe, it, expect, beforeEach } from "vitest"

describe("Origin Verification Contract", () => {
  let contractState
  
  beforeEach(() => {
    // Mock contract state
    contractState = {
      verifiedOrigins: new Map(),
      authorizedVerifiers: new Map([["contract-owner", true]]),
      contractOwner: "contract-owner",
    }
  })
  
  describe("Authorization Management", () => {
    it("should allow contract owner to add authorized verifiers", () => {
      const newVerifier = "new-verifier"
      const result = addAuthorizedVerifier(contractState, "contract-owner", newVerifier)
      
      expect(result.success).toBe(true)
      expect(contractState.authorizedVerifiers.get(newVerifier)).toBe(true)
    })
    
    it("should reject unauthorized attempts to add verifiers", () => {
      const result = addAuthorizedVerifier(contractState, "unauthorized-user", "new-verifier")
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
  })
  
  describe("Origin Verification", () => {
    beforeEach(() => {
      contractState.authorizedVerifiers.set("authorized-verifier", true)
    })
    
    it("should successfully verify product origin", () => {
      const productId = "PROD-001"
      const location = "Farm ABC, California"
      const coordinates = "37.7749,-122.4194"
      
      const result = verifyOrigin(contractState, "authorized-verifier", productId, location, coordinates)
      
      expect(result.success).toBe(true)
      
      const originInfo = contractState.verifiedOrigins.get(productId)
      expect(originInfo.originLocation).toBe(location)
      expect(originInfo.coordinates).toBe(coordinates)
      expect(originInfo.verifiedBy).toBe("authorized-verifier")
      expect(originInfo.isVerified).toBe(true)
    })
    
    it("should reject verification from unauthorized verifier", () => {
      const result = verifyOrigin(contractState, "unauthorized-user", "PROD-001", "Location", "Coords")
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
    
    it("should reject duplicate product verification", () => {
      const productId = "PROD-001"
      
      // First verification
      verifyOrigin(contractState, "authorized-verifier", productId, "Location1", "Coords1")
      
      // Attempt duplicate verification
      const result = verifyOrigin(contractState, "authorized-verifier", productId, "Location2", "Coords2")
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_PRODUCT_EXISTS")
    })
  })
  
  describe("Read Functions", () => {
    beforeEach(() => {
      contractState.authorizedVerifiers.set("authorized-verifier", true)
      verifyOrigin(contractState, "authorized-verifier", "PROD-001", "Test Location", "Test Coords")
    })
    
    it("should return origin information for verified product", () => {
      const originInfo = getOriginInfo(contractState, "PROD-001")
      
      expect(originInfo).toBeDefined()
      expect(originInfo.originLocation).toBe("Test Location")
      expect(originInfo.coordinates).toBe("Test Coords")
      expect(originInfo.isVerified).toBe(true)
    })
    
    it("should return undefined for non-existent product", () => {
      const originInfo = getOriginInfo(contractState, "NON-EXISTENT")
      
      expect(originInfo).toBeUndefined()
    })
    
    it("should correctly check verification status", () => {
      expect(isOriginVerified(contractState, "PROD-001")).toBe(true)
      expect(isOriginVerified(contractState, "NON-EXISTENT")).toBe(false)
    })
  })
})

// Mock contract functions
function addAuthorizedVerifier(state, sender, verifier) {
  if (sender !== state.contractOwner) {
    return { success: false, error: "ERR_UNAUTHORIZED" }
  }
  
  state.authorizedVerifiers.set(verifier, true)
  return { success: true }
}

function verifyOrigin(state, sender, productId, location, coordinates) {
  if (!state.authorizedVerifiers.get(sender)) {
    return { success: false, error: "ERR_UNAUTHORIZED" }
  }
  
  if (state.verifiedOrigins.has(productId)) {
    return { success: false, error: "ERR_PRODUCT_EXISTS" }
  }
  
  state.verifiedOrigins.set(productId, {
    originLocation: location,
    coordinates: coordinates,
    verifiedBy: sender,
    verificationDate: Date.now(),
    isVerified: true,
  })
  
  return { success: true }
}

function getOriginInfo(state, productId) {
  return state.verifiedOrigins.get(productId)
}

function isOriginVerified(state, productId) {
  const info = state.verifiedOrigins.get(productId)
  return info ? info.isVerified : false
}
