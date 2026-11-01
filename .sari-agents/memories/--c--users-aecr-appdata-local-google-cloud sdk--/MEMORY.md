# Consolidated Technical Memories

## Google Apps Script Optimization
When developing or refactoring Google Apps Script web apps (like Divyanshi Capital CRM), avoid hardcoded dependencies on PropertiesService for core identity/database lookups. Missing properties can cause fatal execution errors during `doGet`.

### Zero-Configuration Pattern
- Transition to a zero-configuration pattern where the script natively resolves its own Script ID
- Bind directly to master database sheets (e.g., `ALL_EMPLOYEES`) to stabilize web app rendering
- This approach eliminates fragile PropertyService dependencies that can cause runtime errors

### Testing Considerations
- When testing web app endpoints via curl POST, expect HTTP 411 Length Required errors
- This occurs due to Google Apps Script's redirect handling on POST without explicit headers

## Telegram Automation Replacement
For heavy automation engines causing excessive resource consumption (like n8n on Windows hosts), implement a lightweight Node.js polling solution.

### Implementation Details
- Script location: `C:/Users/aecr/.omp/instant-telegram-bot.js`
- Architecture: Long-polling Telegram API with offset/timeout parameters
- Filter messages by managing director chat ID (e.g., `8262519779`)
- Forward payload via POST to Google Apps Script endpoint with proper format

### Execution Command
- Windows command: `cmd /c "start cmd /k node C:\Users\aecr\.omp\instant-telegram-bot.js"`
- Directly routes Telegram messages to Google Apps Script AI without heavy automation overhead
