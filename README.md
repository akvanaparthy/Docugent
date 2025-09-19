# Docugent - AI Document Assistant

A full-stack application that allows users to upload documents (PDF, DOCX) or provide URLs, and then ask questions about the content using a local LLM with MongoDB persistence and intelligent session management.

## ✨ Features

### 📄 Document Processing

- **File Upload**: Support for PDF and DOCX files (up to 10MB)
- **URL Processing**: Extract and process content from web pages
- **Smart Text Extraction**: Advanced HTML parsing with content filtering
- **Document Chunking**: Intelligent text splitting for optimal processing

### 🤖 AI-Powered Q&A

- **Local LLM Integration**: Works with any OpenAI-compatible API (LM Studio, Ollama, etc.)
- **RAG Implementation**: Retrieval-Augmented Generation for accurate, context-aware responses
- **Text-Based Similarity**: Efficient document search without requiring embedding models
- **Context-Aware Responses**: AI answers based only on document content

### 💾 Data Management

- **MongoDB Persistence**: Documents stored in MongoDB Atlas for reliability
- **Session Management**: Multi-user support with session isolation
- **Automatic Cleanup**: Smart session cleanup on page unload and chat deletion
- **Document Management**: Easy document deletion and cleanup

### 🎨 User Experience

- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- **Dark Mode**: Toggle between light and dark themes
- **Real-time Status**: Live model status monitoring
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Mobile Responsive**: Works seamlessly on all device sizes

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas
- **AI**: Local LLM (OpenAI-compatible API)
- **File Processing**: pdf-parse, mammoth
- **Deployment**: Vercel-ready

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Local LLM server running (e.g., LM Studio, Ollama)

### Installation

1. **Clone the repository:**

```bash
git clone <your-repo-url>
cd docugent
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

```bash
cp env.example .env.local
```

4. **Configure your environment:**
   Edit `.env.local` with your settings:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=your-database-name

# LM Studio Configuration
LM_BASE_URL=http://127.0.0.1:1234/v1
LM_API_KEY=lmstudio
LM_MODEL=dolphin-2.9.3-mistral-nemo-12b-llamacppfixed:2

# Optional Settings
DISABLE_EMBEDDINGS=true  # Set to true for models that don't support embeddings
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Local LLM Setup

This application works with any OpenAI-compatible API. Popular options:

#### LM Studio (Recommended)

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Load a model (e.g., dolphin-2.9.3-mistral-nemo-12b)
3. Start the local server
4. Ensure it's running on `http://127.0.0.1:1234`

#### Other Options

- **Ollama**: `ollama serve`
- **Text Generation WebUI**: Web interface for running models
- **vLLM**: High-performance inference server

### 🌐 Exposing Local LLM with ngrok

If you want to deploy your app to Vercel or other cloud platforms while keeping your LLM local, you can use ngrok to expose your local LLM server to the internet.

#### Step 1: Install ngrok

1. **Download ngrok** from [ngrok.com](https://ngrok.com/download)
2. **Sign up** for a free account to get your auth token
3. **Authenticate** ngrok:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

#### Step 2: Start Your Local LLM

1. **Start LM Studio** and load your model
2. **Ensure it's running** on `http://127.0.0.1:1234`

#### Step 3: Expose with ngrok

```bash
ngrok http 1234
```

This will output something like:

```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:1234
```

#### Step 4: Update Environment Variables

Replace your local LLM configuration with the ngrok URL:

**For Development (.env.local):**

```env
# Replace with your ngrok URL
LM_BASE_URL=https://abc123.ngrok-free.app/v1
LM_API_KEY=lmstudio
LM_MODEL=dolphin-2.9.3-mistral-nemo-12b-llamacppfixed:2
```

**For Production (Vercel Environment Variables):**

```env
LM_BASE_URL=https://abc123.ngrok-free.app/v1
LM_API_KEY=lmstudio
LM_MODEL=dolphin-2.9.3-mistral-nemo-12b-llamacppfixed:2
```

#### Step 5: Test the Connection

```bash
# Test if your ngrok URL is accessible
curl https://abc123.ngrok-free.app/v1/models
```

#### Important Notes

⚠️ **Security Considerations:**

- **Free ngrok URLs change** every time you restart ngrok
- **Consider ngrok Pro** for static domains
- **Your LLM is publicly accessible** - use authentication if needed
- **Monitor usage** to avoid hitting rate limits

🔄 **Keeping ngrok Running:**

- **Keep ngrok running** while your app is deployed
- **Use a process manager** like PM2 for production:
  ```bash
  npm install -g pm2
  pm2 start "ngrok http 1234" --name ngrok-llm
  ```

📝 **Alternative: Static ngrok Domain (Pro)**

```bash
# With ngrok Pro, you can use a static domain
ngrok http 1234 --domain=your-static-domain.ngrok.io
```

#### Troubleshooting ngrok

**Common Issues:**

- **"Tunnel not found"**: Restart ngrok and update your environment variables
- **"Connection refused"**: Ensure your local LLM server is running
- **"Rate limit exceeded"**: Upgrade to ngrok Pro or wait for reset
- **"Invalid host header"**: Add `--host-header=rewrite` flag:
  ```bash
  ngrok http 1234 --host-header=rewrite
  ```

### MongoDB Setup

1. **Create MongoDB Atlas account** at [mongodb.com](https://www.mongodb.com/atlas)
2. **Create a cluster** (free tier available)
3. **Get connection string** and add to `.env.local`
4. **Create database** with your preferred name

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## ⚙️ Configuration

### Environment Variables

| Variable              | Description                  | Required | Default                                          |
| --------------------- | ---------------------------- | -------- | ------------------------------------------------ |
| `MONGODB_URI`         | MongoDB connection string    | Yes      | -                                                |
| `MONGODB_DATABASE`    | MongoDB database name        | Yes      | -                                                |
| `LM_BASE_URL`         | Local LLM server URL         | Yes      | `http://127.0.0.1:1234/v1`                       |
| `LM_API_KEY`          | API key for LLM server       | No       | `lmstudio`                                       |
| `LM_MODEL`            | Model name/ID                | Yes      | `dolphin-2.9.3-mistral-nemo-12b-llamacppfixed:2` |
| `DISABLE_EMBEDDINGS`  | Disable embedding generation | No       | `true`                                           |
| `NEXT_PUBLIC_APP_URL` | Public app URL               | No       | `http://localhost:3000`                          |

### Model Configuration

#### For Chat Models (Recommended)

```env
DISABLE_EMBEDDINGS=true
LM_MODEL=dolphin-2.9.3-mistral-nemo-12b-llamacppfixed:2
```

#### For Embedding Models

```env
DISABLE_EMBEDDINGS=false
LM_MODEL=text-embedding-3-small
```

## 🏗 Architecture

### Document Processing Pipeline

```mermaid
graph TD
    A[Document Upload/URL] --> B[Text Extraction]
    B --> C[Text Chunking]
    C --> D[Storage in MongoDB]
    D --> E[User Query]
    E --> F[Similarity Search]
    F --> G[Context Retrieval]
    G --> H[LLM Response Generation]
    H --> I[Response to User]
```

### RAG Implementation

1. **Document Processing**: Extract and chunk text from documents
2. **Storage**: Store chunks in MongoDB with metadata
3. **Query Processing**: Process user questions
4. **Similarity Search**: Find relevant document chunks using text-based similarity
5. **Context Assembly**: Combine relevant chunks into context
6. **Response Generation**: Generate answers using local LLM with context

### Session Management

- **Session Isolation**: Each user session is isolated
- **Automatic Cleanup**: Sessions clean up when users leave
- **MongoDB Storage**: Persistent storage across server restarts
- **Multi-user Support**: Multiple concurrent users supported

## 📡 API Endpoints

### Document Management

#### `POST /api/upload`

Upload and process a document file.

**Request**: FormData with `file` field
**Response**:

```json
{
  "success": true,
  "documentId": "uuid",
  "sessionId": "uuid",
  "message": "Document processed successfully"
}
```

#### `POST /api/process-url`

Process content from a URL.

**Request**:

```json
{
  "url": "https://example.com"
}
```

**Response**:

```json
{
  "success": true,
  "documentId": "uuid",
  "sessionId": "uuid",
  "message": "URL processed successfully"
}
```

#### `DELETE /api/cleanup/[documentId]`

Delete a specific document.

**Headers**: `x-session-id: your-session-id`
**Response**:

```json
{
  "success": true,
  "message": "Document cleaned up successfully"
}
```

#### `DELETE /api/cleanup-session`

Delete all documents in a session.

**Headers**: `x-session-id: your-session-id`
**Response**:

```json
{
  "success": true,
  "message": "Session cleaned up successfully"
}
```

### Query & Status

#### `POST /api/query`

Ask questions about processed documents.

**Request**:

```json
{
  "query": "What is the main topic?",
  "documentId": "uuid"
}
```

**Headers**: `x-session-id: your-session-id`
**Response**:

```json
{
  "success": true,
  "answer": "The main topic is...",
  "context": "Relevant context snippet..."
}
```

#### `GET /api/status`

Check LLM server status.

**Response**:

```json
{
  "status": "online",
  "message": "LM Studio server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🚀 Deployment

### Vercel Deployment

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Vercel will handle the build automatically

### Environment Variables for Production

#### Option 1: Cloud LLM Service

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=your-production-database
LM_BASE_URL=https://your-llm-server.com/v1
LM_API_KEY=your-api-key
LM_MODEL=your-model-name
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### Option 2: Local LLM with ngrok

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=your-production-database
LM_BASE_URL=https://your-ngrok-url.ngrok-free.app/v1
LM_API_KEY=lmstudio
LM_MODEL=dolphin-2.9.3-mistral-nemo-12b-llamacppfixed:2
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 🚀 Deployment with Local LLM + ngrok

If you want to keep your LLM running locally while deploying your app to the cloud:

#### Prerequisites

- Local LLM server running (LM Studio, Ollama, etc.)
- ngrok installed and configured
- MongoDB Atlas account

#### Step-by-Step Deployment

1. **Start your local LLM server:**

   ```bash
   # Start LM Studio or your preferred LLM server
   # Ensure it's running on http://127.0.0.1:1234
   ```

2. **Expose with ngrok:**

   ```bash
   ngrok http 1234
   ```

3. **Copy the ngrok URL** (e.g., `https://abc123.ngrok-free.app`)

4. **Deploy to Vercel:**

   - Connect your GitHub repository to Vercel
   - Set environment variables in Vercel dashboard:
     ```
     MONGODB_URI=mongodb+srv://...
     MONGODB_DATABASE=your-database
     LM_BASE_URL=https://abc123.ngrok-free.app/v1
     LM_API_KEY=lmstudio
     LM_MODEL=your-model-name
     ```

5. **Keep ngrok running:**
   ```bash
   # Use PM2 to keep ngrok running in production
   npm install -g pm2
   pm2 start "ngrok http 1234" --name ngrok-llm
   pm2 save
   pm2 startup
   ```

#### Benefits of This Setup

- ✅ **Cost-effective**: No cloud LLM costs
- ✅ **Privacy**: Your data stays local
- ✅ **Control**: Full control over your model
- ✅ **Flexibility**: Easy to switch models

#### Considerations

- ⚠️ **Reliability**: Your local machine must stay online
- ⚠️ **URL Changes**: Free ngrok URLs change on restart
- ⚠️ **Bandwidth**: Uses your internet connection
- ⚠️ **Security**: LLM is publicly accessible

### Other Deployment Options

- **Railway**: Simple deployment with environment variables
- **Render**: Free tier available
- **DigitalOcean App Platform**: Scalable hosting
- **Self-hosted**: Run on your own server

## 🔧 Utilities

### Cleanup Scripts

#### Clean All Documents

```bash
node scripts/cleanup-all-documents.js
```

#### Test MongoDB Connection

```bash
npm run test-mongodb
```

#### Test LLM Connection

```bash
npm run test-llm
```

### Vercel + ngrok Auto-Update Script

When your free ngrok URL changes, update Vercel's `LM_BASE_URL` automatically and redeploy:

1. Install Vercel CLI and create a token

   ```bash
   npm i -g vercel
   ```

   - Get a token from Vercel Account Settings → Tokens and add to your `.env.local`:

   ```env
   # Add these to your .env.local file
   VERCEL_TOKEN=your-vercel-token-here
   VERCEL_PROJECT_ID=your-vercel-project-name-or-id
   VERCEL_ORG_ID=your-org-or-team-id
   # Optional if in a team
   VERCEL_TEAM_ID=your-team-id
   ```

2. Start ngrok and your local LLM

   ```bash
   ngrok http 1234
   ```

3. Run the updater
   ```bash
   node scripts/update-vercel-ngrok.js
   ```

What it does:

- Reads current public URL from `http://127.0.0.1:4040/api/tunnels`
- Sets Vercel env `LM_BASE_URL` to `<ngrok_url>/v1` for all targets
- Triggers a production redeploy so the change takes effect

Tip: Create a small `.cmd` or PowerShell script to run both commands after restarting ngrok.

Advanced options (optional):

- Set a custom ngrok API address (default `127.0.0.1:4040`) in `.env.local`:
  ```env
  NGROK_API_ADDR=127.0.0.1:4040
  ```
- If you run multiple tunnels and want to target one by name in `.env.local`:
  ```env
  NGROK_TUNNEL_NAME=llm
  # then start ngrok with a named/labelled tunnel so it can be selected
  ```

Why port 4040? ngrok exposes a local inspector/API at `http://127.0.0.1:4040` that lists current tunnels. The script reads this to discover the current public URL, so it works on any PC that runs ngrok—no hardcoded URL needed.

## 🎯 How It Works

### 1. Document Upload

- User uploads PDF/DOCX or provides URL
- System extracts text content
- Text is split into manageable chunks
- Chunks are stored in MongoDB with metadata

### 2. Query Processing

- User asks a question
- System searches for relevant document chunks
- Context is assembled from relevant chunks
- LLM generates response based on context

### 3. Session Management

- Each user gets a unique session ID
- Documents are isolated per session
- Automatic cleanup when users leave
- Persistent storage in MongoDB

### 4. Text-Based Similarity

- Uses word frequency analysis for similarity
- No embedding models required
- Works with any chat model
- Fast and efficient search

## 🔒 Privacy & Security

- **Local Processing**: All AI processing happens locally
- **No Data Sharing**: Documents never leave your infrastructure
- **Session Isolation**: User data is completely isolated
- **Automatic Cleanup**: Data is cleaned up when no longer needed

## 🐛 Troubleshooting

### Common Issues

#### "No models loaded" Error

- Ensure your LLM server is running
- Check that the model is loaded in LM Studio
- Verify the model name in configuration

#### MongoDB Connection Issues

- Check your MongoDB URI
- Ensure network access is configured
- Verify database name is correct

#### Empty Responses

- Check if embeddings are disabled for your model
- Verify document processing completed successfully
- Check browser console for errors

### Debug Commands

```bash
# Test LLM connection
npm run test-llm

# Test MongoDB connection
npm run test-mongodb

# Check application status
curl http://localhost:3000/api/status
```

## 🚧 Limitations

- **File Size**: 10MB limit for file uploads
- **Processing Time**: Large documents may take time to process
- **Model Dependency**: Requires a local LLM server
- **Memory Usage**: Large documents consume more memory

## 🔮 Future Enhancements

- [ ] **Vector Database**: Integration with Pinecone/Weaviate
- [ ] **User Authentication**: Login and user management
- [ ] **More File Formats**: Support for additional document types
- [ ] **Batch Processing**: Process multiple documents at once
- [ ] **Advanced Search**: Full-text search capabilities
- [ ] **Document Summarization**: Automatic document summaries
- [ ] **Export Functionality**: Export conversations and documents
- [ ] **API Rate Limiting**: Protect against abuse
- [ ] **Caching**: Improve response times
- [ ] **Analytics**: Usage tracking and insights

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [LM Studio](https://lmstudio.ai/) for local LLM hosting
- [MongoDB](https://www.mongodb.com/) for database services
- [Next.js](https://nextjs.org/) for the framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vercel](https://vercel.com/) for deployment platform

---

**Made with ❤️ for the open-source community**
