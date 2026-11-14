# WARESHOP direct contact and legacy module cleanup

## Architecture findings

`Provider.contactNumber` is the existing registered business contact field. Public provider visibility already required `VERIFIED` and `PUBLISHED`; `consentToDisplayPhone` controls disclosure. `Lead` cannot be removed because it remains the source record for provider applications and approvals. Customer `enquiry` and `contact` records are no longer created or served.

## Removed runtime modules

- Public quote route and customer enquiry creation endpoint.
- Customer contact-message endpoint.
- Admin enquiry routes, navigation, dashboard metrics, and management route.
- Public and admin article/blog routes and their API mounts.
- Blog URLs and quote URL from the dynamic sitemap.

Legacy files and existing MongoDB collections were deliberately retained rather than destructively deleting historical data. They are no longer mounted or reachable through application routes.

## Direct contact design

`GET /api/v1/providers/:slug/contact` is a rate-limited public reveal endpoint. It validates a slug, requires `VERIFIED`, `PUBLISHED`, and `consentToDisplayPhone: true`, and returns only business name, public contact number, and location. Standard public provider list/detail responses exclude phone, email, source application references, and upload internal IDs. The listing detail UI reveals the number only after an explicit action and provides a `tel:` call link.

## Security controls

- No arbitrary provider ID lookup; contact lookup is slug based.
- Eligibility checked server-side for every reveal.
- Thirty contact reveals per 15 minutes per IP.
- Unpublished, unverified, consent-disabled, and missing-contact listings return no contact.
- Admin/provider authentication and OTP systems are unchanged.

## Validation

Frontend production build and backend syntax checks were run after this change. No MongoDB collections were dropped or migrated.

## Remaining limitation

The development-only frontend listing fixtures have no phone numbers by design, so their reveal state correctly reports unavailable contact. Published database listings with registered public contacts use the direct-contact API.
