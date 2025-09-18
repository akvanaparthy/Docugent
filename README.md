# Docugent - AI Document Assistant

A full-stack application that allows users to upload documents (PDF, DOCX) or provide URLs, and then ask questions about the content using a local LLM.

## Features

- **Document Upload**: Support for PDF and DOCX files
- **URL Processing**: Extract content from web pages
- **AI-Powered Q&A**: Ask questions about uploaded documents using local LLM
- **RAG Implementation**: Retrieval-Augmented Generation for accurate, context-aware responses
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: Local LLM (OpenAI-compatible API, e.g., LM Studio)
- **File Processing**: pdf-parse, mammoth
- **Deployment**: Vercel (or any Node.js hosting)

## Getting Started

### Prerequisites

- Node.js 18+
- Local LLM server running (e.g., LM Studio, Ollama, or any OpenAI-compatible API)
- LLM server accessible at `http://127.0.0.1:1234/v1` (or configure your own URL)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd docugent
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp env.example .env.local
```

Edit `.env.local` and configure your local LLM settings:

```
LM_BASE_URL=http://127.0.0.1:1234/v1
LM_API_KEY=lmstudio
LM_MODEL=dolphin-2.9.3-mistral-nemo-12b-llamacppfixed
```

### Local LLM Setup

This application works with any OpenAI-compatible API. Popular options include:

- **LM Studio**: Easy-to-use GUI for running local models
- **Ollama**: Command-line tool for running local models
- **Text Generation WebUI**: Web interface for running models
- **vLLM**: High-performance inference server

**Benefits of Local LLM**:

- **Privacy**: Your documents never leave your machine
- **Cost**: No API costs after initial setup
- **Control**: Full control over model selection and configuration
- **Offline**: Works without internet connection

### Local Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Local Development

1. Start your local LLM server (e.g., LM Studio)
2. Ensure it's accessible at the configured URL
3. Run the development server:

```bash
npm run dev
```

### Production Deployment

This application can be deployed to any Node.js hosting platform:

- **Vercel**: Easy deployment with automatic builds
- **Railway**: Simple deployment with environment variables
- **Render**: Free tier available
- **DigitalOcean App Platform**: Scalable hosting
- **Self-hosted**: Run on your own server

**Note**: For production deployment, you'll need to ensure your local LLM server is accessible from your hosting platform, or use a cloud-based LLM service.

## Environment Variables

| Variable              | Description                   | Required | Default                    |
| --------------------- | ----------------------------- | -------- | -------------------------- |
| `LM_BASE_URL`         | Base URL for local LLM server | Yes      | `http://127.0.0.1:1234/v1` |
| `LM_API_KEY`          | API key for local LLM         | No       | `lmstudio`                 |
| `LM_MODEL`            | Model name/label              | Yes      | `dolphin-2.9.3-mistral...` |
| `NEXT_PUBLIC_APP_URL` | Public URL of your app        | No       | `http://localhost:3000`    |

## API Endpoints

### POST `/api/upload`

Upload and process a document file.

**Body**: FormData with `file` field
**Response**:

```json
{
  "success": true,
  "documentId": "uuid",
  "message": "Document processed successfully"
}
```

### POST `/api/process-url`

Process content from a URL.

**Body**:

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
  "message": "URL processed successfully"
}
```

### POST `/api/query`

Ask questions about processed documents.

**Body**:

```json
{
  "query": "What is the main topic?",
  "documentId": "uuid"
}
```

**Response**:

```json
{
  "success": true,
  "answer": "The main topic is...",
  "context": "Relevant context snippet..."
}
```

## Architecture

### Document Processing Pipeline

1. **File Upload/URL Processing**: Extract text from PDF, DOCX, or web pages
2. **Text Chunking**: Split large documents into manageable chunks
3. **Embedding Generation**: Create vector embeddings for each chunk
4. **Storage**: Store chunks and embeddings (in-memory for demo)
5. **Query Processing**: Generate embeddings for user queries
6. **Similarity Search**: Find most relevant chunks
7. **Response Generation**: Use RAG to generate contextual answers

### RAG Implementation

The application uses Retrieval-Augmented Generation (RAG) to provide accurate answers:

1. User query is embedded using the local LLM's embedding model
2. Similarity search finds relevant document chunks
3. Context is combined with the query
4. Local LLM generates a response based on the context

## Local LLM Features

This application is designed to work with local LLMs:

- **Privacy-First**: All processing happens locally
- **Cost-Effective**: No ongoing API costs
- **Customizable**: Use any model that fits your needs
- **Offline Capable**: Works without internet connection

## Limitations

- **In-Memory Storage**: Document storage is currently in-memory and will reset on deployment
- **File Size Limits**: 10MB limit for file uploads
- **Processing Time**: Large documents may take time to process
- **Local LLM Dependency**: Requires a local LLM server to be running

## Future Enhancements

- [ ] Persistent vector database (Pinecone, Weaviate)
- [ ] User authentication and document management
- [ ] Support for more file formats
- [ ] Batch processing for multiple documents
- [ ] Advanced search and filtering
- [ ] Document summarization
- [ ] Export functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
