// YouTube Focus Feed - API Key Configuration
//
// SETUP INSTRUCTIONS:
// 1. Copy this file to: secrets.local.ts (in the same directory)
// 2. Replace 'sk-your-key-here' with your actual OpenAI API key
// 3. Run: npm run build
// 4. Load the extension in Chrome (chrome://extensions, Developer mode, Load unpacked)
//
// GET AN API KEY:
// 1. Go to https://platform.openai.com/api-keys
// 2. Create a new API key
// 3. Add some credits to your account (API usage is very cheap - pennies per day)
//
// IMPORTANT:
// - Never commit secrets.local.ts to git (it's already in .gitignore)
// - Keep your API key private
// - Monitor your usage at https://platform.openai.com/usage

export const SECRETS = {
  OPENAI_API_KEY: 'sk-your-key-here'
};
