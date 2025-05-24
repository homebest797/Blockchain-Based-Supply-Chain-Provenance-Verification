;; Origin Verification Contract
;; Validates product source locations

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_INVALID_LOCATION (err u101))
(define-constant ERR_PRODUCT_EXISTS (err u102))

;; Data structures
(define-map verified-origins
  { product-id: (string-ascii 64) }
  {
    origin-location: (string-ascii 128),
    coordinates: (string-ascii 64),
    verified-by: principal,
    verification-date: uint,
    is-verified: bool
  }
)

(define-map authorized-verifiers principal bool)

;; Initialize contract owner as authorized verifier
(map-set authorized-verifiers CONTRACT_OWNER true)

;; Public functions
(define-public (add-authorized-verifier (verifier principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (ok (map-set authorized-verifiers verifier true))
  )
)

(define-public (verify-origin (product-id (string-ascii 64))
                             (location (string-ascii 128))
                             (coordinates (string-ascii 64)))
  (let ((is-authorized (default-to false (map-get? authorized-verifiers tx-sender))))
    (asserts! is-authorized ERR_UNAUTHORIZED)
    (asserts! (is-none (map-get? verified-origins { product-id: product-id })) ERR_PRODUCT_EXISTS)
    (ok (map-set verified-origins
                 { product-id: product-id }
                 {
                   origin-location: location,
                   coordinates: coordinates,
                   verified-by: tx-sender,
                   verification-date: block-height,
                   is-verified: true
                 }))
  )
)

;; Read-only functions
(define-read-only (get-origin-info (product-id (string-ascii 64)))
  (map-get? verified-origins { product-id: product-id })
)

(define-read-only (is-origin-verified (product-id (string-ascii 64)))
  (match (map-get? verified-origins { product-id: product-id })
    origin-data (get is-verified origin-data)
    false
  )
)
