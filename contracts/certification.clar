;; Certification Contract
;; Records quality and compliance claims

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u400))
(define-constant ERR_INVALID_CERTIFICATION (err u401))
(define-constant ERR_CERTIFICATION_EXISTS (err u402))

;; Data structures
(define-map product-certifications
  { product-id: (string-ascii 64), cert-type: (string-ascii 32) }
  {
    certifying-body: principal,
    certification-date: uint,
    expiry-date: uint,
    compliance-level: (string-ascii 16),
    certificate-hash: (buff 32),
    is-valid: bool
  }
)

(define-map authorized-certifiers principal bool)

;; Initialize contract owner as authorized certifier
(map-set authorized-certifiers CONTRACT_OWNER true)

;; Public functions
(define-public (add-authorized-certifier (certifier principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (ok (map-set authorized-certifiers certifier true))
  )
)

(define-public (issue-certification (product-id (string-ascii 64))
                                  (cert-type (string-ascii 32))
                                  (expiry-date uint)
                                  (compliance-level (string-ascii 16))
                                  (certificate-hash (buff 32)))
  (let ((is-authorized (default-to false (map-get? authorized-certifiers tx-sender))))
    (asserts! is-authorized ERR_UNAUTHORIZED)
    (asserts! (is-none (map-get? product-certifications { product-id: product-id, cert-type: cert-type })) ERR_CERTIFICATION_EXISTS)
    (ok (map-set product-certifications
                 { product-id: product-id, cert-type: cert-type }
                 {
                   certifying-body: tx-sender,
                   certification-date: block-height,
                   expiry-date: expiry-date,
                   compliance-level: compliance-level,
                   certificate-hash: certificate-hash,
                   is-valid: true
                 }))
  )
)

(define-public (revoke-certification (product-id (string-ascii 64)) (cert-type (string-ascii 32)))
  (let ((cert-info (unwrap! (map-get? product-certifications { product-id: product-id, cert-type: cert-type }) ERR_INVALID_CERTIFICATION)))
    (asserts! (is-eq (get certifying-body cert-info) tx-sender) ERR_UNAUTHORIZED)
    (ok (map-set product-certifications
                 { product-id: product-id, cert-type: cert-type }
                 (merge cert-info { is-valid: false })))
  )
)

;; Read-only functions
(define-read-only (get-certification (product-id (string-ascii 64)) (cert-type (string-ascii 32)))
  (map-get? product-certifications { product-id: product-id, cert-type: cert-type })
)

(define-read-only (is-certification-valid (product-id (string-ascii 64)) (cert-type (string-ascii 32)))
  (match (map-get? product-certifications { product-id: product-id, cert-type: cert-type })
    cert-info (and (get is-valid cert-info) (> (get expiry-date cert-info) block-height))
    false
  )
)

(define-read-only (check-compliance-level (product-id (string-ascii 64)) (cert-type (string-ascii 32)))
  (match (map-get? product-certifications { product-id: product-id, cert-type: cert-type })
    cert-info (some (get compliance-level cert-info))
    none
  )
)
