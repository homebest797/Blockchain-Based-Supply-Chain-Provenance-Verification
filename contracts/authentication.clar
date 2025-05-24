;; Authentication Contract
;; Validates product authenticity

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u300))
(define-constant ERR_INVALID_SIGNATURE (err u301))
(define-constant ERR_PRODUCT_NOT_FOUND (err u302))

;; Data structures
(define-map product-authenticity
  { product-id: (string-ascii 64) }
  {
    manufacturer: principal,
    product-hash: (buff 32),
    authentication-date: uint,
    is-authentic: bool,
    serial-number: (string-ascii 64)
  }
)

(define-map authorized-manufacturers principal bool)

;; Initialize contract owner as authorized manufacturer
(map-set authorized-manufacturers CONTRACT_OWNER true)

;; Public functions
(define-public (add-authorized-manufacturer (manufacturer principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (ok (map-set authorized-manufacturers manufacturer true))
  )
)

(define-public (authenticate-product (product-id (string-ascii 64))
                                   (product-hash (buff 32))
                                   (serial-number (string-ascii 64)))
  (let ((is-authorized (default-to false (map-get? authorized-manufacturers tx-sender))))
    (asserts! is-authorized ERR_UNAUTHORIZED)
    (ok (map-set product-authenticity
                 { product-id: product-id }
                 {
                   manufacturer: tx-sender,
                   product-hash: product-hash,
                   authentication-date: block-height,
                   is-authentic: true,
                   serial-number: serial-number
                 }))
  )
)

(define-public (revoke-authentication (product-id (string-ascii 64)))
  (let ((auth-info (unwrap! (map-get? product-authenticity { product-id: product-id }) ERR_PRODUCT_NOT_FOUND)))
    (asserts! (is-eq (get manufacturer auth-info) tx-sender) ERR_UNAUTHORIZED)
    (ok (map-set product-authenticity
                 { product-id: product-id }
                 (merge auth-info { is-authentic: false })))
  )
)

;; Read-only functions
(define-read-only (is-authentic (product-id (string-ascii 64)))
  (match (map-get? product-authenticity { product-id: product-id })
    auth-info (get is-authentic auth-info)
    false
  )
)

(define-read-only (get-authentication-info (product-id (string-ascii 64)))
  (map-get? product-authenticity { product-id: product-id })
)

(define-read-only (verify-product-hash (product-id (string-ascii 64)) (provided-hash (buff 32)))
  (match (map-get? product-authenticity { product-id: product-id })
    auth-info (is-eq (get product-hash auth-info) provided-hash)
    false
  )
)
