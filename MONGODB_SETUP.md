# MongoDB Atlas Setup Guide

This guide will help you set up MongoDB Atlas for persistent document storage in Docugent.

## 🚀 Quick Setup Steps

### 1. Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account
3. Choose the **FREE** tier (M0 Sandbox)

### 2. Create Cluster

1. **Cloud Provider**: AWS (recommended for Vercel)
2. **Region**: Choose closest to your users (e.g., `us-east-1` for US)
3. **Cluster Tier**: **M0 Sandbox** (Free tier)
4. **Cluster Name**: `docugent-cluster`
5. Click **"Create Cluster"**

### 3. Create Database User

1. Go to **"Database Access"** in the left sidebar
2. Click **"Add New Database User"**
3. **Authentication Method**: Password
4. **Username**: `docugent-user`
5. **Password**: Generate a strong password (save it!)
6. **Database User Privileges**: `Read and write to any database`
7. Click **"Add User"**

### 4. Configure Network Access

1. Go to **"Network Access"** in the left sidebar
2. Click **"Add IP Address"**
3. **Access List Entry**: `0.0.0.0/0` (allow access from anywhere)
   - For better security, you can add Vercel's IP ranges
4. Click **"Confirm"**

### 5. Get Connection String

1. Go to **"Clusters"** in the left sidebar
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. **Driver**: Node.js
5. **Version**: 4.1 or later
6. Copy the connection string

The connection string will look like:

```
mongodb+srv://docugent-user:<password>@docugent-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

## 🔧 Environment Variables

Add these to your Vercel environment variables:

### In Vercel Dashboard:

1. Go to your project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add these variables:

| Name               | Value                                                                                                    | Environment                      |
| ------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `MONGODB_URI`      | `mongodb+srv://docugent-user:<password>@docugent-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority` | Production, Preview, Development |
| `MONGODB_DATABASE` | `docugent`                                                                                               | Production, Preview, Development |

### In Local Development:

Create a `.env.local` file:

```bash
MONGODB_URI=mongodb+srv://docugent-user:<password>@docugent-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=docugent
```

## 📊 Database Structure

The application will automatically create these collections:

### `documents` Collection

Stores document chunks and embeddings:

```json
{
  "_id": "ObjectId",
  "id": "documentId-chunkIndex",
  "text": "chunk content",
  "embedding": [0.1, 0.2, ...],
  "metadata": {
    "documentId": "uuid",
    "chunkIndex": 0,
    "source": "filename.pdf",
    "sessionId": "session-uuid"
  }
}
```

### `metadata` Collection

Stores document metadata:

```json
{
  "_id": "ObjectId",
  "documentId": "uuid",
  "sessionId": "session-uuid",
  "source": "filename.pdf",
  "processedAt": "2024-01-01T00:00:00.000Z",
  "chunkCount": 10
}
```

## 🧪 Testing the Setup

### 1. Deploy to Vercel

```bash
git add .
git commit -m "Add MongoDB integration"
git push
```

### 2. Test Document Upload

1. Go to your deployed app
2. Upload a document or process a URL
3. Ask questions about the content
4. Check MongoDB Atlas dashboard for data

### 3. Verify Data in MongoDB

1. Go to MongoDB Atlas dashboard
2. Click **"Browse Collections"**
3. You should see:
   - `documents` collection with chunks
   - `metadata` collection with document info

## 🔍 Troubleshooting

### Connection Issues

- **Error**: "MONGODB_URI environment variable is not set"

  - **Solution**: Add `MONGODB_URI` to Vercel environment variables

- **Error**: "Authentication failed"

  - **Solution**: Check username/password in connection string

- **Error**: "Network access denied"
  - **Solution**: Add `0.0.0.0/0` to IP access list

### Performance Issues

- **Slow queries**: Add database indexes
- **High memory usage**: Consider upgrading to paid tier
- **Connection limits**: M0 tier has 100 concurrent connections

## 💰 Free Tier Limits

MongoDB Atlas M0 (Free) tier includes:

- **Storage**: 512 MB
- **Connections**: 100 concurrent
- **Operations**: 100,000 reads + 100,000 writes per day
- **Backup**: 2 GB backup storage

## 🚀 Production Considerations

### Security

- Use specific IP ranges instead of `0.0.0.0/0`
- Rotate database passwords regularly
- Enable MongoDB Atlas encryption at rest

### Performance

- Add indexes for frequently queried fields
- Monitor connection pool usage
- Consider upgrading to M2+ for production

### Monitoring

- Set up MongoDB Atlas alerts
- Monitor slow queries
- Track storage usage

## 📞 Support

- **MongoDB Atlas Documentation**: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)
- **MongoDB Community**: [community.mongodb.com](https://community.mongodb.com)
- **Vercel + MongoDB**: [vercel.com/docs/integrations/mongodb](https://vercel.com/docs/integrations/mongodb)
