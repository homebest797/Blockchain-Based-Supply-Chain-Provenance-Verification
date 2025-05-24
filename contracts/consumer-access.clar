;; Consumer Access Contract
;; Enables product history verification

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u500))
(define-constant ERR_PRODUCT_NOT_FOUND (err u501))

;; Import other contracts (in a real deployment, these would be contract calls)
;; For simplicity, we'll define read-only functions that would call other contracts

;; Data structures for consumer queries
(define-map consumer-queries
  { consumer: principal, query-id: uint }
  {
    product-id: (string-ascii 64),
    query-date: uint,
    query-type: (string-ascii 32)
  }
)

(define-map query-counters principal uint)

;; Public functions
(define-public (log-consumer-query (product-id (string-ascii 64)) (query-type (string-ascii 32)))
  (let ((current-count (default-to u0 (map-get? query-counters tx-sender))))
    (map-set consumer-queries
             { consumer: tx-sender, query-id: current-count }
             {
               product-id: product-id,
               query-date: block-height,
               query-type: query-type
             })
    (ok (map-set query-counters tx-sender (+ current-count u1)))
  )
)

;; Read-only functions for comprehensive product verification
(define-read-only (get-product-summary (product-id (string-ascii 64)))
  {
    product-id: product-id,
    query-date: block-height,
    available-data: "origin,custody,authentication,certification"
  }
)

(define-read-only (verify-product-integrity (product-id (string-ascii 64)))
  ;; This would integrate with all other contracts to provide comprehensive verification
  ;; For simplicity, returning a basic structure
  {
    product-id: product-id,
    has-origin: true,
    has-custody-chain: true,
    is-authenticated: true,
    has-certifications: true,
    verification-score: u95
  }
)

(define-read-only (get-consumer-query-history (consumer principal) (query-id uint))
  (map-get? consumer-queries { consumer: consumer, query-id: query-id })
)

(define-read-only (get-consumer-query-count (consumer principal))
  (default-to u0 (map-get? query-counters consumer))
)

;; Public verification functions for consumers
(define-read-only (get-full-product-history (product-id (string-ascii 64)))
  ;; This would aggregate data from all contracts
  {
    product-id: product-id,
    origin-verified: true,
    custody-transfers: u3,
    authentication-status: "verified",
    active-certifications: u2,
    last-updated: block-height
  }
)
