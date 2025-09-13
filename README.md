# Docugent - AI Document Assistant

A full-stack application that allows users to upload documents (PDF, DOCX) or provide URLs, and then ask questions about the content using AI.

## Features

- **Document Upload**: Support for PDF and DOCX files
- **URL Processing**: Extract content from web pages
- **AI-Powered Q&A**: Ask questions about uploaded documents using OpenAI's GPT models
- **RAG Implementation**: Retrieval-Augmented Generation for accurate, context-aware responses
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Vercel AI SDK
- **AI**: OpenAI GPT-3.5-turbo, OpenAI Embeddings
- **File Processing**: pdf-parse, mammoth
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Vercel account with Pro plan
- OpenAI API key

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

Edit `.env.local` and add your API keys:

```
OPENAI_API_KEY=your_openai_api_key_here
AI_GATEWAY_API_KEY=your_ai_gateway_api_key_here
```

### Local Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment on Vercel

### Method 1: GitHub Integration (Recommended)

1. Push your code to a GitHub repository
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect Next.js and configure the build settings
6. Add environment variables in the Vercel dashboard:
   - `OPENAI_API_KEY`
   - `AI_GATEWAY_API_KEY` (if using Vercel AI Gateway)
7. Click "Deploy"

### Method 2: Vercel CLI

1. Install Vercel CLI:

```bash
npm i -g vercel
```

2. Login to Vercel:

```bash
vercel login
```

3. Deploy:

```bash
vercel
```

4. Add environment variables:

```bash
vercel env add OPENAI_API_KEY
vercel env add AI_GATEWAY_API_KEY
```

## Environment Variables

| Variable              | Description                           | Required |
| --------------------- | ------------------------------------- | -------- |
| `OPENAI_API_KEY`      | OpenAI API key for GPT and embeddings | Yes      |
| `AI_GATEWAY_API_KEY`  | Vercel AI Gateway API key             | Optional |
| `NEXT_PUBLIC_APP_URL` | Public URL of your app                | No       |

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

1. User query is embedded using OpenAI's embedding model
2. Similarity search finds relevant document chunks
3. Context is combined with the query
4. GPT-3.5-turbo generates a response based on the context

## Vercel Pro Plan Features

This application leverages several Vercel Pro plan features:

- **Extended Function Duration**: 30-second timeout for document processing
- **AI Gateway**: Centralized AI model access and management
- **Enhanced Analytics**: Monitor usage and performance
- **Priority Support**: Faster deployment and issue resolution

## Limitations

- **In-Memory Storage**: Document storage is currently in-memory and will reset on deployment
- **File Size Limits**: Vercel has a 10MB limit for serverless functions
- **Processing Time**: Large documents may take time to process

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
