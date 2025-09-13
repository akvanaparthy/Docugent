# Deployment Guide for Docugent

This guide will walk you through deploying Docugent to Vercel using your Pro plan.

## Prerequisites

- Vercel Pro account
- GitHub repository with your code
- OpenAI API key
- Basic understanding of environment variables

## Step-by-Step Deployment

### 1. Prepare Your Repository

Ensure your code is pushed to a GitHub repository with the following structure:

```
docugent/
├── app/
│   ├── api/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── document-processor.ts
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
├── vercel.json
└── README.md
```

### 2. Deploy to Vercel

#### Option A: GitHub Integration (Recommended)

1. **Go to Vercel Dashboard**

   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Sign in with your GitHub account

2. **Import Project**

   - Click "New Project"
   - Select "Import Git Repository"
   - Choose your docugent repository
   - Click "Import"

3. **Configure Project**

   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Environment Variables**
   Add the following environment variables in the Vercel dashboard:

   | Name                 | Value                                 | Environment                      |
   | -------------------- | ------------------------------------- | -------------------------------- |
   | `OPENAI_API_KEY`     | Your OpenAI API key                   | Production, Preview, Development |
   | `AI_GATEWAY_API_KEY` | Your Vercel AI Gateway key (optional) | Production, Preview, Development |

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be available at `https://your-project.vercel.app`

#### Option B: Vercel CLI

1. **Install Vercel CLI**

   ```bash
   npm i -g vercel
   ```

2. **Login**

   ```bash
   vercel login
   ```

3. **Deploy**

   ```bash
   vercel
   ```

4. **Add Environment Variables**

   ```bash
   vercel env add OPENAI_API_KEY
   vercel env add AI_GATEWAY_API_KEY
   ```

5. **Redeploy**
   ```bash
   vercel --prod
   ```

### 3. Configure Vercel AI Gateway (Optional)

If you want to use Vercel AI Gateway for better model management:

1. **Enable AI Gateway**

   - Go to your project settings in Vercel
   - Navigate to "AI Gateway" section
   - Enable AI Gateway for your project

2. **Configure Models**

   - Add OpenAI as a provider
   - Set up rate limiting and caching
   - Copy the AI Gateway API key

3. **Update Environment Variables**
   - Add `AI_GATEWAY_API_KEY` to your environment variables
   - The app will automatically use AI Gateway when available

### 4. Test Your Deployment

1. **Visit Your App**

   - Go to your deployed URL
   - Test the file upload functionality
   - Test the URL processing
   - Ask questions about uploaded documents

2. **Check Logs**

   - Go to Vercel dashboard
   - Navigate to "Functions" tab
   - Check for any errors in the logs

3. **Monitor Performance**
   - Use Vercel Analytics to monitor usage
   - Check function execution times
   - Monitor API usage and costs

## Troubleshooting

### Common Issues

1. **Build Failures**

   - Check that all dependencies are in `package.json`
   - Ensure TypeScript compilation passes
   - Verify all imports are correct

2. **Function Timeouts**

   - Large documents may take time to process
   - Consider implementing progress indicators
   - Optimize text chunking for better performance

3. **API Key Issues**

   - Verify environment variables are set correctly
   - Check that API keys have sufficient credits
   - Ensure keys are added to all environments (Production, Preview, Development)

4. **File Upload Issues**
   - Check file size limits (10MB for Vercel)
   - Verify file type validation
   - Ensure proper error handling

### Performance Optimization

1. **Enable Caching**

   - Use Vercel's edge caching for static assets
   - Implement proper cache headers for API responses

2. **Optimize Functions**

   - Keep functions under 30 seconds (Pro plan limit)
   - Use streaming for large responses
   - Implement proper error handling

3. **Monitor Usage**
   - Track API usage and costs
   - Monitor function execution times
   - Set up alerts for high usage

## Production Considerations

### Security

1. **API Key Management**

   - Never commit API keys to version control
   - Use Vercel's environment variable system
   - Rotate keys regularly

2. **Input Validation**

   - Validate all file uploads
   - Sanitize URL inputs
   - Implement rate limiting

3. **Error Handling**
   - Don't expose sensitive information in errors
   - Log errors for debugging
   - Provide user-friendly error messages

### Scalability

1. **Database Considerations**

   - Current implementation uses in-memory storage
   - Consider persistent storage for production
   - Implement proper data cleanup

2. **Rate Limiting**

   - Implement user-based rate limiting
   - Monitor API usage patterns
   - Set appropriate limits

3. **Monitoring**
   - Set up proper logging
   - Monitor function performance
   - Track user engagement

## Next Steps

After successful deployment:

1. **Set up Custom Domain** (optional)
2. **Configure Analytics**
3. **Set up Monitoring and Alerts**
4. **Implement User Authentication**
5. **Add Persistent Storage**
6. **Optimize for Performance**

## Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **AI SDK Documentation**: [sdk.vercel.ai](https://sdk.vercel.ai)
- **OpenAI Documentation**: [platform.openai.com/docs](https://platform.openai.com/docs)

For issues specific to this project, check the GitHub repository issues or create a new one.
