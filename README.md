# SSO Server with Express and TypeScript

A Single Sign-On (SSO) server implementation using Express.js, TypeScript, and MongoDB with support for local authentication and social logins (Google and Facebook).

## Features

* Multiple authentication methods:
  * Local authentication (email/password)
  * Google OAuth2 authentication
  * Facebook OAuth authentication
* Client application management
* JWT-based authentication
* Session management
* Profile management
* Secure password handling
* Flash messages for user feedback

## Setup

```bash
npm install
```

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
APP_URL=http://localhost:5000
MONGODB_URI=mongodb://localhost:27017/sso-server
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

## OAuth Setup

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API and OAuth2 API
4. Go to Credentials → Create Credentials → OAuth Client ID
5. Set authorized redirect URI: `http://localhost:5000/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

### Facebook OAuth Setup
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing one
3. Add Facebook Login product
4. Set OAuth redirect URI: `http://localhost:5000/auth/facebook/callback`
5. Copy App ID and App Secret to your `.env` file

## Development

```bash
npm run dev
```

## Production Build

```bash
npm run build
npm run start:dist
```

## Client Integration Guide

### 1. Register Your Client Application

First, register your client application with the SSO server:

```bash
curl -X POST 'http://localhost:5000/api/v1/clients' \
-H 'Content-Type: application/json' \
-d '{
  "name": "skyharvest-feed",
  "allowedOrigins": [
    "http://localhost:8080",
    "https://world.skyharvest.com" 
  ],
  "redirectUrls": [
    "http://localhost:4173/auth/callback",
    "https://world.skyharvest.com/auth/callback"
  ]
}'
```

The response will include your `clientId` and `clientSecret`. Save these securely.

### 2. Implement SSO Login Flow

#### a. Redirect to SSO Server

When a user clicks "Login" on your client application, redirect them to:

```
http://localhost:5000/auth/login?clientId=YOUR_CLIENT_ID&redirectUrl=YOUR_CALLBACK_URL
```

Users will see options for:
- Local login (email/password)
- Google login (if configured)
- Facebook login (if configured)

#### b. Handle the Callback

After successful authentication, the user will be redirected to your callback URL with a JWT token:

```
http://localhost:3000/callback?token=JWT_TOKEN
```

#### c. Verify and Use the Token

The JWT token contains the following payload:
```javascript
{
  userId: "user's MongoDB ID",
  clientId: "your client ID",
  username: "user's username",
  email: "user's email",
  iat: timestamp,
  exp: expiration timestamp
}
```

#### d. Get User Profile

After obtaining the token, you can get the user's profile details by making a request to the profile endpoint:

```javascript
const response = await fetch('http://localhost:5000/api/users/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const userProfile = await response.json();
```

The profile endpoint will return a JSON response with the following shape:

```typescript
{
  _id: string;          // MongoDB document ID
  username: string;     // User's username
  email: string;        // User's email address
  profileImageUrl?: string;  // Optional profile image URL
  clientId?: string;    // Optional client ID associated with the user
  googleId?: string;    // Optional Google ID if user signed up with Google
  facebookId?: string;  // Optional Facebook ID if user signed up with Facebook
  createdAt: Date;      // Account creation timestamp
  updatedAt: Date;      // Last update timestamp
}
```

Note:
- The password field is excluded from the response for security
- Optional fields (marked with ?) will only be present if they were set
- All timestamps are in ISO 8601 format

Possible error responses (JSON):
```typescript
{
  error: string  // Error message describing what went wrong
}
```

Common HTTP status codes:
- 200 OK: Successful request
- 401 Unauthorized: Invalid or expired token
- 404 Not Found: User not found
- 500 Internal Server Error: Server-side issues

### 3. Example Client Implementation (Node.js/Express)

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();

// Login route
app.get('/login', (req, res) => {
  const ssoUrl = 'http://localhost:5000/auth/login';
  const clientId = 'YOUR_CLIENT_ID';
  const redirectUrl = 'http://localhost:3000/callback';
  
  res.redirect(`${ssoUrl}?clientId=${clientId}&redirectUrl=${redirectUrl}`);
});

// Callback route
app.get('/callback', (req, res) => {
  const { token } = req.query;
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, 'your-jwt-secret');
    
    // Store user session
    req.session.user = decoded;
    
    res.redirect('/dashboard');
  } catch (error) {
    res.redirect('/login');
  }
});
```

### 4. Security Considerations

1. Always use HTTPS in production
2. Validate the JWT token signature
3. Store client secrets securely
4. Implement CSRF protection
5. Use secure session settings
6. Keep OAuth credentials confidential
7. Regularly rotate secrets and tokens

## API Endpoints

### Authentication
- `GET /auth/login` - Login page with social options
- `POST /auth/login` - Handle local login
- `GET /auth/register` - Registration page
- `POST /auth/register` - Handle registration
- `GET /auth/logout` - Handle logout
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - Handle Google OAuth callback
- `GET /auth/facebook` - Initiate Facebook OAuth flow
- `GET /auth/facebook/callback` - Handle Facebook OAuth callback

### Client Management
- `POST /api/v1/clients` - Create new client
- `GET /api/v1/clients` - List all clients
- `GET /api/v1/clients/:id` - Get client details
- `PUT /api/v1/clients/:id` - Update client
- `DELETE /api/v1/clients/:id` - Delete client

### User Management
- `GET /profile` - User profile
- `GET /api/v1/users/:id` - Get user details
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user
- `GET /api/users/profile` - Get user profile details

## API Documentation

### Authentication Endpoints

#### Social Login

##### Google Authentication
- **GET** `/api/auth/google`
  - Query Parameters:
    - `clientId`: Your client application ID
    - `redirectUrl`: URL to redirect after successful authentication
  - Response: Redirects to Google login

##### Facebook Authentication
- **GET** `/api/auth/facebook`
  - Query Parameters:
    - `clientId`: Your client application ID
    - `redirectUrl`: URL to redirect after successful authentication
  - Response: Redirects to Facebook login

#### User Authentication

##### Register User
- **POST** `/api/users/register`
  - Body:
    ```json
    {
      "username": "string",
      "email": "string",
      "password": "string"
    }
    ```
  - Response:
    ```json
    {
      "status": "success",
      "data": {
        "user": {
          "id": "string",
          "username": "string",
          "email": "string"
        }
      }
    }
    ```

##### Login User
- **POST** `/api/users/login`
  - Body:
    ```json
    {
      "email": "string",
      "password": "string"
    }
    ```
  - Response:
    ```json
    {
      "status": "success",
      "data": {
        "token": "string"
      }
    }
    ```

### User Management Endpoints

##### Get Users
- **GET** `/api/users/client/:clientId`
  - Headers:
    - Authorization: Bearer {token}
  - Response:
    ```json
    {
      "status": "success",
      "data": {
        "users": [
          {
            "id": "string",
            "username": "string",
            "email": "string"
          }
        ]
      }
    }
    ```

##### Get User by ID
- **GET** `/api/users/:id`
  - Headers:
    - Authorization: Bearer {token}
  - Response:
    ```json
    {
      "status": "success",
      "data": {
        "user": {
          "id": "string",
          "username": "string",
          "email": "string"
        }
      }
    }
    ```

##### Update User
- **PUT** `/api/users/:id`
  - Headers:
    - Authorization: Bearer {token}
  - Body:
    ```json
    {
      "username": "string",
      "email": "string"
    }
    ```
  - Response:
    ```json
    {
      "status": "success",
      "data": {
        "user": {
          "id": "string",
          "username": "string",
          "email": "string"
        }
      }
    }
    ```

##### Delete User
- **DELETE** `/api/users/:id`
  - Headers:
    - Authorization: Bearer {token}
  - Response:
    ```json
    {
      "status": "success",
      "message": "User deleted successfully"
    }
    ```

## Web Routes

The SSO server also provides web interfaces for user interaction:

- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/profile` - User profile page

## Error Responses

All API endpoints return errors in the following format:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Security Considerations

1. Always use HTTPS in production
2. Keep your client secrets and API keys secure
3. Implement rate limiting for API endpoints
4. Validate redirect URLs against whitelist
5. Use secure session settings

## License

MIT
