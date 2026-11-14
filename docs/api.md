# KONNEVIA REST API Documentation

Base path: `/api/v1`

## Health Check
- **Endpoint**: `GET /health` or `GET /api/v1/health`
- **Description**: Returns the operational status of the service, uptime, and database connection.
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "service": "konnevia-backend",
  "environment": "development",
  "uptime": 120,
  "database": {
    "status": "connected",
    "connected": true
  },
  "integrations": {
    "googleSheetsEnabled": false
  }
}
```

---

## Leads & Enquiries

### 1. Submit Customer Quote Enquiry
- **Endpoint**: `POST /api/v1/leads/enquiry`
- **Headers**: `Content-Type: application/json`
- **Payload**:
```json
{
  "name": "Rohan Sharma",
  "email": "rohan.sharma@example.com",
  "phone": "9876543210",
  "category": "Home & Living",
  "service": "Interior Design",
  "city": "Bengaluru",
  "message": "Looking for 3BHK turnkey interior solutions"
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "Thank you! Your quote request has been received. Our team will contact you shortly.",
  "data": {
    "leadId": "65b...",
    "status": "received",
    "createdAt": "2026-11-12T03:15:00.000Z"
  }
}
```

### 2. Submit Partner Registration Enquiry
- **Endpoint**: `POST /api/v1/leads/partner`
- **Headers**: `Content-Type: application/json`
- **Payload**:
```json
{
  "name": "Meera Patel",
  "email": "contact@artisanspace.in",
  "phone": "9812345678",
  "businessName": "Artisan Spaces Pvt Ltd",
  "businessType": "Architecture & Interiors",
  "city": "Mumbai",
  "experienceYears": 8
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "Thank you! Your partner application has been received. We will review and reach out within 1 business day.",
  "data": {
    "leadId": "65b...",
    "status": "received",
    "createdAt": "2026-11-12T03:15:00.000Z"
  }
}
```

---

## Blogs & Resources

### 1. Get Blog Posts
- **Endpoint**: `GET /api/v1/blogs`
- **Query Params**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 9)
  - `category`: Filter by category name
  - `search`: Keyword search across title and excerpt
- **Response**: `200 OK`

### 2. Get Single Blog by Slug
- **Endpoint**: `GET /api/v1/blogs/:slug`
- **Response**: `200 OK`

### 3. Get Blog Categories
- **Endpoint**: `GET /api/v1/blogs/categories`
- **Response**: `200 OK`
