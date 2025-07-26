# Real-Time Chat Application

A real-time chat application built with Next.js and Socket.IO featuring admin and guest user roles with approval functionality.

## Features

- **Real-time messaging** using Socket.IO
- **Two user types**: Admin and Guest
- **Admin controls**: Can approve or kick guests
- **Guest approval system**: Guests must be approved by admin to join
- **Single guest limit**: Only one guest allowed in the chat room at a time
- **Modern UI**: Built with Tailwind CSS
- **Responsive design**: Works on desktop and mobile devices

## User Types

### Admin User
- Always stays in the chat room
- Can approve guest requests
- Can kick guests out
- Has full control over the chat room
- Only one admin allowed at a time

### Guest User
- Must enter their name to request access
- Needs admin approval to join the chat
- Can be kicked by admin at any time
- Only one guest allowed at a time

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd real-time-chat
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **First User (Admin)**:
   - Enter your name
   - Select "Admin" role
   - Enter admin password (default: `admin123`)
   - Click "Join Chat Room"
   - You'll be automatically added as the admin

2. **Subsequent Users (Guests)**:
   - Enter your name
   - Select "Guest" role
   - Click "Join Chat Room"
   - Wait for admin approval

3. **Admin Controls**:
   - View pending guest requests in the sidebar
   - Click "Approve" to let a guest join
   - Click "Kick" to remove a guest from the chat

## Project Structure

```
real-time-chat/
├── components/
│   ├── ChatRoom.tsx      # Main chat interface
│   └── LoginForm.tsx     # User login form
├── pages/
│   ├── api/
│   │   └── socket.ts     # Socket.IO server
│   ├── _app.tsx          # App wrapper with context
│   └── index.tsx         # Main page
├── styles/
│   └── globals.css       # Global styles
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Technologies Used

- **Next.js 14** - React framework
- **Socket.IO** - Real-time communication
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Context** - State management

## Configuration

### Admin Password
The default admin password is `admin123`. You can change it by setting the `ADMIN_PASSWORD` environment variable:

```bash
ADMIN_PASSWORD=your_secure_password npm run dev
```

## API Endpoints

- `/api/socket` - WebSocket endpoint for real-time communication

## Socket Events

### Client to Server
- `join` - Join the chat room
- `sendMessage` - Send a message
- `approveGuest` - Approve a guest (admin only)
- `kickGuest` - Kick a guest (admin only)

### Server to Client
- `joined` - Confirmation of joining
- `newMessage` - New message received
- `userJoined` - User joined the chat
- `userLeft` - User left the chat
- `guestRequest` - New guest request (admin only)
- `approved` - Guest approved (guest only)
- `kicked` - Guest kicked (guest only)

## Development

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## License

This project is open source and available under the [MIT License](LICENSE). 