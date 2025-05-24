;; Custody Tracking Contract
;; Records chain of possession

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u200))
(define-constant ERR_INVALID_TRANSFER (err u201))
(define-constant ERR_PRODUCT_NOT_FOUND (err u202))

;; Data structures
(define-map product-custody
  { product-id: (string-ascii 64) }
  {
    current-owner: principal,
    created-by: principal,
    creation-date: uint
  }
)

(define-map custody-history
  { product-id: (string-ascii 64), transfer-id: uint }
  {
    from-owner: principal,
    to-owner: principal,
    transfer-date: uint,
    location: (string-ascii 128),
    notes: (string-ascii 256)
  }
)

(define-map transfer-counters { product-id: (string-ascii 64) } uint)

;; Public functions
(define-public (create-product (product-id (string-ascii 64)))
  (begin
    (asserts! (is-none (map-get? product-custody { product-id: product-id })) ERR_INVALID_TRANSFER)
    (map-set product-custody
             { product-id: product-id }
             {
               current-owner: tx-sender,
               created-by: tx-sender,
               creation-date: block-height
             })
    (ok (map-set transfer-counters { product-id: product-id } u0))
  )
)

(define-public (transfer-custody (product-id (string-ascii 64))
                                (to-owner principal)
                                (location (string-ascii 128))
                                (notes (string-ascii 256)))
  (let ((custody-info (unwrap! (map-get? product-custody { product-id: product-id }) ERR_PRODUCT_NOT_FOUND))
        (current-count (default-to u0 (map-get? transfer-counters { product-id: product-id }))))
    (asserts! (is-eq (get current-owner custody-info) tx-sender) ERR_UNAUTHORIZED)

    ;; Record transfer in history
    (map-set custody-history
             { product-id: product-id, transfer-id: current-count }
             {
               from-owner: tx-sender,
               to-owner: to-owner,
               transfer-date: block-height,
               location: location,
               notes: notes
             })

    ;; Update current custody
    (map-set product-custody
             { product-id: product-id }
             (merge custody-info { current-owner: to-owner }))

    ;; Increment transfer counter
    (ok (map-set transfer-counters { product-id: product-id } (+ current-count u1)))
  )
)

;; Read-only functions
(define-read-only (get-current-owner (product-id (string-ascii 64)))
  (match (map-get? product-custody { product-id: product-id })
    custody-info (some (get current-owner custody-info))
    none
  )
)

(define-read-only (get-transfer-history (product-id (string-ascii 64)) (transfer-id uint))
  (map-get? custody-history { product-id: product-id, transfer-id: transfer-id })
)

(define-read-only (get-transfer-count (product-id (string-ascii 64)))
  (default-to u0 (map-get? transfer-counters { product-id: product-id }))
)
