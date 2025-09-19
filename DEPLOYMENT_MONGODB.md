# MongoDB Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Update Your Connection String

Replace `<db_password>` in your connection string with your actual MongoDB password:

```
mongodb+srv://docugent-user:YOUR_ACTUAL_PASSWORD@docugent-cluster.utfodrg.mongodb.net/?retryWrites=true&w=majority&appName=docugent-cluster
```

### 2. Set Environment Variables in Vercel

Go to your Vercel project dashboard:

1. **Settings** → **Environment Variables**
2. Add these variables:

| Name               | Value                                                                                                                                         | Environment                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `MONGODB_URI`      | `mongodb+srv://docugent-user:YOUR_ACTUAL_PASSWORD@docugent-cluster.utfodrg.mongodb.net/?retryWrites=true&w=majority&appName=docugent-cluster` | Production, Preview, Development |
| `MONGODB_DATABASE` | `docugent`                                                                                                                                    | Production, Preview, Development |

### 3. Test MongoDB Connection (Optional)

Before deploying, you can test the connection locally:

```bash
# Set your environment variables
export MONGODB_URI="mongodb+srv://docugent-user:YOUR_ACTUAL_PASSWORD@docugent-cluster.utfodrg.mongodb.net/?retryWrites=true&w=majority&appName=docugent-cluster"
export MONGODB_DATABASE="docugent"

# Test the connection
npm run test-mongodb
```

### 4. Deploy to Vercel

```bash
git add .
git commit -m "Add MongoDB integration for persistent storage"
git push
```

### 5. Verify Deployment

1. Go to your deployed app
2. Upload a document or process a URL
3. Ask questions about the content
4. Check MongoDB Atlas dashboard for data

## 🔍 What This Fixes

### Before (In-Memory Storage):

- ❌ Documents lost on server restart
- ❌ "Session not found" errors
- ❌ Empty AI responses
- ❌ No persistence across deployments

### After (MongoDB Storage):

- ✅ Documents persist across server restarts
- ✅ No more "Session not found" errors
- ✅ AI responses work consistently
- ✅ Data survives deployments
- ✅ Multi-user support with session isolation

## 📊 Database Collections

Your MongoDB will automatically create:

### `documents` Collection

- Stores document chunks and embeddings
- Indexed by `metadata.documentId` and `metadata.sessionId`

### `metadata` Collection

- Stores document metadata
- Indexed by `documentId` and `sessionId`

## 🧪 Testing Checklist

After deployment, verify:

- [ ] Document upload works
- [ ] URL processing works
- [ ] AI responses are not empty
- [ ] No "Session not found" errors
- [ ] Multiple users can use the app simultaneously
- [ ] Data persists after page refresh

## 🔧 Troubleshooting

### Common Issues:

1. **"MONGODB_URI environment variable is not set"**

   - Add the environment variable in Vercel dashboard

2. **"Authentication failed"**

   - Check your password in the connection string
   - Verify database user has read/write permissions

3. **"Network access denied"**

   - Add `0.0.0.0/0` to IP access list in MongoDB Atlas

4. **Still getting "Session not found" errors**
   - Make sure you deployed the latest code with MongoDB integration
   - Check Vercel function logs for MongoDB connection errors

## 🎉 Expected Results

After successful deployment:

- ✅ **Persistent Storage**: Documents survive server restarts
- ✅ **Session Management**: Each user's data is isolated
- ✅ **Reliable Responses**: AI responses work consistently
- ✅ **Multi-User Support**: Multiple users can chat simultaneously
- ✅ **Production Ready**: Scalable and reliable storage

Your Docugent app is now production-ready with persistent MongoDB storage! 🚀
